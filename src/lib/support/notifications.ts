import { User } from "@/models/User";
import { sendTelegramMessage } from "@/lib/telegram";

export type TicketNotificationContext = {
  ticketId?: string;
  ticketNumber?: string;
  /** Relative CRM path (`/crm/tickets/...`) yoki tayyor absolute URL. */
  link?: string;
};

export type UserTelegramNotification = {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  link?: string;
  buttonText?: string;
};

function excerpt(text: string, len = 120) {
  return text.length > len ? text.slice(0, len) + "..." : text;
}

function escapeTelegramHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Telegram inline tugmasi uchun relative URL-ni public URLga aylantiradi. */
export function getAbsoluteCrmLink(link?: string) {
  if (!link) return undefined;
  const normalized = link.trim();
  if (!normalized) return undefined;
  if (/^https?:\/\//i.test(normalized)) return normalized;

  const origin = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) return undefined;

  try {
    return new URL(normalized.startsWith("/") ? normalized : `/${normalized}`, origin).toString();
  } catch {
    console.warn("Telegram uchun CRM link noto'g'ri:", normalized);
    return undefined;
  }
}

/** Telegrami ulangan foydalanuvchiga CRM xabari va ixtiyoriy CTA tugmasi yuboradi. */
export async function notifyUserViaTelegram(input: UserTelegramNotification): Promise<boolean> {
  try {
    const user = await User.findById(input.userId).select("telegram");
    const chatId = user?.telegram?.chatId;
    if (!chatId) return false;

    const link = getAbsoluteCrmLink(input.link);
    return await sendTelegramMessage(
      chatId,
      `${input.icon || "🔔"} <b>${escapeTelegramHtml(input.title.slice(0, 300))}</b>\n\n${escapeTelegramHtml(input.body.slice(0, 3_500))}`,
      link && input.buttonText ? { button: { text: input.buttonText, url: link } } : undefined,
    );
  } catch (error) {
    console.error("Telegram CRM notification yuborilmadi:", error);
    return false;
  }
}

/**
 * Ticket bilan bog'liq Telegram xabari uchun yagona helper. `context.link`
 * relative bo'lishi mumkin; `notifyUserViaTelegram` uni NEXTAUTH_URL orqali
 * inline tugma ishlata oladigan absolute URL ga aylantiradi.
 */
export async function notifyTicketViaTelegram(input: {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  context?: TicketNotificationContext;
  buttonText?: string;
}): Promise<boolean> {
  const context = input.context || {};
  const ticketPath = context.link || (context.ticketId ? `/crm/tickets/${context.ticketId}` : undefined);
  return notifyUserViaTelegram({
    userId: input.userId,
    title: input.title,
    body: input.body,
    icon: input.icon,
    link: ticketPath,
    buttonText: ticketPath ? input.buttonText || "Ticketni ochish" : undefined,
  });
}

/**
 * Oldingi uch argumentli chaqiruvlar ham ishlaydi. Context berilganda Telegram
 * xabarida ticketni bevosita ochuvchi tugma chiqadi.
 */
export async function notifyTicketAssigned(
  assignedToId: string,
  problem: string,
  deadlineAt: Date | string,
  context: TicketNotificationContext = {},
) {
  const ticketPrefix = context.ticketNumber ? `${context.ticketNumber}\n` : "";

  return notifyTicketViaTelegram({
    userId: assignedToId,
    title: "Sizga yangi ticket biriktirildi",
    body: `${ticketPrefix}${excerpt(problem)}\n\nMuddat: ${new Date(deadlineAt).toLocaleString("uz-UZ")}`,
    icon: "📞",
    context,
  });
}

export async function notifyTicketConsultationRequested(
  recipientId: string,
  requestedByName: string | undefined,
  question: string,
  context: TicketNotificationContext = {},
) {
  const ticketPrefix = context.ticketNumber ? `${context.ticketNumber}: ` : "";
  return notifyTicketViaTelegram({
    userId: recipientId,
    title: `${requestedByName || "Operator"} maslahat so'radi`,
    body: `${ticketPrefix}${excerpt(question, 500)}`,
    icon: "💬",
    context,
  });
}

export async function notifyTicketConsultationAnswered(
  requesterId: string,
  responderName: string | undefined,
  response: string,
  context: TicketNotificationContext = {},
) {
  const ticketPrefix = context.ticketNumber ? `${context.ticketNumber}: ` : "";
  return notifyTicketViaTelegram({
    userId: requesterId,
    title: `${responderName || "Operator"} maslahat so'rovingizga javob berdi`,
    body: `${ticketPrefix}${excerpt(response, 500)}`,
    icon: "💬",
    context,
  });
}
