/* eslint-disable @typescript-eslint/no-explicit-any */
import { after, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { TicketMessage } from "@/models/TicketMessage";
import { CRM_CATEGORIES, CRM_PRIORITIES, CRM_STATUSES, normalizeUzPhone } from "@/lib/crm";
import { canUseCrm, escapeRegex, ticketScope } from "@/lib/support/access";
import { canSeeAllTickets, canMutateCrm } from "@/lib/support/permissions";
import { notifyTicketAssigned } from "@/lib/support/notifications";
import { createCrmNotification } from "@/lib/crmNotifications";

const attachmentSchema = z.object({
  url: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.string().optional(),
  size: z.number().max(5 * 1024 * 1024).optional(),
});

const createSchema = z.object({
  customerId: z.string().trim().max(100).optional().or(z.literal("")),
  customerName: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(100).optional().or(z.literal("")),
  orderId: z.string().trim().max(1000).optional().or(z.literal("")),
  category: z.enum(CRM_CATEGORIES),
  replacementOldValue: z.string().trim().max(500).optional().or(z.literal("")),
  replacementNewValue: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().trim().min(3).max(10000),
  assignedTo: z.string().trim().optional(),
  priority: z.enum(CRM_PRIORITIES).default("NORMAL"),
  status: z.enum(CRM_STATUSES).default("NEW"),
  deadlineAt: z.string().datetime().optional().or(z.literal("")),
  attachment: attachmentSchema.optional(),
  attachments: z.array(attachmentSchema).max(10, "Ko'pi bilan 10 ta fayl biriktirish mumkin").optional(),
}).superRefine((data, ctx) => {
  if (!data.customerId?.trim() && !data.orderId?.trim()) {
    ctx.addIssue({ code: "custom", message: "User ID yoki Order ID dan birini kiriting", path: ["customerId"] });
  }
});

import { getAuthUser } from "@/lib/auth-helper";
import { getTashkentStartOfToday } from "@/lib/crm";

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });
  if (!canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  await dbConnect();

  const params = new URL(req.url).searchParams;
  const and: any[] = [ticketScope(user)];
  const filter = params.get("filter");

  if (filter === "OPEN") {
    and.push({ status: { $nin: ["RESOLVED", "CLOSED"] } });
  } else if (filter === "TODAY_NEW" || filter === "TODAY_CREATED" || filter === "NEW_TODAY") {
    and.push({ createdAt: { $gte: getTashkentStartOfToday() } });
  } else if (filter === "NEW") {
    and.push({ status: { $in: ["NEW", "OPEN"] } });
  } else if (filter === "IN_PROGRESS") {
    and.push({ status: "IN_PROGRESS" });
  } else if (filter === "WAITING" || filter === "WAITING_CLIENT") {
    and.push({ status: { $in: ["WAITING", "WAITING_CLIENT"] } });
  } else if (filter === "OVERDUE") {
    and.push({ status: { $nin: ["RESOLVED", "CLOSED"] }, deadlineAt: { $lt: new Date(), $ne: null } });
  } else if (filter === "CRITICAL") {
    and.push({ priority: "CRITICAL", status: { $nin: ["RESOLVED", "CLOSED"] } });
  } else if (filter === "UNASSIGNED") {
    and.push({ status: { $nin: ["RESOLVED", "CLOSED"] }, $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }] });
  } else if (filter === "RESOLVED" || filter === "CLOSED") {
    and.push({ status: { $in: ["RESOLVED", "CLOSED"] } });
  } else if (filter && filter !== "ALL") {
    and.push({ status: filter });
  }
  const category = params.get("category");
  const priority = params.get("priority");
  const assignedTo = params.get("assignedTo");
  if (category && category !== "ALL") and.push({ category });
  if (priority && priority !== "ALL") and.push({ priority });
  if (assignedTo && assignedTo !== "ALL" && canSeeAllTickets(user)) and.push({ assignedTo });
  const search = params.get("search")?.trim();
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    and.push({ $or: [{ callerId: regex }, { callerName: regex }, { callerPhone: regex }, { orderId: regex }, { ticketNumber: regex }, { problem: regex }] });
  }
  const from = params.get("from");
  const to = params.get("to");
  if (from || to) and.push({ createdAt: { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(`${to}T23:59:59.999Z`) } : {}) } });

  const tickets = await Ticket.find({ $and: and }).populate("assignedTo", "name email image").populate("createdBy", "name email").sort({ priority: -1, lastInteractionAt: -1, createdAt: -1 }).limit(500).lean();
  return NextResponse.json(tickets);
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });
  if (!canMutateCrm(user)) {
    return NextResponse.json({ error: "Rahbar murojaat yarata olmaydi (faqat kuzatish)" }, { status: 403 });
  }
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Ma'lumotlar noto'g'ri" }, { status: 400 });
  await dbConnect();
  const data = parsed.data;
  const attachments = data.attachments || (data.attachment ? [data.attachment] : []);
  const assignedTo = canSeeAllTickets(user) ? (data.assignedTo || undefined) : user.id;
  const deadlineAt = data.deadlineAt ? new Date(data.deadlineAt) : new Date(Date.now() + (data.priority === "CRITICAL" ? 4 : data.priority === "HIGH" ? 12 : 24) * 3600000);
  const ticket = await Ticket.create({
    callerId: data.customerId || undefined, callerName: data.customerName, callerPhone: data.phone ? normalizeUzPhone(data.phone) : undefined, orderId: data.orderId || undefined,
    category: data.category, problem: data.description, priority: data.priority, status: data.status,
    replacementOldValue: data.replacementOldValue || undefined, replacementNewValue: data.replacementNewValue || undefined,
    assignedTo, createdBy: user.id, deadlineAt, lastInteractionAt: new Date(),
    attachments, origin: "MANUAL", channel: "MANUAL",
  });
  ticket.ticketNumber = `TKT-${new Date().getFullYear()}-${ticket._id.toString().slice(-6).toUpperCase()}`;
  await ticket.save();
  await TicketMessage.create([
    { ticketId: ticket._id, type: "SYSTEM_EVENT", body: "Ticket yaratildi", author: user.id, authorName: user.name },
    { ticketId: ticket._id, type: "CUSTOMER_MESSAGE", body: data.description, authorName: data.customerName, attachments },
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
