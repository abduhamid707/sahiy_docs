import { User } from "@/models/User";
import { sendTelegramMessage } from "@/lib/telegram";

function excerpt(text: string, len = 80) {
  return text.length > len ? text.slice(0, len) + "..." : text;
}

export async function notifyTicketAssigned(assignedToId: string, problem: string, deadlineAt: Date | string) {
  try {
    const user = await User.findById(assignedToId).select("telegram");
    const chatId = user?.telegram?.chatId;
    if (!chatId) return;

    await sendTelegramMessage(
      chatId,
      `📞 <b>Sizga yangi ticket biriktirildi</b>\n\n${excerpt(problem)}\n\nMuddat: ${new Date(deadlineAt).toLocaleString("uz-UZ")}`
    );
  } catch (error) {
    console.error("notifyTicketAssigned error:", error);
  }
}
