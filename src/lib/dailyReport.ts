import dbConnect from "./mongodb";
import { Ticket } from "@/models/Ticket";
import { User } from "@/models/User";
import { CrmNotification } from "@/models/CrmNotification";
import { createCrmNotification } from "@/lib/crmNotifications";
import { getTashkentStartOfToday, uzDateKey } from "./crm";
import { getCrmTicketStats } from "./crmStatsServer";
import { notifyUserViaTelegram } from "@/lib/support/notifications";

type DailyReportResult = {
  sent: boolean;
  reason?: string;
  recipientCount: number;
  notificationCount?: number;
  title?: string;
  body?: string;
};

declare global {
  // Bitta standalone Node process ichida interval/API parallel kelganda duplicate report chiqmasin.
  // Multi-replica holatida esa alohida worker + DB lock ishlatilishi kerak.
  var dailyExecutiveReportPromise: Promise<DailyReportResult> | undefined;
}

async function generateDailyExecutiveReportInternal(force = false): Promise<DailyReportResult> {
  await dbConnect();
  const now = new Date();
  const todayKey = uzDateKey(now);
  const lockKey = `DAILY_REPORT_${todayKey}`;

  // Check if today's report has already been created (unless forced)
  if (!force) {
    const existing = await CrmNotification.findOne({
      "metadata.reportLockKey": lockKey,
    });
    if (existing) {
      return { sent: false, reason: "Already generated today", recipientCount: 0 };
    }
  }

  // RAHBAR bilan cheklanib qolmasin: Super Admin, Admin va isLead flagi ham rahbarlik
  // notificationlarini oladi. MongoDB bitta userni faqat bir marta qaytaradi.
  const executives = await User.find({
    $or: [
      { role: { $in: ["RAHBAR", "SUPER_ADMIN", "ADMIN"] } },
      { isLead: true },
    ],
  })
    .select("_id name role isLead")
    .lean();

  // Rahbar bo'lmasa "sent" deb noto'g'ri belgilamaymiz. Keyingi sweepda yangi rahbar
  // qo'shilgan bo'lsa, shu kunning hisoboti yuborilishi mumkin.
  if (!executives.length) {
    console.warn(`[CRM daily report] ${todayKey}: qabul qiluvchi rahbar topilmadi.`);
    return { sent: false, reason: "No leadership recipients configured", recipientCount: 0 };
  }

  const startOfToday = getTashkentStartOfToday(now);
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  const [stats, resolvedToday, resolvedYesterday, topOperators, unassignedCount] =
    await Promise.all([
      getCrmTicketStats({}, now),

      // Resolved today
      Ticket.countDocuments({
        status: { $in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { $gte: startOfToday },
      }),

      // Resolved yesterday
      Ticket.countDocuments({
        status: { $in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { $gte: startOfYesterday, $lt: startOfToday },
      }),

      // Top operator who resolved tickets today
      Ticket.aggregate([
        {
          $match: {
            status: { $in: ["RESOLVED", "CLOSED"] },
            resolvedAt: { $gte: startOfToday },
            assignedTo: { $ne: null },
          },
        },
        { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),

      // Unassigned active tickets
      Ticket.countDocuments({
        status: { $nin: ["RESOLVED", "CLOSED"] },
        $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
      }),
    ]);

  let topOperatorName = "Mavjud emas";
  let topOperatorCount = 0;
  if (topOperators.length > 0) {
    const opUser = await User.findById(topOperators[0]._id).select("name").lean();
    if (opUser) {
      topOperatorName = opUser.name;
      topOperatorCount = topOperators[0].count;
    }
  }

  const title = `Sahiy CRM — Kunlik Rahbar Hisoboti (${todayKey})`;
  const body = [
    `📊 Bugun yangi: ${stats.createdTodayCount} ta`,
    `✅ Hal qilindi: ${resolvedToday} ta (kecha: ${resolvedYesterday} ta)`,
    `⏳ Jarayonda: ${stats.inProgressCount} ta`,
    `🕒 Kutilmoqda: ${stats.waitingCount} ta`,
    `⚠️ Kechikkan: ${stats.overdueCount} ta`,
    `🔥 Kritik: ${stats.criticalCount} ta`,
    `👤 Biriktirilmagan: ${unassignedCount} ta`,
    topOperatorCount > 0
      ? `🏆 Eng faol operator: ${topOperatorName} — ${topOperatorCount} ta murojaat`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const deliveryResults = await Promise.allSettled(
    executives.map(async (exec) => {
      const recipientId = exec._id.toString();
      const [crmNotification] = await Promise.allSettled([
        createCrmNotification({
          userId: recipientId,
          kind: "EXECUTIVE_REPORT",
          title,
          body,
          link: "/crm",
          metadata: {
            reportLockKey: lockKey,
            isDailyReport: true,
            stats: {
              openCount: stats.openCount,
              createdTodayCount: stats.createdTodayCount,
              resolvedToday,
              inProgressCount: stats.inProgressCount,
              overdueCount: stats.overdueCount,
              criticalCount: stats.criticalCount,
            },
          },
        }),
        // Telegram ulangan rahbarlar uchun FCM ishlamagan paytda ham fallback bo'ladi.
        notifyUserViaTelegram({
          userId: recipientId,
          title: "Kunlik rahbar hisoboti",
          body,
          icon: "📊",
          link: "/crm",
          buttonText: "CRMni ochish",
        }),
      ]);

      if (crmNotification.status === "rejected") {
        throw crmNotification.reason;
      }
      return crmNotification.value;
    }),
  );

  const notificationCount = deliveryResults.filter(
    (result) => result.status === "fulfilled" && Boolean(result.value),
  ).length;
  const failures = deliveryResults.filter((result) => result.status === "rejected");
  if (failures.length) {
    console.error(`[CRM daily report] ${todayKey}: ${failures.length} ta rahbarga yuborish xatosi.`);
  }

  if (!notificationCount) {
    return {
      sent: false,
      reason: "Daily report notifications could not be created",
      recipientCount: executives.length,
      notificationCount: 0,
      title,
      body,
    };
  }

  console.info(`[CRM daily report] ${todayKey}: ${notificationCount}/${executives.length} rahbarga yuborildi.`);
  return { sent: true, recipientCount: executives.length, notificationCount, title, body };
}

export function generateDailyExecutiveReport(force = false): Promise<DailyReportResult> {
  if (force) return generateDailyExecutiveReportInternal(true);
  if (global.dailyExecutiveReportPromise) return global.dailyExecutiveReportPromise;

  const promise = generateDailyExecutiveReportInternal(false);
  global.dailyExecutiveReportPromise = promise;
  // `finally()` dan qaytgan promise reject bo'lsa unhandled rejection chiqishi
  // mumkin. Ikkala yakun holatida ham global lockni aniq bo'shatamiz.
  void promise.then(
    () => {
      if (global.dailyExecutiveReportPromise === promise) global.dailyExecutiveReportPromise = undefined;
    },
    () => {
      if (global.dailyExecutiveReportPromise === promise) global.dailyExecutiveReportPromise = undefined;
    },
  );
  return promise;
}
