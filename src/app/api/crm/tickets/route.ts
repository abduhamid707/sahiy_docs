/* eslint-disable @typescript-eslint/no-explicit-any */
import { after, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { TicketMessage } from "@/models/TicketMessage";
import { User } from "@/models/User";
import { CRM_CATEGORIES, CRM_PRIORITIES, normalizeUzPhone } from "@/lib/crm";
import { canUseCrm, escapeRegex, ticketScope } from "@/lib/support/access";
import { canSeeAllTickets, canMutateCrm } from "@/lib/support/permissions";
import { notifyTicketAssigned, notifyTicketConsultationRequested } from "@/lib/support/notifications";
import { createCrmNotification } from "@/lib/crmNotifications";

const attachmentSchema = z.object({
  url: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.string().optional(),
  size: z.number().max(5 * 1024 * 1024).optional(),
});

const categorySchema = z.enum(CRM_CATEGORIES);

const orderIssueSchema = z.object({
  orderId: z.string().trim().max(100).optional().or(z.literal("")),
  category: categorySchema,
  replacementOldValue: z.string().trim().max(500).optional().or(z.literal("")),
  replacementNewValue: z.string().trim().max(500).optional().or(z.literal("")),
});

const consultationSchema = z.object({
  operatorId: z.string().trim().min(1),
  question: z.string().trim().min(3, "Maslahat savolini yozing").max(5000),
});

const createSchema = z.object({
  customerId: z.string().trim().max(100).optional().or(z.literal("")),
  customerName: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(100).optional().or(z.literal("")),
  orderId: z.string().trim().max(1000).optional().or(z.literal("")),
  // Legacy clientlar bitta orderId/category yuboradi. Yangi client esa har bir
  // DG uchun alohida orderIssues yozadi; ikkalasi bir muddat birga ishlaydi.
  orderIssues: z.array(orderIssueSchema).max(20, "Ko'pi bilan 20 ta DG qo'shish mumkin").optional(),
  category: categorySchema.optional(),
  replacementOldValue: z.string().trim().max(500).optional().or(z.literal("")),
  replacementNewValue: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().trim().min(3).max(10000),
  assignedTo: z.string().trim().optional(),
  collaboratorIds: z.array(z.string().trim().min(1)).max(20, "Ko'pi bilan 20 ta operator biriktirish mumkin").optional().default([]),
  consultations: z.array(consultationSchema).max(10, "Ko'pi bilan 10 ta maslahat so'rovi yuborish mumkin").optional().default([]),
  // Bir xil DG bo'yicha ochiq ticket topilsa client CREATE_NEW yuborib,
  // foydalanuvchining ongli qarori bilan yangi ticket yaratishi mumkin.
  duplicateDecision: z.enum(["CREATE_NEW"]).optional(),
  priority: z.enum(CRM_PRIORITIES).default("NORMAL"),
  // Ticket faqat yangi holatda yaratiladi. Yakunlash faqat alohida admin
  // tasdiqlash oqimi orqali qilinadi.
  status: z.literal("NEW").optional().default("NEW"),
  deadlineAt: z.string().datetime().optional().or(z.literal("")),
  linkedCallId: z.string().optional(),
  attachment: attachmentSchema.optional(),
  attachments: z.array(attachmentSchema).max(10, "Ko'pi bilan 10 ta fayl biriktirish mumkin").optional(),
}).superRefine((data, ctx) => {
  const hasIssueOrderId = data.orderIssues?.some((issue) => issue.orderId?.trim());
  if (!data.customerId?.trim() && !data.orderId?.trim() && !hasIssueOrderId) {
    ctx.addIssue({ code: "custom", message: "User ID yoki Order ID dan birini kiriting", path: ["customerId"] });
  }
});

import { getAuthUser } from "@/lib/auth-helper";
import { getTashkentStartOfToday } from "@/lib/crm";

function uniqueIds(values: Array<string | undefined | null>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function orderIdKey(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function legacyOrderIds(value?: string) {
  return (value || "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrderIssues(data: any) {
  const issues: Array<{
    orderId: string;
    category: string;
    replacementOldValue?: string;
    replacementNewValue?: string;
  }> = [];
  const seen = new Set<string>();
  const add = (issue: any, fallbackCategory: string) => {
    const orderId = String(issue?.orderId || "").trim();
    const key = orderIdKey(orderId);
    if (!orderId || !key || seen.has(key)) return;
    seen.add(key);
    issues.push({
      orderId,
      category: issue?.category || fallbackCategory || "OTHER",
      replacementOldValue: issue?.replacementOldValue?.trim() || undefined,
      replacementNewValue: issue?.replacementNewValue?.trim() || undefined,
    });
  };

  for (const issue of data.orderIssues || []) add(issue, data.category || "OTHER");
  for (const orderId of legacyOrderIds(data.orderId)) {
    add(
      {
        orderId,
        category: data.category || "OTHER",
        replacementOldValue: data.replacementOldValue,
        replacementNewValue: data.replacementNewValue,
      },
      data.category || "OTHER",
    );
  }
  return issues;
}

function dgConditions(orderIds: string[]): any[] {
  return orderIds.flatMap((orderId) => {
    const compact = orderIdKey(orderId);
    const pattern = [...compact].map(escapeRegex).join("\\s*");
    return [
      { "orderIssues.orderId": new RegExp(`^\\s*${pattern}\\s*$`, "i") },
      { orderId: new RegExp(`(?:^|[,;])\\s*${pattern}\\s*(?=$|[,;])`, "i") },
    ];
  });
}

function dgMessageConditions(orderIds: string[]) {
  return orderIds.map((orderId) => {
    const compact = orderIdKey(orderId);
    const pattern = [...compact].map(escapeRegex).join("\\s*");
    return { body: new RegExp(`(^|[^A-Z0-9])${pattern}(?=$|[^A-Z0-9])`, "i") };
  });
}

async function findActiveDgConflicts(user: any, orderIds: string[]) {
  const conditions = dgConditions(orderIds);
  if (!conditions.length) return { tickets: [], hasRestrictedMatch: false };
  const messageConditions = dgMessageConditions(orderIds);
  const messageRows = await TicketMessage.find({ $or: messageConditions })
    .select("ticketId")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const messageTicketIds = [...new Set(messageRows.map((message: any) => message.ticketId?.toString()).filter(Boolean))];
  if (messageTicketIds.length) conditions.push({ _id: { $in: messageTicketIds } });
  const activeMatch = {
    status: { $nin: ["RESOLVED", "CLOSED"] },
    $or: conditions,
  };
  // Other operators' active DG tickets must still block an accidental
  // duplicate. We return details only from the caller's permitted scope, and
  // expose the rest as a generic restricted collision.
  const [tickets, visibleCount, globalCount] = await Promise.all([
    Ticket.find({ $and: [ticketScope(user), activeMatch] })
      .select("ticketNumber orderId orderIssues callerName problem status priority assignedTo collaborators createdBy deadlineAt")
      .populate("assignedTo", "name email image")
      .sort({ lastInteractionAt: -1, createdAt: -1 })
      .limit(10)
      .lean(),
    Ticket.countDocuments({ $and: [ticketScope(user), activeMatch] }),
    Ticket.countDocuments(activeMatch),
  ]);
  return {
    tickets,
    hasRestrictedMatch: globalCount > visibleCount,
  };
}

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
  if (category && category !== "ALL") {
    // Eski ticketlarda category top-level, yangilarida esa har DG ichida ham
    // bo'lishi mumkin. Ikkalasini ham filterda ko'ramiz.
    and.push({ $or: [{ category }, { "orderIssues.category": category }] });
  }
  if (priority && priority !== "ALL") and.push({ priority });
  if (assignedTo && assignedTo !== "ALL" && canSeeAllTickets(user)) and.push({ assignedTo });
  const search = params.get("search")?.trim();
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    and.push({ $or: [{ callerId: regex }, { callerName: regex }, { callerPhone: regex }, { orderId: regex }, { "orderIssues.orderId": regex }, { ticketNumber: regex }, { problem: regex }] });
  }
  const from = params.get("from");
  const to = params.get("to");
  if (from || to) and.push({ createdAt: { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(`${to}T23:59:59.999Z`) } : {}) } });

  const tickets = await Ticket.find({ $and: and })
    .populate("assignedTo", "name email image")
    .populate("collaborators", "name email image")
    .populate("createdBy", "name email")
    .sort({ priority: -1, lastInteractionAt: -1, createdAt: -1 })
    .limit(500)
    .lean();
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
  const orderIssues = normalizeOrderIssues(data);
  const orderIds = orderIssues.map((issue) => issue.orderId);
  const primaryIssue = orderIssues[0];
  const primaryCategory = primaryIssue?.category || data.category || "OTHER";

  // Ticket kim tomonidan yaratilgan bo'lsa, hech kim tanlanmaganda o'sha odam
  // mas'ul bo'ladi. SUPPORT ham create vaqtida boshqa SUPPORT operatorni
  // tanlashi mumkin; bu post-create qayta biriktirish ruxsatini kengaytirmaydi.
  const assignedTo = data.assignedTo?.trim() || user.id;
  const selectedCollaboratorIds = uniqueIds(data.collaboratorIds).filter((id) => id !== assignedTo);
  const consultations = (data.consultations || []).reduce((items: any[], consultation: any) => {
    const operatorId = consultation.operatorId.trim();
    if (!operatorId || operatorId === user.id || items.some((item) => item.operatorId === operatorId)) return items;
    items.push({ operatorId, question: consultation.question.trim() });
    return items;
  }, []);
  const consultationOperatorIds = consultations.map((consultation) => consultation.operatorId);
  const nonCreatorIds = uniqueIds([
    assignedTo === user.id ? undefined : assignedTo,
    ...selectedCollaboratorIds.filter((id) => id !== user.id),
    ...consultationOperatorIds,
  ]);
  if (nonCreatorIds.some((id) => !isValidObjectId(id))) {
    return NextResponse.json({ error: "Tanlangan operator noto'g'ri" }, { status: 400 });
  }
  const selectedOperators = nonCreatorIds.length
    ? await User.find({ _id: { $in: nonCreatorIds }, role: "SUPPORT" }).select("_id name").lean()
    : [];
  const selectedOperatorById = new Map(selectedOperators.map((operator: any) => [operator._id.toString(), operator]));
  if (nonCreatorIds.some((id) => !selectedOperatorById.has(id))) {
    return NextResponse.json({ error: "Tanlangan operator topilmadi yoki support ruxsatiga ega emas" }, { status: 400 });
  }

  // Creator primary operator bo'lmasa ham ticketdan uzilib qolmasligi kerak.
  // Maslahat beruvchilar ham ticketni ko'ra olishi uchun collaborator bo'ladi.
  const collaborators = uniqueIds([
    ...selectedCollaboratorIds,
    ...consultationOperatorIds,
    assignedTo !== user.id ? user.id : undefined,
  ]).filter((id) => id !== assignedTo);

  if (orderIds.length && data.duplicateDecision !== "CREATE_NEW") {
    const activeDuplicates = await findActiveDgConflicts(user, orderIds);
    if (activeDuplicates.tickets.length || activeDuplicates.hasRestrictedMatch) {
      return NextResponse.json(
        {
          error: activeDuplicates.hasRestrictedMatch && !activeDuplicates.tickets.length
            ? "Bu DG bo'yicha boshqa operatorning faol ticketi mavjud. Rahbar orqali uni davom ettiring yoki bu alohida muammo ekanini tasdiqlang."
            : "Bu DG bo'yicha ochiq ticket mavjud. Avval o'sha ticketni davom ettiring yoki yangi ticket yaratishni tasdiqlang.",
          code: "ACTIVE_DG_TICKET_EXISTS",
          relatedTickets: activeDuplicates.tickets,
          restrictedMatch: activeDuplicates.hasRestrictedMatch,
          // `tickets` keeps older callers and the create modal's conflict view compatible.
          tickets: activeDuplicates.tickets,
        },
        { status: 409 },
      );
    }
  }

  const deadlineAt = data.deadlineAt ? new Date(data.deadlineAt) : new Date(Date.now() + (data.priority === "CRITICAL" ? 4 : data.priority === "HIGH" ? 12 : 24) * 3600000);
  const ticket = await Ticket.create({
    callerId: data.customerId || undefined,
    callerName: data.customerName,
    callerPhone: data.phone ? normalizeUzPhone(data.phone) : undefined,
    orderId: orderIds.join(", ") || data.orderId || undefined,
    orderIssues,
    category: primaryCategory,
    problem: data.description,
    priority: data.priority,
    status: "NEW",
    replacementOldValue: primaryIssue?.replacementOldValue || data.replacementOldValue || undefined,
    replacementNewValue: primaryIssue?.replacementNewValue || data.replacementNewValue || undefined,
    assignedTo,
    collaborators,
    createdBy: user.id,
    deadlineAt,
    lastInteractionAt: new Date(),
    attachments, origin: "MANUAL", channel: "MANUAL",
  });
  ticket.ticketNumber = `TKT-${new Date().getFullYear()}-${ticket._id.toString().slice(-6).toUpperCase()}`;
  await ticket.save();
  const initialMessages: any[] = [
    { ticketId: ticket._id, type: "SYSTEM_EVENT", body: "Ticket yaratildi", author: user.id, authorName: user.name },
    { ticketId: ticket._id, type: "CUSTOMER_MESSAGE", body: data.description, authorName: data.customerName, attachments },
  ];
  for (const consultation of consultations) {
    const recipient = selectedOperatorById.get(consultation.operatorId);
    initialMessages.push({
      ticketId: ticket._id,
      type: "INTERNAL_NOTE",
      body: consultation.question,
      author: user.id,
      authorName: user.name,
      metadata: {
        kind: "CONSULTATION",
        status: "PENDING",
        requestedBy: user.id,
        requestedByName: user.name,
        requestedTo: consultation.operatorId,
        requestedToName: recipient?.name,
      },
    });
  }
  await TicketMessage.create(initialMessages);

  // Link call if provided
  if (data.linkedCallId) {
    const Call = (await import("@/models/Call")).default;
    await Call.findByIdAndUpdate(data.linkedCallId, { ticketId: ticket._id });
    await TicketMessage.create({
      ticketId: ticket._id,
      type: "SYSTEM_EVENT",
      body: "Telefon qo'ng'irog'i orqali yaratildi",
      author: user.id,
      authorName: user.name
    });
  }

  const assignmentRecipients = uniqueIds([assignedTo, ...selectedCollaboratorIds]).filter((id) => id !== user.id);
  if (assignmentRecipients.length || consultations.length) {
    after(async () => {
      const notificationJobs: Promise<unknown>[] = [];
      for (const recipientId of assignmentRecipients) {
        notificationJobs.push(
          notifyTicketAssigned(recipientId, ticket.problem, deadlineAt, {
            ticketId: ticket._id.toString(),
            ticketNumber: ticket.ticketNumber,
            link: `/crm/tickets/${ticket._id}`,
          }),
          createCrmNotification({
            userId: recipientId,
            ticketId: ticket._id.toString(),
            kind: "TICKET_ASSIGNED",
            title: "Sizga yangi ticket biriktirildi",
            body: `${ticket.ticketNumber}: ${ticket.callerName || "Mijoz"} — ${ticket.problem.slice(0, 100)}`,
            link: `/crm/tickets/${ticket._id}`,
          }),
        );
      }
      for (const consultation of consultations) {
        notificationJobs.push(
          createCrmNotification({
            userId: consultation.operatorId,
            ticketId: ticket._id.toString(),
            kind: "CONSULTATION_REQUESTED",
            title: `${user.name || "Operator"} maslahat so'radi`,
            body: `${ticket.ticketNumber}: ${consultation.question.slice(0, 120)}`,
            link: `/crm/tickets/${ticket._id}`,
            metadata: { requestedBy: user.id, requestedTo: consultation.operatorId },
          }),
          notifyTicketConsultationRequested(
            consultation.operatorId,
            user.name,
            consultation.question,
            {
              ticketId: ticket._id.toString(),
              ticketNumber: ticket.ticketNumber,
              link: `/crm/tickets/${ticket._id}`,
            },
          ),
        );
      }
      await Promise.allSettled(notificationJobs);
    });
  }
  return NextResponse.json(ticket, { status: 201 });
}
