import dbConnect from "./mongodb";
import { Ticket } from "@/models/Ticket";
import { getTashkentStartOfToday, CrmTicketStats } from "./crm";

export async function getCrmTicketStats(
  scopeFilter: any = {},
  now: Date = new Date()
): Promise<CrmTicketStats> {
  await dbConnect();
  const startOfTashkentToday = getTashkentStartOfToday(now);

  const baseFilter = (condition: any) => {
    if (!scopeFilter || Object.keys(scopeFilter).length === 0) {
      return condition;
    }
    return { $and: [scopeFilter, condition] };
  };

  const [
    openCount,
    createdTodayCount,
    inProgressCount,
    waitingCount,
    overdueCount,
    criticalCount,
  ] = await Promise.all([
    // 1. Ochiq
    Ticket.countDocuments(
      baseFilter({ status: { $nin: ["RESOLVED", "CLOSED"] } })
    ),

    // 2. Bugun yangi
    Ticket.countDocuments(
      baseFilter({ createdAt: { $gte: startOfTashkentToday } })
    ),

    // 3. Jarayonda
    Ticket.countDocuments(baseFilter({ status: "IN_PROGRESS" })),

    // 4. Kutilmoqda (WAITING and legacy WAITING_CLIENT)
    Ticket.countDocuments(
      baseFilter({ status: { $in: ["WAITING", "WAITING_CLIENT"] } })
    ),

    // 5. Kechikkan
    Ticket.countDocuments(
      baseFilter({
        status: { $nin: ["RESOLVED", "CLOSED"] },
        deadlineAt: { $lt: now, $ne: null },
      })
    ),

    // 6. Kritik
    Ticket.countDocuments(
      baseFilter({
        status: { $nin: ["RESOLVED", "CLOSED"] },
        priority: "CRITICAL",
      })
    ),
  ]);

  return {
    openCount,
    createdTodayCount,
    inProgressCount,
    waitingCount,
    overdueCount,
    criticalCount,
  };
}
