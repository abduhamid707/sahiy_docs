/* eslint-disable @typescript-eslint/no-explicit-any */
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { TicketMessage } from "@/models/TicketMessage";
import { CRM_CATEGORIES, CRM_PRIORITIES, CRM_STATUSES, normalizeUzPhone } from "@/lib/crm";
import { canUseCrm, escapeRegex, ticketScope } from "@/lib/support/access";
import { canSeeAllTickets } from "@/lib/support/permissions";
import { notifyTicketAssigned } from "@/lib/support/notifications";
import { createCrmNotification } from "@/lib/crmNotifications";

const createSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  phone: z.string().trim().refine(value => normalizeUzPhone(value).replace(/\D/g, "").length === 12, "Telefon raqamini to‘liq kiriting"),
  orderId: z.string().trim().max(100).optional().default(""),
  category: z.enum(CRM_CATEGORIES),
  description: z.string().trim().min(3).max(10000),
  assignedTo: z.string().trim().optional(),
  priority: z.enum(CRM_PRIORITIES).default("NORMAL"),
  status: z.enum(CRM_STATUSES).default("NEW"),
  deadlineAt: z.string().datetime().optional().or(z.literal("")),
  attachment: z.object({ url: z.string().min(1), name: z.string().min(1), mimeType: z.string().optional(), size: z.number().optional() }).optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  await dbConnect();

  const params = new URL(req.url).searchParams;
  const and: any[] = [ticketScope(user)];
  const filter = params.get("filter");
  if (filter === "NEW") and.push({ status: { $in: ["NEW", "OPEN"] } });
  else if (filter === "OVERDUE") and.push({ status: { $nin: ["RESOLVED", "CLOSED"] }, deadlineAt: { $lt: new Date() } });
  else if (filter === "CRITICAL") and.push({ priority: "CRITICAL", status: { $nin: ["RESOLVED", "CLOSED"] } });
  else if (filter && filter !== "ALL") and.push({ status: filter });
  const category = params.get("category");
  const priority = params.get("priority");
  const assignedTo = params.get("assignedTo");
  if (category && category !== "ALL") and.push({ category });
  if (priority && priority !== "ALL") and.push({ priority });
  if (assignedTo && assignedTo !== "ALL" && canSeeAllTickets(user)) and.push({ assignedTo });
  const search = params.get("search")?.trim();
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    and.push({ $or: [{ callerName: regex }, { callerPhone: regex }, { orderId: regex }, { ticketNumber: regex }, { problem: regex }] });
  }
  const from = params.get("from");
  const to = params.get("to");
  if (from || to) and.push({ createdAt: { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(`${to}T23:59:59.999Z`) } : {}) } });

  const tickets = await Ticket.find({ $and: and }).populate("assignedTo", "name email image").populate("createdBy", "name email").sort({ priority: -1, lastInteractionAt: -1, createdAt: -1 }).limit(500).lean();
  return NextResponse.json(tickets);
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Ma'lumotlar noto'g'ri" }, { status: 400 });
  await dbConnect();
  const data = parsed.data;
  const assignedTo = canSeeAllTickets(user) ? (data.assignedTo || undefined) : user.id;
  const deadlineAt = data.deadlineAt ? new Date(data.deadlineAt) : new Date(Date.now() + (data.priority === "CRITICAL" ? 4 : data.priority === "HIGH" ? 12 : 24) * 3600000);
  const ticket = await Ticket.create({
    callerName: data.customerName, callerPhone: normalizeUzPhone(data.phone), orderId: data.orderId || undefined,
    category: data.category, problem: data.description, priority: data.priority, status: data.status,
    assignedTo, createdBy: user.id, deadlineAt, lastInteractionAt: new Date(),
    attachments: data.attachment ? [data.attachment] : [], origin: "MANUAL", channel: "MANUAL",
  });
  ticket.ticketNumber = `TKT-${new Date().getFullYear()}-${ticket._id.toString().slice(-6).toUpperCase()}`;
  await ticket.save();
  await TicketMessage.create([
    { ticketId: ticket._id, type: "SYSTEM_EVENT", body: "Ticket yaratildi", author: user.id, authorName: user.name },
    { ticketId: ticket._id, type: "CUSTOMER_MESSAGE", body: data.description, authorName: data.customerName, attachments: data.attachment ? [data.attachment] : [] },
  ]);
  if (assignedTo && assignedTo !== user.id) {
    after(async () => {
      await Promise.allSettled([
        notifyTicketAssigned(assignedTo, ticket.problem, deadlineAt),
        createCrmNotification({
          userId: assignedTo,
          ticketId: ticket._id.toString(),
          taskId: ticket._id.toString(),
          kind: "TICKET_ASSIGNED",
          title: "Sizga yangi ticket biriktirildi",
          body: `${ticket.ticketNumber}: ${ticket.callerName || "Mijoz"} — ${ticket.problem.slice(0, 100)}`,
          link: `/crm/tickets/${ticket._id}`,
        }),
      ]);
    });
  }
  return NextResponse.json(ticket, { status: 201 });
}
