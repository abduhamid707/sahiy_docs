import dbConnect from "./mongodb";
import { Ticket } from "@/models/Ticket";
import { User } from "@/models/User";
import { CrmNotification } from "@/models/CrmNotification";
import { createCrmNotification } from "@/lib/crmNotifications";
import { getTashkentStartOfToday, uzDateKey } from "./crm";
import { getCrmTicketStats } from "./crmStatsServer";

export async function generateDailyExecutiveReport(force = false) {
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
      return { sent: false, reason: "Already generated today" };
    }
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
      topOperatorName = (opUser as any).name;
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

  // Kunlik hisobot faqat RAHBAR rolidagi foydalanuvchilarga yuboriladi.
  const executives = await User.find({
    role: "RAHBAR",
  })
    .select("_id fcmTokens")
    .lean();

  const notifications = await Promise.all(
    executives.map(async (exec: any) => {
      return createCrmNotification({
        userId: exec._id.toString(),
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
      });
    })
  );

  return { sent: true, recipientCount: executives.length, title, body };
}
