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

const patchSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  assignedTo: z.string().min(1).optional(),
  deadlineAt: z.string().datetime().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).optional(),
  title: z.string().trim().min(3).max(240).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (!canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Ma’lumot noto‘g‘ri" }, { status: 400 });
  await dbConnect();
  const { id } = await params;
  const task = await TicketTask.findById(id);
  if (!task) return NextResponse.json({ error: "Task topilmadi" }, { status: 404 });
  const ticket = await Ticket.findById(task.ticketId);
  if (!ticket || !canAccessTicket(user, ticket)) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });

  const previousAssignee = task.assignedTo.toString();
  const update: any = { ...parsed.data };
  if (parsed.data.deadlineAt) {
    update.deadlineAt = new Date(parsed.data.deadlineAt);
    update.sentEvents = [];
  }
  if (parsed.data.status === "DONE") update.completedAt = new Date();
  if (parsed.data.status && parsed.data.status !== "DONE") update.completedAt = null;
  if (parsed.data.assignedTo) {
    const assignee = await User.findOne({ _id: parsed.data.assignedTo, role: "SUPPORT" }).select("_id").lean();
    if (!assignee) return NextResponse.json({ error: "Support operator topilmadi" }, { status: 400 });
  }
  const updated = await TicketTask.findByIdAndUpdate(id, update, { new: true }).populate("assignedTo", "name email image").populate("createdBy", "name");
  if (parsed.data.assignedTo && parsed.data.assignedTo !== previousAssignee) {
    await createCrmNotification({ userId: parsed.data.assignedTo, ticketId: ticket._id.toString(), taskId: id, kind: "TASK_ASSIGNED", title: "Sizga task biriktirildi", body: task.title, link: `/crm/tickets/${ticket._id}` });
  }
  await TicketMessage.create({ ticketId: ticket._id, type: "SYSTEM_EVENT", body: `Task yangilandi: ${task.title}`, author: user.id, authorName: user.name });
  return NextResponse.json(updated);
}
