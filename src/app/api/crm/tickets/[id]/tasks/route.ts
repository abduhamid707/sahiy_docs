/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { canAccessTicket, canUseCrm } from "@/lib/support/access";
import { createCrmNotification } from "@/lib/crmNotifications";
import { Ticket } from "@/models/Ticket";
import { TicketMessage } from "@/models/TicketMessage";
import { TicketTask } from "@/models/TicketTask";
import { User } from "@/models/User";

const createSchema = z.object({
  title: z.string().trim().min(3).max(240),
  description: z.string().trim().max(3000).optional(),
  assignedTo: z.string().min(1),
  deadlineAt: z.string().datetime(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).default("NORMAL"),
  reminderMinutes: z.array(z.number().int().positive().max(10080)).max(5).default([60, 15]),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
  await dbConnect();
  const { id } = await params;
  const ticket = await Ticket.findById(id).lean();
  if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });
  if (!canAccessTicket(user, ticket)) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
  const tasks = await TicketTask.find({ ticketId: id }).populate("assignedTo", "name email image").populate("createdBy", "name").sort({ deadlineAt: 1 }).lean();
  return NextResponse.json(tasks);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Ma’lumot noto‘g‘ri" }, { status: 400 });
  await dbConnect();
  const { id } = await params;
  const ticket = await Ticket.findById(id);
  if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });
  if (!canAccessTicket(user, ticket)) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
  const assignee = await User.findOne({ _id: parsed.data.assignedTo, role: "SUPPORT" }).select("name").lean();
  if (!assignee) return NextResponse.json({ error: "Support operator topilmadi" }, { status: 400 });

  const task = await TicketTask.create({ ...parsed.data, ticketId: id, createdBy: user.id });
  const link = `/crm/tickets/${id}`;
  await createCrmNotification({
    userId: parsed.data.assignedTo,
    ticketId: id,
    taskId: task._id.toString(),
    kind: "TASK_ASSIGNED",
    title: "Sizga yangi task biriktirildi",
    body: `${ticket.callerName || "Mijoz"}: ${parsed.data.title}`,
    link,
  });
  if (parsed.data.priority === "CRITICAL") {
    await createCrmNotification({
      userId: parsed.data.assignedTo,
      ticketId: id,
      taskId: task._id.toString(),
      kind: "CRITICAL",
      title: "Kritik task",
      body: parsed.data.title,
      link,
    });
  }
  await TicketMessage.create({ ticketId: id, type: "SYSTEM_EVENT", body: `Task yaratildi: ${parsed.data.title} → ${(assignee as any).name}`, author: user.id, authorName: user.name });
  const populated = await TicketTask.findById(task._id).populate("assignedTo", "name email image").populate("createdBy", "name").lean();
  return NextResponse.json(populated, { status: 201 });
}
