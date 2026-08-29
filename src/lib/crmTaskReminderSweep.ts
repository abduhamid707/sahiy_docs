/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from "@/lib/mongodb";
import { createCrmNotification } from "@/lib/crmNotifications";
import { TicketTask } from "@/models/TicketTask";

export async function runTaskReminderSweep(now = new Date()) {
  await dbConnect();
  const tasks = await TicketTask.find({ status: { $in: ["TODO", "IN_PROGRESS"] }, deadlineAt: { $lte: new Date(now.getTime() + 60 * 60 * 1000) } })
    .populate("ticketId", "ticketNumber callerName")
    .lean();
  let notified = 0;

  for (const task of tasks as any[]) {
    const remaining = new Date(task.deadlineAt).getTime() - now.getTime();
    const sent = new Set(task.sentEvents || []);
    let kind: "ONE_HOUR_LEFT" | "FIFTEEN_MINUTES_LEFT" | "OVERDUE" | null = null;
    let title = "";

    if (remaining <= 0 && !sent.has("OVERDUE")) {
      kind = "OVERDUE";
      title = "Task muddati o‘tdi";
    } else if (remaining <= 15 * 60 * 1000 && !sent.has("FIFTEEN_MINUTES_LEFT")) {
      kind = "FIFTEEN_MINUTES_LEFT";
      title = "Taskga 15 daqiqa qoldi";
    } else if (remaining <= 60 * 60 * 1000 && !sent.has("ONE_HOUR_LEFT")) {
      kind = "ONE_HOUR_LEFT";
      title = "Taskga 1 soat qoldi";
    }

    if (!kind) continue;
    const ticket = task.ticketId;
    const publicId = ticket?.ticketNumber ? `CRM-${String(ticket.ticketNumber).padStart(4, "0")}` : "CRM ticket";
    await createCrmNotification({
      userId: task.assignedTo.toString(),
      ticketId: ticket?._id?.toString(),
      taskId: task._id.toString(),
      kind,
      title,
      body: `${publicId}: ${task.title}`,
      link: `/crm/tickets/${ticket?._id}`,
    });

    const events = kind === "OVERDUE" ? ["ONE_HOUR_LEFT", "FIFTEEN_MINUTES_LEFT", "OVERDUE"] : kind === "FIFTEEN_MINUTES_LEFT" ? ["ONE_HOUR_LEFT", "FIFTEEN_MINUTES_LEFT"] : ["ONE_HOUR_LEFT"];
    await TicketTask.updateOne({ _id: task._id }, { $addToSet: { sentEvents: { $each: events } } });
    notified++;
  }
  return { checked: tasks.length, notified };
}
