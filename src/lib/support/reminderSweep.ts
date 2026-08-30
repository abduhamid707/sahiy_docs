/* eslint-disable @typescript-eslint/no-explicit-any */
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { sendTelegramMessage } from "@/lib/telegram";
import { getTicketTier } from "@/lib/ticketStatus";
import { runTaskReminderSweep } from "@/lib/crmTaskReminderSweep";
import { generateDailyExecutiveReport } from "@/lib/dailyReport";

// Uzoq vaqt OVERDUE holatida turgan ticket uchun qayta eslatish oralig'i
const RENOTIFY_OVERDUE_AFTER_MS = 2 * 60 * 60 * 1000; // 2 soat

function excerpt(text: string, len = 80) {
  return text.length > len ? text.slice(0, len) + "..." : text;
}

export async function runReminderSweep() {
  await dbConnect();

  const openTickets = await Ticket.find({ status: { $nin: ["RESOLVED", "CLOSED"] } }).populate("assignedTo", "name telegram");

  let warned = 0;
  let overdue = 0;

  for (const ticket of openTickets) {
    const tier = getTicketTier(ticket);
    const chatId = (ticket.assignedTo as any)?.telegram?.chatId;

    if (tier === "WARNING" && ticket.lastReminderLevel !== "WARNING") {
      // chatId bo'lmasa (xodim Telegramni ulamagan) - urinishning ma'nosi yo'q, lekin
      // shunga qaramay belgilab qo'yamiz, aks holda har sweepda bekorga qayta tekshiriladi.
      const delivered = chatId
        ? await sendTelegramMessage(
            chatId,
            `🟡 <b>Diqqat:</b> ticketning muddati yaqinlashmoqda.\n\n${excerpt(ticket.problem)}\n\nMuddat: ${new Date(ticket.deadlineAt).toLocaleString("uz-UZ")}`
          )
        : true;

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
        const delivered = chatId
          ? await sendTelegramMessage(
              chatId,
              `🔴 <b>MUDDATI O'TDI!</b> Darhol e'tibor bering.\n\n${excerpt(ticket.problem)}\n\nMuddat: ${new Date(ticket.deadlineAt).toLocaleString("uz-UZ")}`
            )
          : true;

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
  if (tashkentHour >= 10) {
    generateDailyExecutiveReport().catch((err) =>
      console.error("Daily executive report error:", err)
    );
  }

  return { checked: openTickets.length, warned, overdue, tasks };
}
