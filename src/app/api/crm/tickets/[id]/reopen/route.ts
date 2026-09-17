import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { TicketMessage } from "@/models/TicketMessage";
import { getAuthUser } from "@/lib/auth-helper";
import { canAccessTicket } from "@/lib/support/access";
import { canMutateCrm } from "@/lib/support/permissions";

const schema = z.object({
  reason: z.string().trim().max(2000).optional().or(z.literal("")),
});

/** Reopens an already resolved/closed ticket without creating a duplicate DG history. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });
  if (!canMutateCrm(user)) {
    return NextResponse.json({ error: "Rahbar ticketni qayta ocha olmaydi (faqat kuzatish)" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Ticket ID noto'g'ri" }, { status: 400 });
  await dbConnect();
  const ticket = await Ticket.findById(id);
  if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });
  if (!canAccessTicket(user, ticket)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  if (!["RESOLVED", "CLOSED"].includes(ticket.status)) {
    return NextResponse.json({ error: "Faqat yopilgan ticketni qayta ochish mumkin" }, { status: 409 });
  }

  const reopenedAt = new Date();
  ticket.status = "NEW";
  ticket.resolvedAt = undefined;
  ticket.closedAt = undefined;
  ticket.resolutionNote = undefined;
  ticket.resolutionApprovalStatus = "NONE";
  ticket.resolutionSmsText = undefined;
  ticket.resolutionReviewComment = undefined;
  ticket.resolutionSubmittedBy = undefined;
  ticket.resolutionSubmittedAt = undefined;
  ticket.resolutionReviewedBy = undefined;
  ticket.resolutionReviewedAt = undefined;
  ticket.lastReminderLevel = "NONE";
  ticket.lastReminderAt = undefined;
  ticket.lastInteractionAt = reopenedAt;
  await ticket.save();

  await TicketMessage.create({
    ticketId: ticket._id,
    type: "SYSTEM_EVENT",
    body: parsed.data.reason
      ? `Ticket qayta ochildi: ${parsed.data.reason}`
      : "Ticket qayta ochildi",
    author: user.id,
    authorName: user.name,
  });

  const updated = await Ticket.findById(id)
    .populate("assignedTo", "name email image")
    .populate("collaborators", "name email image")
    .populate("createdBy", "name email image")
    .lean();
  return NextResponse.json(updated);
}
