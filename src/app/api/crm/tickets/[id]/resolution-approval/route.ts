/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth-helper";
import { Ticket } from "@/models/Ticket";
import { TicketMessage } from "@/models/TicketMessage";
import { User } from "@/models/User";
import { canAccessTicket } from "@/lib/support/access";
import { canApproveTicketResolution } from "@/lib/support/permissions";
import { createCrmNotification } from "@/lib/crmNotifications";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("SUBMIT"),
    smsText: z.string().trim().min(3, "Mijozga yuborilgan SMS matnini yozing").max(2000),
  }),
  z.object({
    action: z.literal("RESOLVE"),
    smsText: z.string().trim().min(3, "Mijozga yuborilgan SMS matnini yozing").max(2000),
  }),
  z.object({ action: z.literal("APPROVE") }),
  z.object({
    action: z.literal("RETURN"),
    comment: z.string().trim().min(3, "Qaytarish sababini yozing").max(2000),
  }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  await dbConnect();
  const { id } = await params;
  const ticket = await Ticket.findById(id);
  if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });
  if (!canAccessTicket(user, ticket)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const action = parsed.data.action;
  const isApprover = canApproveTicketResolution(user);

  if (action === "RESOLVE") {
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Faqat super admin ticketni bevosita hal qila oladi" }, { status: 403 });
    }
    if (["RESOLVED", "CLOSED"].includes(ticket.status)) {
      return NextResponse.json({ error: "Ticket allaqachon yopilgan" }, { status: 409 });
    }

    const resolvedAt = new Date();
    ticket.resolutionApprovalStatus = "APPROVED";
    ticket.resolutionSmsText = parsed.data.smsText;
    ticket.resolutionReviewComment = undefined;
    ticket.resolutionSubmittedBy = user.id;
    ticket.resolutionSubmittedAt = resolvedAt;
    ticket.resolutionReviewedBy = user.id;
    ticket.resolutionReviewedAt = resolvedAt;
    ticket.status = "RESOLVED";
    ticket.resolvedAt = resolvedAt;
    ticket.closedAt = undefined;
    ticket.resolutionNote = parsed.data.smsText;
    ticket.lastInteractionAt = resolvedAt;
    await ticket.save();

    await TicketMessage.create([
      {
        ticketId: id,
        type: "OPERATOR_RESPONSE",
        body: parsed.data.smsText,
        author: user.id,
        authorName: user.name,
      },
      {
        ticketId: id,
        type: "SYSTEM_EVENT",
        body: `Super admin ticketni bevosita hal qildi${user.name ? ` · ${user.name}` : ""}`,
        author: user.id,
        authorName: user.name,
      },
    ]);

    const assignedId = ticket.assignedTo?.toString();
    if (assignedId && assignedId !== user.id) {
      await createCrmNotification({
        userId: assignedId,
        ticketId: ticket._id.toString(),
        kind: "TICKET_APPROVED",
        title: "Ticket super admin tomonidan hal qilindi",
        body: `${ticket.ticketNumber}: yakuniy qaror tasdiqlandi`,
        link: `/crm/tickets/${ticket._id}`,
      });
    }
  }

  if (action === "SUBMIT") {
    if (isApprover || user.role !== "SUPPORT") {
      return NextResponse.json({ error: "Faqat biriktirilgan operator adminga yubora oladi" }, { status: 403 });
    }
    const assignedId = ticket.assignedTo?.toString();
    if (!assignedId || assignedId !== user.id) {
      return NextResponse.json({ error: "Ticket sizga biriktirilmagan" }, { status: 403 });
    }
    if (["RESOLVED", "CLOSED"].includes(ticket.status)) {
      return NextResponse.json({ error: "Yopilgan ticketni qayta yuborib bo'lmaydi" }, { status: 409 });
    }
    if (ticket.resolutionApprovalStatus === "PENDING") {
      return NextResponse.json({ error: "Ticket allaqachon admin tasdig'ida" }, { status: 409 });
    }

    const submittedAt = new Date();
    ticket.resolutionApprovalStatus = "PENDING";
    ticket.resolutionSmsText = parsed.data.smsText;
    ticket.resolutionReviewComment = undefined;
    ticket.resolutionSubmittedBy = user.id;
    ticket.resolutionSubmittedAt = submittedAt;
    ticket.resolutionReviewedBy = undefined;
    ticket.resolutionReviewedAt = undefined;
    ticket.status = "IN_PROGRESS";
    ticket.lastInteractionAt = submittedAt;
    await ticket.save();

    await TicketMessage.create([
      {
        ticketId: id,
        type: "OPERATOR_RESPONSE",
        body: parsed.data.smsText,
        author: user.id,
        authorName: user.name,
      },
      {
        ticketId: id,
        type: "SYSTEM_EVENT",
        body: "Operator mijozga SMS yubordi va ticketni admin tasdig'iga jo'natdi",
        author: user.id,
        authorName: user.name,
      },
    ]);

    const admins = await User.find({
      $or: [{ role: { $in: ["SUPER_ADMIN", "ADMIN"] } }, { isLead: true }],
    }).select("_id").lean();
    await Promise.allSettled(admins.map((admin: any) => createCrmNotification({
      userId: admin._id.toString(),
      ticketId: ticket._id.toString(),
      kind: "TICKET_APPROVAL_REQUESTED",
      title: "Ticket tasdiq kutmoqda",
      body: `${ticket.ticketNumber}: ${user.name || "Operator"} yakuniy qaror uchun yubordi`,
      link: `/crm/tickets/${ticket._id}`,
    })));
  }

  if (action === "APPROVE") {
    if (!isApprover) return NextResponse.json({ error: "Faqat admin tasdiqlay oladi" }, { status: 403 });
    if (ticket.resolutionApprovalStatus !== "PENDING") {
      return NextResponse.json({ error: "Ticket admin tasdig'ida emas" }, { status: 409 });
    }
    const reviewedAt = new Date();
    ticket.resolutionApprovalStatus = "APPROVED";
    ticket.resolutionReviewComment = undefined;
    ticket.resolutionReviewedBy = user.id;
    ticket.resolutionReviewedAt = reviewedAt;
    ticket.status = "RESOLVED";
    ticket.resolvedAt = reviewedAt;
    ticket.resolutionNote = ticket.resolutionSmsText;
    ticket.lastInteractionAt = reviewedAt;
    await ticket.save();

    await TicketMessage.create({
      ticketId: id,
      type: "SYSTEM_EVENT",
      body: `Admin yakuniy qarorni tasdiqladi${user.name ? ` · ${user.name}` : ""}`,
      author: user.id,
      authorName: user.name,
    });
    if (ticket.resolutionSubmittedBy) {
      await createCrmNotification({
        userId: ticket.resolutionSubmittedBy.toString(),
        ticketId: ticket._id.toString(),
        kind: "TICKET_APPROVED",
        title: "Ticket tasdiqlandi",
        body: `${ticket.ticketNumber}: admin yakuniy qarorni tasdiqladi`,
        link: `/crm/tickets/${ticket._id}`,
      });
    }
  }

  if (action === "RETURN") {
    if (!isApprover) return NextResponse.json({ error: "Faqat admin qaytara oladi" }, { status: 403 });
    if (ticket.resolutionApprovalStatus !== "PENDING") {
      return NextResponse.json({ error: "Ticket admin tasdig'ida emas" }, { status: 409 });
    }
    const reviewedAt = new Date();
    ticket.resolutionApprovalStatus = "RETURNED";
    ticket.resolutionReviewComment = parsed.data.comment;
    ticket.resolutionReviewedBy = user.id;
    ticket.resolutionReviewedAt = reviewedAt;
    ticket.status = "IN_PROGRESS";
    ticket.resolvedAt = undefined;
    ticket.lastInteractionAt = reviewedAt;
    await ticket.save();

    await TicketMessage.create({
      ticketId: id,
      type: "SYSTEM_EVENT",
      body: `Admin operatorga qaytardi: ${parsed.data.comment}`,
      author: user.id,
      authorName: user.name,
    });
    if (ticket.resolutionSubmittedBy) {
      await createCrmNotification({
        userId: ticket.resolutionSubmittedBy.toString(),
        ticketId: ticket._id.toString(),
        kind: "TICKET_RETURNED",
        title: "Ticket qaytarildi",
        body: `${ticket.ticketNumber}: ${parsed.data.comment}`,
        link: `/crm/tickets/${ticket._id}`,
      });
    }
  }

  const updated = await Ticket.findById(id)
    .populate("assignedTo", "name email image")
    .populate("resolutionSubmittedBy", "name email image")
    .populate("resolutionReviewedBy", "name email image")
    .lean();
  return NextResponse.json(updated);
}
