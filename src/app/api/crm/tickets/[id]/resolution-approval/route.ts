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
import { notifyTicketViaTelegram } from "@/lib/support/notifications";

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

function ticketTeamIds(ticket: any) {
  return [ticket.assignedTo, ...(ticket.collaborators || [])]
    .map((member) => (member?._id || member)?.toString())
    .filter((id): id is string => Boolean(id))
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

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
      const title = "Ticket super admin tomonidan hal qilindi";
      const body = `${ticket.ticketNumber}: yakuniy qaror tasdiqlandi`;
      await Promise.allSettled([
        createCrmNotification({
          userId: assignedId,
          ticketId: ticket._id.toString(),
          kind: "TICKET_APPROVED",
          title,
          body,
          link: `/crm/tickets/${ticket._id}`,
        }),
        notifyTicketViaTelegram({
          userId: assignedId,
          title,
          body,
          icon: "✅",
          context: { ticketId: ticket._id.toString(), ticketNumber: ticket.ticketNumber },
        }),
      ]);
    }
  }

  if (action === "SUBMIT") {
    if (isApprover || user.role !== "SUPPORT") {
      return NextResponse.json({ error: "Faqat biriktirilgan operator adminga yubora oladi" }, { status: 403 });
    }
    const assignedId = ticket.assignedTo?.toString();
    const collaboratorIds = ticketTeamIds(ticket);
    // Primary operator bilan birga create vaqtida tanlangan hamkor operatorlar
    // ham yakuniy SMSni yuborishi mumkin. Tasodifiy SUPPORT esa hali ham yubora olmaydi.
    if ((!assignedId || assignedId !== user.id) && !collaboratorIds.includes(user.id)) {
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
    const title = "Ticket tasdiq kutmoqda";
    const body = `${ticket.ticketNumber}: ${user.name || "Operator"} yakuniy qaror uchun yubordi`;
    await Promise.allSettled(admins.flatMap((admin: any) => {
      const recipientId = admin._id.toString();
      return [
        createCrmNotification({
          userId: recipientId,
          ticketId: ticket._id.toString(),
          kind: "TICKET_APPROVAL_REQUESTED",
          title,
          body,
          link: `/crm/tickets/${ticket._id}`,
        }),
        notifyTicketViaTelegram({
          userId: recipientId,
          title,
          body,
          icon: "📨",
          context: { ticketId: ticket._id.toString(), ticketNumber: ticket.ticketNumber },
        }),
      ];
    }));
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
      const recipientId = ticket.resolutionSubmittedBy.toString();
      const title = "Ticket tasdiqlandi";
      const body = `${ticket.ticketNumber}: admin yakuniy qarorni tasdiqladi`;
      await Promise.allSettled([
        createCrmNotification({
          userId: recipientId,
          ticketId: ticket._id.toString(),
          kind: "TICKET_APPROVED",
          title,
          body,
          link: `/crm/tickets/${ticket._id}`,
        }),
        notifyTicketViaTelegram({
          userId: recipientId,
          title,
          body,
          icon: "✅",
          context: { ticketId: ticket._id.toString(), ticketNumber: ticket.ticketNumber },
        }),
      ]);
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
    // PENDING holatda sweep ataylab eslatma yubormaydi. Qaytarilganda esa
    // avvalgi WARNING/OVERDUE holati keyingi sweepni bloklamasligi kerak.
    ticket.lastReminderLevel = "NONE";
    ticket.lastReminderAt = undefined;
    await ticket.save();

    await TicketMessage.create({
      ticketId: id,
      type: "SYSTEM_EVENT",
      body: `Admin operatorga qaytardi: ${parsed.data.comment}`,
      author: user.id,
      authorName: user.name,
    });
    if (ticket.resolutionSubmittedBy) {
      // Qaytarilganini yuborgan operator albatta, primary/hamkorlar esa faqat
      // bitta umumiy alert oladi. Shu bilan qayta ishga kirishadigan jamoa
      // xabardor bo'ladi, approverning o'ziga esa echo ketmaydi.
      const recipientIds = [...new Set([
        ticket.resolutionSubmittedBy.toString(),
        ...ticketTeamIds(ticket),
      ])].filter((recipientId) => recipientId !== user.id);
      const title = "Ticket qaytarildi";
      const body = `${ticket.ticketNumber}: ${parsed.data.comment}`;
      await Promise.allSettled(recipientIds.flatMap((recipientId) => [
        createCrmNotification({
          userId: recipientId,
          ticketId: ticket._id.toString(),
          kind: "TICKET_RETURNED",
          title,
          body,
          link: `/crm/tickets/${ticket._id}`,
        }),
        notifyTicketViaTelegram({
          userId: recipientId,
          title,
          body,
          icon: "↩️",
          context: { ticketId: ticket._id.toString(), ticketNumber: ticket.ticketNumber },
        }),
      ]));
    }
  }

  const updated = await Ticket.findById(id)
    .populate("assignedTo", "name email image")
    .populate("resolutionSubmittedBy", "name email image")
    .populate("resolutionReviewedBy", "name email image")
    .lean();
  return NextResponse.json(updated);
}
