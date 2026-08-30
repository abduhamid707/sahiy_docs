/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth-helper";
import { canAccessTicket, canUseCrm } from "@/lib/support/access";
import { canSeeAllTickets, canMutateCrm } from "@/lib/support/permissions";
import { createCrmNotification } from "@/lib/crmNotifications";
import { Ticket } from "@/models/Ticket";
import { TicketMessage } from "@/models/TicketMessage";
import { TicketTask } from "@/models/TicketTask";
import { User } from "@/models/User";

const patchSchema = z.object({
  action: z.enum(["SUBMIT_FOR_APPROVAL", "APPROVE", "REJECT"]).optional(),
  resolutionText: z.string().trim().min(3).max(3000).optional(),
  reviewComment: z.string().trim().min(1).max(3000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "PENDING_APPROVAL", "DONE", "CANCELLED"]).optional(),
  assignedTo: z.string().min(1).optional(),
  deadlineAt: z.string().datetime().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).optional(),
  title: z.string().trim().min(1).max(240).optional(),
});

function populatedTask(id: string) {
  return TicketTask.findById(id)
    .populate("assignedTo", "name email image")
    .populate("createdBy", "name")
    .populate("reviewedBy", "name");
}


export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });
  }
  if (!canMutateCrm(user)) {
    return NextResponse.json({ error: "Rahbar taskni o'zgartira yoki tasdiqlay olmaydi (faqat kuzatish)" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Ma’lumot noto‘g‘ri" },
      { status: 400 }
    );
  }

  await dbConnect();
  const { id } = await params;
  const task = await TicketTask.findById(id);
  if (!task) return NextResponse.json({ error: "Task topilmadi" }, { status: 404 });
  const ticket = await Ticket.findById(task.ticketId);
  const assignedToId = task.assignedTo?.toString();
  const isAssignee = assignedToId === user.id;
  if (!ticket || (!canAccessTicket(user, ticket) && !isAssignee)) {
    return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
  }

  const manager = canSeeAllTickets(user);
  const { action } = parsed.data;

  if (action === "SUBMIT_FOR_APPROVAL") {
    if (!isAssignee && !manager) {
      return NextResponse.json({ error: "Faqat biriktirilgan operator tasdiqqa yubora oladi" }, { status: 403 });
    }
    if (["PENDING_APPROVAL", "DONE", "CANCELLED"].includes(task.status)) {
      return NextResponse.json({ error: "Bu taskni hozir tasdiqqa yuborib bo‘lmaydi" }, { status: 400 });
    }
    if (!parsed.data.resolutionText) {
      return NextResponse.json({ error: "Mijozga yuboriladigan matnni kiriting" }, { status: 400 });
    }

    task.status = "PENDING_APPROVAL";
    task.resolutionText = parsed.data.resolutionText;
    task.submittedAt = new Date();
    task.reviewComment = undefined;
    task.reviewedAt = undefined;
    task.reviewedBy = undefined;
    task.completedAt = undefined;
    await task.save();

    const approvers = await User.find({
      _id: { $ne: user.id },
      $or: [{ role: { $in: ["SUPER_ADMIN", "ADMIN", "SUPPORT_LEAD"] } }, { isLead: true }],
    }).select("_id").lean();

    await Promise.allSettled(
      approvers.map((approver: any) =>
        createCrmNotification({
          userId: approver._id.toString(),
          ticketId: ticket._id.toString(),
          taskId: task._id.toString(),
          kind: "TASK_APPROVAL_REQUESTED",
          title: "Task tasdiq kutmoqda",
          body: `${user.name}: ${task.title}`,
          link: `/crm/tickets/${ticket._id}`,
          replaceExisting: true,
        })
      )
    );
    await TicketMessage.create({
      ticketId: ticket._id,
      type: "SYSTEM_EVENT",
      body: `Task tasdiqqa yuborildi: ${task.title}\nMijozga yuboriladigan matn: ${task.resolutionText}`,
      author: user.id,
      authorName: user.name,
      metadata: { taskId: task._id, approvalStatus: "PENDING" },
    });
  } else if (action === "APPROVE") {
    if (!manager) {
      return NextResponse.json({ error: "Taskni faqat rahbar tasdiqlay oladi" }, { status: 403 });
    }
    if (task.status !== "PENDING_APPROVAL") {
      return NextResponse.json({ error: "Task tasdiq holatida emas" }, { status: 400 });
    }

    task.status = "DONE";
    task.completedAt = new Date();
    task.reviewedAt = new Date();
    task.reviewedBy = user.id;
    task.reviewComment = parsed.data.reviewComment || "Tasdiqlandi";
    await task.save();

    await Promise.all([
      assignedToId
        ? createCrmNotification({
            userId: assignedToId,
            ticketId: ticket._id.toString(),
            taskId: task._id.toString(),
            kind: "TASK_APPROVED",
            title: "Task tasdiqlandi",
            body: task.title,
            link: `/crm/tickets/${ticket._id}`,
            replaceExisting: true,
          })
        : Promise.resolve(),
      TicketMessage.create({
        ticketId: ticket._id,
        type: "SYSTEM_EVENT",
        body: `Mijozga SMS yuborildi (tasdiqlandi): ${task.resolutionText || task.title}`,
        author: user.id,
        authorName: user.name,
        channel: "MANUAL",
        metadata: { taskId: task._id, deliveryStatus: "MANUAL_RECORDED", approvedBy: user.id },
      }),
    ]);
  } else if (action === "REJECT") {
    if (!manager) {
      return NextResponse.json({ error: "Taskni faqat rahbar qaytara oladi" }, { status: 403 });
    }
    if (task.status !== "PENDING_APPROVAL") {
      return NextResponse.json({ error: "Task tasdiq holatida emas" }, { status: 400 });
    }
    if (!parsed.data.reviewComment) {
      return NextResponse.json({ error: "Operatorga qaytarish sababini yozing" }, { status: 400 });
    }

    task.status = "IN_PROGRESS";
    task.completedAt = undefined;
    task.reviewedAt = new Date();
    task.reviewedBy = user.id;
    task.reviewComment = parsed.data.reviewComment;
    await task.save();

    await Promise.all([
      assignedToId
        ? createCrmNotification({
            userId: assignedToId,
            ticketId: ticket._id.toString(),
            taskId: task._id.toString(),
            kind: "TASK_REJECTED",
            title: "Task qayta ishlashga qaytarildi",
            body: parsed.data.reviewComment,
            link: `/crm/tickets/${ticket._id}`,
            replaceExisting: true,
          })
        : Promise.resolve(),
      TicketMessage.create({
        ticketId: ticket._id,
        type: "SYSTEM_EVENT",
        body: `Task operatorga qaytarildi: ${task.title}\nSabab: ${parsed.data.reviewComment}`,
        author: user.id,
        authorName: user.name,
        metadata: { taskId: task._id, approvalStatus: "REJECTED" },
      }),
    ]);
  } else {
    if (!manager && !isAssignee) {
      return NextResponse.json({ error: "Bu taskni o‘zgartirishga ruxsat yo‘q" }, { status: 403 });
    }
    if (
      !manager &&
      (parsed.data.assignedTo ||
        parsed.data.deadlineAt ||
        parsed.data.priority ||
        parsed.data.title ||
        parsed.data.status === "CANCELLED")
    ) {
      return NextResponse.json({ error: "Bu o‘zgarishni faqat rahbar qiladi" }, { status: 403 });
    }
    if (task.status === "PENDING_APPROVAL" && !manager) {
      return NextResponse.json(
        { error: "Rahbar qarorini kutayotgan taskni o‘zgartirib bo‘lmaydi" },
        { status: 400 }
      );
    }

    const previousAssignee = assignedToId;
    const update: any = { ...parsed.data };
    delete update.action;
    delete update.resolutionText;
    delete update.reviewComment;
    if (parsed.data.deadlineAt) {
      update.deadlineAt = new Date(parsed.data.deadlineAt);
      update.sentEvents = [];
    }
    if (parsed.data.status) {
      if (parsed.data.status === "DONE") update.completedAt = new Date();
      else update.completedAt = null;
    }
    if (parsed.data.assignedTo) {
      const assignee = await User.findOne({ _id: parsed.data.assignedTo }).select("_id").lean();
      if (!assignee) return NextResponse.json({ error: "Support operator topilmadi" }, { status: 400 });
    }
    await TicketTask.findByIdAndUpdate(id, update);
    if (parsed.data.assignedTo && parsed.data.assignedTo !== previousAssignee) {
      await createCrmNotification({
        userId: parsed.data.assignedTo,
        ticketId: ticket._id.toString(),
        taskId: id,
        kind: "TASK_ASSIGNED",
        title: "Sizga task biriktirildi",
        body: task.title,
        link: `/crm/tickets/${ticket._id}`,
      });
    }
    await TicketMessage.create({
      ticketId: ticket._id,
      type: "SYSTEM_EVENT",
      body: `Task yangilandi: ${task.title}`,
      author: user.id,
      authorName: user.name,
    });
  }

  const result = await populatedTask(id);
  return NextResponse.json(result);
}
