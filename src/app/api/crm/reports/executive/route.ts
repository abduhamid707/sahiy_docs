import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { getAuthUser } from "@/lib/auth-helper";
import { getCrmTicketStats } from "@/lib/crmStatsServer";
import { createCrmNotification } from "@/lib/crmNotifications";

const reportSchema = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(5).max(5000),
  includeStats: z.boolean().default(false),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).default("NORMAL"),
  recipientIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Hisobot yuborishga ruxsat yo'q" }, { status: 403 });
    }

    const parsed = reportSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Ma'lumotlar noto'g'ri" },
        { status: 400 }
      );
    }

    await dbConnect();
    const { title, body, includeStats, priority, recipientIds } = parsed.data;

    let finalBody = body;
    let statsSnapshot: any = null;

    if (includeStats) {
      statsSnapshot = await getCrmTicketStats();
      finalBody += `\n\n📊 Joriy holat:\n- Ochiq: ${statsSnapshot.openCount}\n- Bugun yangi: ${statsSnapshot.createdTodayCount}\n- Jarayonda: ${statsSnapshot.inProgressCount}\n- Kutilmoqda: ${statsSnapshot.waitingCount}\n- Kechikkan: ${statsSnapshot.overdueCount}\n- Kritik: ${statsSnapshot.criticalCount}`;
    }

    let targetQuery: any = { role: "RAHBAR" };
    if (recipientIds && recipientIds.length > 0) {
      targetQuery = { _id: { $in: recipientIds }, role: "RAHBAR" };
    }

    const recipients = await User.find(targetQuery).select("_id name").lean();

    const createdNotifications = await Promise.all(
      recipients.map((rec: any) =>
        createCrmNotification({
          userId: rec._id.toString(),
          kind: "EXECUTIVE_REPORT",
          title: `📝 [Hisobot] ${title}`,
          body: `${user.name} dan:\n${finalBody}`,
          link: "/crm",
          metadata: {
            isExecutiveReport: true,
            authorId: user.id || (user as any)._id?.toString() || "",
            authorName: user.name,
            sentAt: new Date().toISOString(),
            priority,
            stats: statsSnapshot,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      sentCount: createdNotifications.length,
      recipients: recipients.map((r: any) => r.name),
    });
  } catch (error: any) {
    console.error("Executive report error:", error);
    return NextResponse.json(
      { error: error?.message || "Hisobot yuborishda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
