import { Bot } from "grammy";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";

declare global {
  var telegramBotStarted: boolean | undefined;
}

// Next.js dev rejimida hot-reload paytida bot ikki marta ishga tushib
// Telegram'dan "409 Conflict" xatosini olmasligi uchun global flag bilan himoyalanadi.
export function startTelegramBot() {
  if (global.telegramBotStarted) return;
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN topilmadi - Telegram bot ishga tushirilmadi.");
    return;
  }

  global.telegramBotStarted = true;

  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

  bot.command("start", async (ctx) => {
    const code = ctx.match?.toString().trim();
    if (!code) {
      await ctx.reply(
        "Salom! Bu Sahiy qo'llab-quvvatlash boti. Hisobingizni ulash uchun profilingizdagi \"Telegramni ulash\" tugmasidan foydalaning."
      );
      return;
    }

    try {
      await dbConnect();
      const user = await User.findOne({
        "telegram.linkCode": code,
        "telegram.linkCodeExpiresAt": { $gt: new Date() },
      });

      if (!user) {
        await ctx.reply("Kod noto'g'ri yoki muddati o'tgan. Profilingizdan yangi havola oling.");
        return;
      }

      user.telegram.chatId = String(ctx.chat.id);
      user.telegram.linkCode = undefined;
      user.telegram.linkCodeExpiresAt = undefined;
      await user.save();

      await ctx.reply(`✅ Hisobingiz ulandi, ${user.name}! Endi eslatmalar shu yerga keladi.`);
    } catch (error) {
      console.error("Telegram /start error:", error);
      await ctx.reply("Xatolik yuz berdi, birozdan so'ng qayta urinib ko'ring.");
    }
  });

  bot.catch((err) => {
    console.error("Telegram bot error:", err.error);
  });

  bot.start();
  console.log("Telegram bot (long-polling) ishga tushdi.");
}
