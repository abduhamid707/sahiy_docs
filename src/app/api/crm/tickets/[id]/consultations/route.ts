import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth-helper";
import { createCrmNotification } from "@/lib/crmNotifications";
import { canAccessTicket } from "@/lib/support/access";
import { canSeeAllTickets } from "@/lib/support/permissions";
import { Ticket } from "@/models/Ticket";
import { TicketMessage } from "@/models/TicketMessage";
import { User } from "@/models/User";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("REQUEST"),
    operatorId: z.string().min(1),
    question: z.string().trim().min(3, "Savolni yozing").max(5000),
  }),
  z.object({
    action: z.literal("RESPOND"),
    requestId: z.string().min(1),
    response: z.string().trim().min(2, "Javobni yozing").max(5000),
  }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Ma'lumot noto'g'ri" }, { status: 400 });
  }

  await dbConnect();
  const { id } = await params;
  const ticket = await Ticket.findById(id);
  if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });
  if (!canAccessTicket(user, ticket)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  if (parsed.data.action === "REQUEST") {
    const assignedId = ticket.assignedTo?.toString();
    if (assignedId !== user.id && !canSeeAllTickets(user)) {
      return NextResponse.json({ error: "Maslahatni faqat mas'ul operator so'rashi mumkin" }, { status: 403 });
    }
    if (!isValidObjectId(parsed.data.operatorId) || parsed.data.operatorId === user.id) {
      return NextResponse.json({ error: "Boshqa operatorni tanlang" }, { status: 400 });
    }
    const recipient = await User.findOne({ _id: parsed.data.operatorId, role: "SUPPORT" }).select("name").lean();
    if (!recipient) return NextResponse.json({ error: "Operator topilmadi" }, { status: 404 });

    const message = await TicketMessage.create({
      ticketId: id,
      type: "INTERNAL_NOTE",
      body: parsed.data.question,
      author: user.id,
      authorName: user.name,
      metadata: {
        kind: "CONSULTATION",
        status: "PENDING",
        requestedBy: user.id,
        requestedByName: user.name,
        requestedTo: parsed.data.operatorId,
        requestedToName: recipient.name,
      },
    });
    await Ticket.updateOne(
      { _id: id },
      { $addToSet: { collaborators: { $each: [user.id, parsed.data.operatorId] } }, $set: { lastInteractionAt: new Date() } },
    );
    await createCrmNotification({
      userId: parsed.data.operatorId,
      ticketId: id,
      kind: "CONSULTATION_REQUESTED",
      title: `${user.name} maslahat so‘radi`,
      body: `${ticket.ticketNumber}: ${parsed.data.question.slice(0, 120)}`,
      link: `/crm/tickets/${id}`,
      metadata: { requestId: message._id.toString() },
    });
    return NextResponse.json(message, { status: 201 });
  }

  if (!isValidObjectId(parsed.data.requestId)) {
    return NextResponse.json({ error: "Maslahat so'rovi noto'g'ri" }, { status: 400 });
  }
  const requestMessage = await TicketMessage.findOne({
    _id: parsed.data.requestId,
    ticketId: id,
    "metadata.kind": "CONSULTATION",
  });
  if (!requestMessage) return NextResponse.json({ error: "Maslahat so'rovi topilmadi" }, { status: 404 });
  if (String(requestMessage.metadata?.requestedTo) !== user.id && !canSeeAllTickets(user)) {
    return NextResponse.json({ error: "Bu savol sizga yuborilmagan" }, { status: 403 });
  }
  if (requestMessage.metadata?.status === "ANSWERED") {
    return NextResponse.json({ error: "Bu savolga allaqachon javob berilgan" }, { status: 409 });
  }

  requestMessage.metadata = {
    ...requestMessage.metadata,
    status: "ANSWERED",
    response: parsed.data.response,
    respondedBy: user.id,
    respondedByName: user.name,
    respondedAt: new Date(),
  };
  requestMessage.markModified("metadata");
  await requestMessage.save();
  await Ticket.updateOne({ _id: id }, { $set: { lastInteractionAt: new Date() } });
  await createCrmNotification({
    userId: String(requestMessage.metadata.requestedBy),
    ticketId: id,
    kind: "CONSULTATION_ANSWERED",
    title: `${user.name} maslahat so‘rovingizga javob berdi`,
    body: `${ticket.ticketNumber}: ${parsed.data.response.slice(0, 120)}`,
    link: `/crm/tickets/${id}`,
    metadata: { requestId: requestMessage._id.toString() },
  });
  return NextResponse.json(requestMessage);
}
