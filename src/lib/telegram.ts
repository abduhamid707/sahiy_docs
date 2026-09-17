const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const TELEGRAM_REQUEST_TIMEOUT_MS = 15_000;

export type TelegramMessageOptions = {
  /** Telegram xabarining tagida ochiladigan bitta CTA tugmasi. */
  button?: {
    text: string;
    url: string;
  };
  disableWebPagePreview?: boolean;
};

function isHttpUrl(value: string | undefined) {
  return !!value && /^https?:\/\//i.test(value);
}

// true qaytaradi - xabar muvaffaqiyatli yetkazilganda. Chaqiruvchi tomon
// (masalan reminder sweep) shu natijaga qarab "eslatma yuborildi" deb belgilashi kerak,
// aks holda vaqtinchalik xatolik tufayli xodim eslatmani umuman olmay qolishi mumkin.
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options: TelegramMessageOptions = {},
): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_REQUEST_TIMEOUT_MS);
  const button = options.button && isHttpUrl(options.button.url)
    ? { inline_keyboard: [[{ text: options.button.text, url: options.button.url }]] }
    : undefined;

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: options.disableWebPagePreview ?? true,
        ...(button ? { reply_markup: button } : {}),
      }),
    });
    if (!res.ok) {
      console.error("Telegram send error:", await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Telegram send failed:", error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function getTelegramDeepLink(code: string) {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  return username ? `https://t.me/${username}?start=${code}` : null;
}
