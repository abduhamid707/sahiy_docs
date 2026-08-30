/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { canAccessTicket, canUseCrm } from "@/lib/support/access";
import { canMutateCrm } from "@/lib/support/permissions";
import { createCrmNotification } from "@/lib/crmNotifications";
import { Ticket } from "@/models/Ticket";
import { TicketMessage } from "@/models/TicketMessage";
import { TicketTask } from "@/models/TicketTask";
import { User } from "@/models/User";
import { getAuthUser } from "@/lib/auth-helper";

const createSchema = z.object({
  title: z.string().trim().max(240).optional().default(""),
  description: z.string().trim().min(3).max(3000),
  assignedTo: z.string().min(1).optional(),
  deadlineAt: z.string().datetime().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).default("NORMAL"),
  reminderMinutes: z.array(z.number().int().positive().max(10080)).max(5).default([60, 15]),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });
  }
  if (!canUseCrm(user)) {
    return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
  }
  await dbConnect();
  const { id } = await params;
  const ticket = await Ticket.findById(id).lean();
  if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });
  if (!canAccessTicket(user, ticket)) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });

  const tasks = await TicketTask.find({ ticketId: id })
    .populate("assignedTo", "name email image")
    .populate("createdBy", "name")
    .populate("reviewedBy", "name")
    .sort({ deadlineAt: 1 })
    .lean();
  return NextResponse.json(tasks);
}


export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });
  }
  if (!canMutateCrm(user)) {
    return NextResponse.json({ error: "Rahbar task biriktira olmaydi (faqat kuzatish)" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Ma’lumot noto‘g‘ri" },
      { status: 400 }
    );
  }

  await dbConnect();
  const { id } = await params;
  const ticket = await Ticket.findById(id);
  if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });
  if (!canAccessTicket(user, ticket)) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });

  const assignedTo =
    parsed.data.assignedTo ||
    ticket.assignedTo?.toString() ||
    (user.role === "SUPPORT" ? user.id : undefined);

  if (!assignedTo) {
    return NextResponse.json({ error: "Mas’ul operatorni tanlang" }, { status: 400 });
  }

  const assignee = await User.findOne({ _id: assignedTo }).select("name").lean();
  if (!assignee) {
    return NextResponse.json({ error: "Support operator topilmadi" }, { status: 400 });
  }

  const title = parsed.data.title || "Mijoz muammosini hal qilish";
  const deadlineAt = parsed.data.deadlineAt
    ? new Date(parsed.data.deadlineAt)
    : ticket.deadlineAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

  const task = await TicketTask.create({
    ...parsed.data,
    title,
    assignedTo,
    deadlineAt,
    ticketId: id,
    createdBy: user.id,
  });

  const link = `/crm/tickets/${id}`;
  await createCrmNotification({
    userId: assignedTo,
    ticketId: id,
    taskId: task._id.toString(),
    kind: "TASK_ASSIGNED",
    title: "Sizga yangi task biriktirildi",
    body: `${ticket.callerName || "Mijoz"}: ${title}`,
    link,
  });

  if (parsed.data.priority === "CRITICAL") {
    await createCrmNotification({
      userId: assignedTo,
      ticketId: id,
      taskId: task._id.toString(),
      kind: "CRITICAL",
      title: "Kritik task",
      body: title,
      link,
    });
  }

  await TicketMessage.create({
    ticketId: id,
    type: "SYSTEM_EVENT",
    body: `Task yaratildi: ${title} → ${(assignee as any).name}`,
    author: user.id,
    authorName: user.name,
  });

  const populated = await TicketTask.findById(task._id)
    .populate("assignedTo", "name email image")
    .populate("createdBy", "name")
    .populate("reviewedBy", "name")
    .lean();

  return NextResponse.json(populated, { status: 201 });
}
