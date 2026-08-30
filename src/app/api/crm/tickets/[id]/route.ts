/* eslint-disable @typescript-eslint/no-explicit-any */
import { after, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { TicketMessage } from "@/models/TicketMessage";
import { TicketTask } from "@/models/TicketTask";
import { CRM_PRIORITIES, CRM_STATUSES, CRM_STATUS_LABELS, CRM_PRIORITY_LABELS } from "@/lib/crm";
import { canAccessTicket, canUseCrm } from "@/lib/support/access";
import { canReassignTickets, canMutateCrm } from "@/lib/support/permissions";
import { notifyTicketAssigned } from "@/lib/support/notifications";
import { createCrmNotification } from "@/lib/crmNotifications";
import { getAuthUser } from "@/lib/auth-helper";

const patchSchema = z.object({
  status: z.enum(CRM_STATUSES).optional(),
  priority: z.enum(CRM_PRIORITIES).optional(),
  assignedTo: z.string().nullable().optional(),
  deadlineAt: z.string().datetime().optional(),
  resolutionNote: z.string().trim().max(5000).optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });
  }
  if (!canUseCrm(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  await dbConnect();
  const { id } = await params;
  const ticket = await Ticket.findById(id)
    .populate("assignedTo", "name email image")
    .populate("createdBy", "name email")
    .lean();

  if (!ticket) {
    return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });
  }
  if (!canAccessTicket(user, ticket)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const [messages, tasks, previousTickets] = await Promise.all([
    TicketMessage.find({ ticketId: id })
      .populate("author", "name email image")
      .sort({ createdAt: 1 })
      .lean(),
    TicketTask.find({ ticketId: id })
      .populate("assignedTo", "name email image")
      .populate("createdBy", "name")
      .populate("reviewedBy", "name")
      .sort({ deadlineAt: 1, createdAt: 1 })
      .lean(),
    Ticket.find({
      _id: { $ne: id },
      callerPhone: (ticket as any).callerPhone,
    })
      .select("ticketNumber problem status priority createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  return NextResponse.json({ ticket, tasks, messages, previousTickets });
}


export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });
  }
  if (!canMutateCrm(user)) {
    return NextResponse.json({ error: "Rahbar murojaatni o'zgartira olmaydi (faqat kuzatish)" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Ma'lumotlar noto'g'ri" },
      { status: 400 }
    );
  }

  await dbConnect();
  const { id } = await params;
  const ticket = await Ticket.findById(id);
  if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });
  if (!canAccessTicket(user, ticket)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const changes: string[] = [];
  const data = parsed.data;
  const update: any = { lastInteractionAt: new Date() };

  if (data.assignedTo !== undefined) {
    const current = ticket.assignedTo?.toString() || null;
    const isSelfClaim = !current && data.assignedTo === user.id && (user.role === "SUPPORT" || user.role === "OPERATOR");
    if (!canReassignTickets(user) && !isSelfClaim) {
      return NextResponse.json({ error: "Qayta biriktirishga ruxsat yo'q" }, { status: 403 });
    }
    update.assignedTo = data.assignedTo || null;
    changes.push("Mas'ul operator o'zgartirildi");
    if (data.assignedTo && data.assignedTo !== current) {
      const assignedTo = data.assignedTo;
      after(async () => {
        await Promise.allSettled([
          notifyTicketAssigned(assignedTo, ticket.problem, ticket.deadlineAt || new Date()),
          createCrmNotification({
            userId: assignedTo,
            ticketId: ticket._id.toString(),
            taskId: ticket._id.toString(),
            kind: "TICKET_ASSIGNED",
            title: "Sizga ticket biriktirildi",
            body: `${ticket.ticketNumber}: ${ticket.callerName || "Mijoz"} — ${ticket.problem.slice(0, 100)}`,
            link: `/crm/tickets/${ticket._id}`,
          }),
        ]);
      });
    }
  }

  if (data.status && data.status !== ticket.status) {
    changes.push(
      `Status: ${CRM_STATUS_LABELS[ticket.status] || ticket.status} → ${CRM_STATUS_LABELS[data.status] || data.status}`
    );
    update.status = data.status;
    if (data.status === "RESOLVED") {
      update.resolvedAt = new Date();
      update.resolutionNote = data.resolutionNote;
    }
    if (data.status === "CLOSED") update.closedAt = new Date();
    if (["NEW", "IN_PROGRESS", "WAITING", "WAITING_CLIENT"].includes(data.status)) {
      update.resolvedAt = null;
      update.closedAt = null;
    }
  }

  if (data.priority && data.priority !== ticket.priority) {
    changes.push(
      `Muhimlik: ${CRM_PRIORITY_LABELS[ticket.priority || "NORMAL"]} → ${CRM_PRIORITY_LABELS[data.priority]}`
    );
    update.priority = data.priority;
  }

  if (data.deadlineAt) {
    update.deadlineAt = new Date(data.deadlineAt);
    changes.push("SLA muddati o'zgartirildi");
  }

  const updated = await Ticket.findByIdAndUpdate(id, update, { new: true }).populate(
    "assignedTo",
    "name email image"
  );

  if (changes.length) {
    await TicketMessage.create(
      changes.map((body) => ({
        ticketId: id,
        type: "SYSTEM_EVENT",
        body,
        author: user.id,
        authorName: user.name,
      }))
    );
  }

  return NextResponse.json(updated);
}
