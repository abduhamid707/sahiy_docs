import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth-helper";
import { canUseCrm, ticketScope } from "@/lib/support/access";
import { canSeeAllTickets } from "@/lib/support/permissions";
import { getCrmTicketStats } from "@/lib/crmStatsServer";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user || !canUseCrm(user)) {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    await dbConnect();
    const manager = canSeeAllTickets(user);
    const scope = manager ? {} : ticketScope(user);
    const now = new Date();

    const stats = await getCrmTicketStats(scope, now);

    return NextResponse.json({
      // 6 Web-identical KPIs
      openCount: stats.openCount,
      createdTodayCount: stats.createdTodayCount,
      inProgressCount: stats.inProgressCount,
      waitingCount: stats.waitingCount,
      overdueCount: stats.overdueCount,
      criticalCount: stats.criticalCount,

      lastUpdatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Dashboard ma'lumotlarini yuklashda xatolik" },
      { status: 500 }
    );
  }
}
