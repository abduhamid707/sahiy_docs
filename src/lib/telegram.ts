const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// true qaytaradi - xabar muvaffaqiyatli yetkazilganda. Chaqiruvchi tomon
// (masalan reminder sweep) shu natijaga qarab "eslatma yuborildi" deb belgilashi kerak,
// aks holda vaqtinchalik xatolik tufayli xodim eslatmani umuman olmay qolishi mumkin.
export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) return false;

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    if (!res.ok) {
      console.error("Telegram send error:", await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Telegram send failed:", error);
    return false;
  }
}

export function getTelegramDeepLink(code: string) {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  return username ? `https://t.me/${username}?start=${code}` : null;
}
