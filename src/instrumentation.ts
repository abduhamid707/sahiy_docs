declare global {
  var supportSweepIntervalStarted: boolean | undefined;
  var supportSweepInProgress: boolean | undefined;
}

const SWEEP_INTERVAL_MS = 60 * 1000; // Task reminderlari uchun har daqiqada

export async function register() {
  // `NEXT_RUNTIME` standalone Node buildda ba'zan undefined bo'ladi. Faqat edge
  // runtime'ni cheklash kerak, aks holda reminder/daily-report worker umuman start olmaydi.
  if (process.env.NEXT_RUNTIME === "edge") {
    console.info("CRM reminder worker edge runtime'da ishga tushirilmadi.");
    return;
  }

  // Telegram botni yoqish (agar ENABLE_TELEGRAM_BOT=false bo'lmasa)
  if (process.env.ENABLE_TELEGRAM_BOT !== "false") {
    try {
      const { startTelegramBot } = await import("@/lib/telegramBot");
      startTelegramBot();
    } catch (error) {
      // Telegram xatosi reminder worker startini to'xtatmasligi kerak.
      console.error("Telegram botni ishga tushirishda xatolik:", error);
    }
  }

  // CRM eslatma sweep'ini yoqish (agar ENABLE_REMINDER_SWEEP=false bo'lmasa)
  if (process.env.ENABLE_REMINDER_SWEEP !== "false" && !global.supportSweepIntervalStarted) {
    try {
      global.supportSweepIntervalStarted = true;
      const { runReminderSweep } = await import("@/lib/support/reminderSweep");

      const executeSweep = async (source: "initial" | "interval") => {
        if (global.supportSweepInProgress) {
          console.warn(`CRM reminder sweep o'tkazib yuborildi (${source}): oldingi sweep tugamagan.`);
          return;
        }

        global.supportSweepInProgress = true;
        const startedAt = Date.now();
        try {
          const result = await runReminderSweep();
          if (source === "initial" || result.warned || result.overdue || result.dailyReport?.sent) {
            console.info(
              `CRM reminder sweep (${source}) yakunlandi: ${result.checked} ticket, ` +
                `${result.warned} warning, ${result.overdue} overdue, ${result.pendingApprovalCount} approval kutilmoqda, ` +
                `${Date.now() - startedAt}ms.`,
            );
          }
        } catch (error) {
          console.error(`CRM reminder sweep failed (${source}):`, error);
        } finally {
          global.supportSweepInProgress = false;
        }
      };

      void executeSweep("initial");
      setInterval(() => void executeSweep("interval"), SWEEP_INTERVAL_MS);

      console.log("CRM eslatma sweep ishga tushdi (har daqiqada).");
    } catch (error) {
      global.supportSweepIntervalStarted = false;
      console.error("CRM reminder sweep worker ishga tushmadi:", error);
    }
  }
}
