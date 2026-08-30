declare global {
  var supportSweepIntervalStarted: boolean | undefined;
}

const SWEEP_INTERVAL_MS = 60 * 1000; // Task reminderlari uchun har daqiqada

export async function register() {
  // Faqat asosiy Node.js server processida ishga tushadi (edge runtime'da emas)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Telegram botni yoqish (agar ENABLE_TELEGRAM_BOT=false bo'lmasa)
  if (process.env.ENABLE_TELEGRAM_BOT !== "false") {
    const { startTelegramBot } = await import("@/lib/telegramBot");
    startTelegramBot();
  }

  // CRM eslatma sweep'ini yoqish (agar ENABLE_REMINDER_SWEEP=false bo'lmasa)
  if (process.env.ENABLE_REMINDER_SWEEP !== "false" && !global.supportSweepIntervalStarted) {
    global.supportSweepIntervalStarted = true;
    const { runReminderSweep } = await import("@/lib/support/reminderSweep");

    runReminderSweep().catch((err) => console.error("Initial reminder sweep failed:", err));

    setInterval(() => {
      runReminderSweep().catch((err) => console.error("Reminder sweep failed:", err));
    }, SWEEP_INTERVAL_MS);

    console.log("CRM eslatma sweep ishga tushdi (har daqiqada).");
  }
}
