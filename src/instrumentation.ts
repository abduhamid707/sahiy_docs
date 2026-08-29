declare global {
  var supportSweepIntervalStarted: boolean | undefined;
}

const SWEEP_INTERVAL_MS = 60 * 1000; // Task reminderlari uchun har daqiqada

export async function register() {
  // Faqat asosiy Node.js server processida ishga tushadi (edge runtime'da emas)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startTelegramBot } = await import("@/lib/telegramBot");
  startTelegramBot();

  if (!global.supportSweepIntervalStarted) {
    global.supportSweepIntervalStarted = true;
    const { runReminderSweep } = await import("@/lib/support/reminderSweep");

    runReminderSweep().catch((err) => console.error("Initial reminder sweep failed:", err));

    setInterval(() => {
      runReminderSweep().catch((err) => console.error("Reminder sweep failed:", err));
    }, SWEEP_INTERVAL_MS);

    console.log("CRM eslatma sweep ishga tushdi (har daqiqada).");
  }
}
