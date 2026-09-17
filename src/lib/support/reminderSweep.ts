/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { getTicketTier } from "@/lib/ticketStatus";
import { runTaskReminderSweep } from "@/lib/crmTaskReminderSweep";
import { generateDailyExecutiveReport } from "@/lib/dailyReport";
import { createCrmNotification } from "@/lib/crmNotifications";
import { notifyUserViaTelegram } from "@/lib/support/notifications";

// Uzoq vaqt OVERDUE holatida turgan ticket uchun qayta eslatish oralig'i
const RENOTIFY_OVERDUE_AFTER_MS = 2 * 60 * 60 * 1000; // 2 soat

function excerpt(text: string, len = 80) {
  return text.length > len ? text.slice(0, len) + "..." : text;
}

async function notifyTicketReminder(ticket: any, recipientId: string, level: "WARNING" | "OVERDUE") {
  const ticketId = ticket._id.toString();
  const isOverdue = level === "OVERDUE";
  const title = isOverdue ? "SLA muddati o'tdi" : "Ticket muddati yaqinlashmoqda";
  const body = `${ticket.ticketNumber || "Ticket"}: ${excerpt(ticket.problem)}\n\nMuddat: ${new Date(ticket.deadlineAt).toLocaleString("uz-UZ")}`;

  const [telegram, inApp] = await Promise.allSettled([
    notifyUserViaTelegram({
      userId: recipientId,
      title,
      body,
      icon: isOverdue ? "🔴" : "🟡",
      link: `/crm/tickets/${ticketId}`,
      buttonText: "Ticketni ochish",
    }),
    createCrmNotification({
      userId: recipientId,
      ticketId,
      kind: isOverdue ? "OVERDUE" : "ONE_HOUR_LEFT",
      title,
      body,
      link: `/crm/tickets/${ticketId}`,
      metadata: { reminder: true, level },
    }),
  ]);

  if (telegram.status === "rejected") {
    console.error("Ticket Telegram eslatmasi yuborilmadi:", telegram.reason);
  }
  if (inApp.status === "rejected") {
    console.error("Ticket in-app/FCM eslatmasi yuborilmadi:", inApp.reason);
  }

  // Telegram ulanmagan bo'lsa ham in-app notification yaratilgan bo'lishi mumkin.
  return (telegram.status === "fulfilled" && telegram.value) || inApp.status === "fulfilled";
}

function getTicketReminderRecipientIds(ticket: any) {
  return [ticket.assignedTo, ...(ticket.collaborators || [])]
    .map((user) => (user?._id || user)?.toString())
    .filter((id): id is string => Boolean(id))
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

async function notifyTicketReminderRecipients(ticket: any, level: "WARNING" | "OVERDUE") {
  const recipientIds = getTicketReminderRecipientIds(ticket);
  const results = await Promise.allSettled(
    recipientIds.map((recipientId) => notifyTicketReminder(ticket, recipientId, level)),
  );
  return results.some((result) => result.status === "fulfilled" && result.value);
}

export async function runReminderSweep() {
  await dbConnect();

  // Admin ko'rib chiqayotgan paytda operator yoki hamkorlarni reminder bilan bezovta qilmaymiz.
  // RETURN action reminder holatini reset qiladi, shunda ticket qaytarilishi bilan yana eslatiladi.
  const [openTickets, pendingApprovalCount] = await Promise.all([
    Ticket.find({
      status: { $nin: ["RESOLVED", "CLOSED"] },
      resolutionApprovalStatus: { $ne: "PENDING" },
    })
      .populate("assignedTo", "_id")
      .populate("collaborators", "_id"),
    Ticket.countDocuments({
      status: { $nin: ["RESOLVED", "CLOSED"] },
      resolutionApprovalStatus: "PENDING",
    }),
  ]);

  let warned = 0;
  let overdue = 0;

  for (const ticket of openTickets) {
    const tier = getTicketTier(ticket);
    const recipientIds = getTicketReminderRecipientIds(ticket);
    if (!recipientIds.length) continue;

    if (tier === "WARNING" && ticket.lastReminderLevel !== "WARNING") {
      const delivered = await notifyTicketReminderRecipients(ticket, "WARNING");

      // Vaqtinchalik xatolik tufayli yetkazilmagan bo'lsa, keyingi sweepda qayta urinish uchun belgilamaymiz.
      if (delivered) {
        ticket.lastReminderLevel = "WARNING";
        ticket.lastReminderAt = new Date();
        await ticket.save();
      }
      warned++;
    } else if (tier === "OVERDUE") {
      const shouldNotify =
        ticket.lastReminderLevel !== "OVERDUE" ||
        !ticket.lastReminderAt ||
        Date.now() - new Date(ticket.lastReminderAt).getTime() > RENOTIFY_OVERDUE_AFTER_MS;

      if (shouldNotify) {
        const delivered = await notifyTicketReminderRecipients(ticket, "OVERDUE");

        if (delivered) {
          ticket.lastReminderLevel = "OVERDUE";
          ticket.lastReminderAt = new Date();
          await ticket.save();
        }
        overdue++;
      }
    }
  }

  const tasks = await runTaskReminderSweep();

  // Kunlik rahbar hisoboti Toshkent vaqti bilan 10:00 dan keyingi birinchi sweepda yuboriladi.
  const tashkentHour = (new Date().getUTCHours() + 5) % 24;
  let dailyReport: Awaited<ReturnType<typeof generateDailyExecutiveReport>> | undefined;
  if (tashkentHour >= 10) {
    try {
      // Avvalgi fire-and-forget chaqiruvi xatoni sweep natijasidan uzib qo'yar edi.
      // Await qilamiz: interval diagnostikasi va retry holati aniq ko'rinadi.
      dailyReport = await generateDailyExecutiveReport();
    } catch (err) {
      console.error("Daily executive report error:", err)
    }
  }

  return { checked: openTickets.length, pendingApprovalCount, warned, overdue, tasks, dailyReport };
}
