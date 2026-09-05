/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Flame, Inbox, MessagesSquare, Tag, Activity, TimerReset, PhoneCall, Headset, PhoneOff, PhoneForwarded } from "lucide-react";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canSeeAllTickets } from "@/lib/support/permissions";
import { getCrmAnalytics } from "@/lib/support/analytics";
import { CRM_CATEGORY_LABELS, CRM_STATUS_LABELS, formatDuration, ticketPublicId } from "@/lib/crm";
import { formatCallDuration } from "@/lib/utils";

function humanMs(ms: number) {
  if (!ms) return "—";
  const minutes = Math.round(ms / 60000);
  return minutes < 60 ? `${minutes} daq` : minutes < 1440 ? `${Math.round(minutes / 60)} soat` : `${Math.round(minutes / 1440)} kun`;
}

const STATUS_THEMES: Record<string, { gradient: string; dot: string; badge: string }> = {
  IN_PROGRESS: {
    gradient: "from-blue-500 to-indigo-600",
    dot: "bg-blue-500 shadow-blue-500/40",
    badge: "text-blue-700 bg-blue-50 border-blue-200/60 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-900/50",
  },
  NEW: {
    gradient: "from-violet-500 to-purple-600",
    dot: "bg-violet-500 shadow-violet-500/40",
    badge: "text-violet-700 bg-violet-50 border-violet-200/60 dark:text-violet-300 dark:bg-violet-950/40 dark:border-violet-900/50",
  },
  OPEN: {
    gradient: "from-violet-500 to-purple-600",
    dot: "bg-violet-500 shadow-violet-500/40",
    badge: "text-violet-700 bg-violet-50 border-violet-200/60 dark:text-violet-300 dark:bg-violet-950/40 dark:border-violet-900/50",
  },
  WAITING: {
    gradient: "from-amber-400 to-orange-500",
    dot: "bg-amber-500 shadow-amber-500/40",
    badge: "text-amber-700 bg-amber-50 border-amber-200/60 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900/50",
  },
  RESOLVED: {
    gradient: "from-emerald-400 to-teal-600",
    dot: "bg-emerald-500 shadow-emerald-500/40",
    badge: "text-emerald-700 bg-emerald-50 border-emerald-200/60 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900/50",
  },
  CLOSED: {
    gradient: "from-slate-400 to-slate-500",
    dot: "bg-slate-400 shadow-slate-400/40",
    badge: "text-slate-700 bg-slate-100 border-slate-200/60 dark:text-slate-300 dark:bg-slate-900/40 dark:border-slate-800",
  },
};

const CATEGORY_GRADIENTS = [
  { gradient: "from-blue-500 to-indigo-600", dot: "bg-blue-500", badge: "text-blue-700 bg-blue-50 border-blue-200/60 dark:text-blue-300 dark:bg-blue-950/40" },
  { gradient: "from-indigo-500 to-violet-600", dot: "bg-indigo-500", badge: "text-indigo-700 bg-indigo-50 border-indigo-200/60 dark:text-indigo-300 dark:bg-indigo-950/40" },
  { gradient: "from-cyan-500 to-blue-500", dot: "bg-cyan-500", badge: "text-cyan-700 bg-cyan-50 border-cyan-200/60 dark:text-cyan-300 dark:bg-cyan-950/40" },
  { gradient: "from-teal-500 to-emerald-600", dot: "bg-teal-500", badge: "text-teal-700 bg-teal-50 border-teal-200/60 dark:text-teal-300 dark:bg-teal-950/40" },
  { gradient: "from-amber-400 to-orange-500", dot: "bg-amber-500", badge: "text-amber-700 bg-amber-50 border-amber-200/60 dark:text-amber-300 dark:bg-amber-950/40" },
  { gradient: "from-pink-500 to-rose-500", dot: "bg-pink-500", badge: "text-pink-700 bg-pink-50 border-pink-200/60 dark:text-pink-300 dark:bg-pink-950/40" },
  { gradient: "from-slate-400 to-slate-500", dot: "bg-slate-400", badge: "text-slate-700 bg-slate-100 border-slate-200/60 dark:text-slate-300 dark:bg-slate-900/40" },
];

export default async function CrmAnalyticsPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!session) redirect("/login");
  if (!canSeeAllTickets(user)) redirect("/crm");

  await dbConnect();
  const data = await getCrmAnalytics();

  const totalCategoryCount = data.categories.reduce((sum: number, x: any) => sum + x.count, 0) || 1;
  const maxCategory = Math.max(1, ...data.categories.map((x: any) => x.count));

  const totalStatusCount = data.statuses.reduce((sum: number, x: any) => sum + x.count, 0) || 1;
  const maxStatus = Math.max(1, ...data.statuses.map((x: any) => x.count));

  const cards = [
    ["Jami ticket", data.summary.total, MessagesSquare, "text-blue-600"],
    ["Bugun yangi", data.summary.newToday, Inbox, "text-violet-600"],
    ["Ochiq", data.summary.open, Clock3, "text-cyan-600"],
    ["Hal qilingan", data.summary.resolved, CheckCircle2, "text-emerald-600"],
    ["Kechikkan", data.summary.overdue, AlertTriangle, "text-rose-600"],
    ["Kritik", data.summary.critical, Flame, "text-red-600"],
    ["Birinchi javob", humanMs(data.summary.avgFirstResponseMs), TimerReset, "text-amber-600"],
    ["Yechish vaqti", humanMs(data.summary.avgResolutionMs), Clock3, "text-indigo-600"],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button nativeButton={false} variant="outline" size="icon" className="h-10 w-10 rounded-xl" render={<Link href="/crm" />}>
          <ArrowLeft />
        </Button>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-600 dark:text-blue-400">Customer Support CRM</p>
          <h1 className="text-2xl font-bold">Analytics</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([label, value, Icon, color]) => (
          <Card key={label} className="rounded-2xl">
            <CardContent className="p-4">
              <Icon className={`mb-3 h-5 w-5 ${color}`} />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Muammolar kategoriyasi */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-base font-bold">Muammolar kategoriyasi</CardTitle>
              </div>
              <span className="rounded-lg bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                Jami: {totalCategoryCount} ta
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {data.categories.map((x: any, idx: number) => {
              const label = CRM_CATEGORY_LABELS[x._id] || x._id;
              const percent = Math.round((x.count / totalCategoryCount) * 100);
              const barWidth = Math.max(4, Math.round((x.count / maxCategory) * 100));
              const theme = CATEGORY_GRADIENTS[idx % CATEGORY_GRADIENTS.length];

              return (
                <div key={x._id} className="group space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                      <span className="font-semibold text-foreground">{label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground">{x.count}</span>
                      <span className={`rounded-md border px-1.5 py-0.2 text-[10px] font-medium ${theme.badge}`}>
                        {percent}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${theme.gradient} transition-all duration-500 shadow-sm`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Statuslar bo‘yicha */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-600" />
                <CardTitle className="text-base font-bold">Statuslar bo‘yicha</CardTitle>
              </div>
              <span className="rounded-lg bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                Jami: {totalStatusCount} ta
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {data.statuses.map((x: any) => {
              const label = CRM_STATUS_LABELS[x._id] || x._id;
              const percent = Math.round((x.count / totalStatusCount) * 100);
              const barWidth = Math.max(4, Math.round((x.count / maxStatus) * 100));
              const theme = STATUS_THEMES[x._id] || STATUS_THEMES.CLOSED;

              return (
                <div key={x._id} className="group space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                      <span className="font-semibold text-foreground">{label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground">{x.count}</span>
                      <span className={`rounded-md border px-1.5 py-0.2 text-[10px] font-medium ${theme.badge}`}>
                        {percent}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${theme.gradient} transition-all duration-500 shadow-sm`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Headset className="h-5 w-5 text-indigo-600" />
              <CardTitle>Call Center (Bugun)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><PhoneCall className="h-3 w-3" /> Jami Qo'ng'iroq</p>
                <p className="text-2xl font-bold">{data.calls.todayTotal}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-emerald-600 flex items-center gap-1.5"><Headset className="h-3 w-3" /> Javob berildi</p>
                <p className="text-2xl font-bold">{data.calls.todayAnswered}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-rose-500 flex items-center gap-1.5"><PhoneOff className="h-3 w-3" /> O'tkazib yuborildi</p>
                <p className="text-2xl font-bold">{data.calls.todayMissed}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Activity className="h-3 w-3" /> Answer Rate</p>
                <p className="text-xl font-bold">
                  {data.calls.todayTotal > 0 ? Math.round((data.calls.todayAnswered / data.calls.todayTotal) * 100) : 0}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock3 className="h-3 w-3" /> O'rt. Gaplashish</p>
                <p className="text-xl font-bold">{formatCallDuration(data.calls.avgTalkSec)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><TimerReset className="h-3 w-3" /> O'rt. Kutish</p>
                <p className="text-xl font-bold">{formatCallDuration(data.calls.avgWaitSec)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Operatorlar Qo'ng'iroqlari</h4>
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3 text-left font-medium">Operator (PBX)</th>
                      <th className="py-2 px-3 text-right font-medium">Qabul</th>
                      <th className="py-2 px-3 text-right font-medium">Missed</th>
                      <th className="py-2 px-3 text-right font-medium">O'rt. vaqt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.calls.operators.map((o: any) => (
                      <tr key={o._id} className="hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium">{o._id}</td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-semibold">{o.answered}</td>
                        <td className="py-2 px-3 text-right text-rose-500 font-semibold">{o.missed}</td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{formatCallDuration(o.avgTalk)}</td>
                      </tr>
                    ))}
                    {!data.calls.operators.length && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-muted-foreground">Bugun operatorlar qo'ng'iroq qabul qilmadi</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Operator samaradorligi (Ticketlar)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.operators.length ? (
              data.operators.map((o: any) => (
                <div key={o._id.toString()} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl bg-muted/40 p-3 text-sm">
                  <span className="font-semibold">{o.name}</span>
                  <span className="text-muted-foreground">
                    {o.resolved}/{o.total} yopilgan
                  </span>
                  <span className="font-bold">{humanMs(o.avgResolutionMs)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Hali ma’lumot yetarli emas.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Eng uzoq ochiq ticketlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.longest.length ? (
              data.longest.map((t: any) => (
                <Link
                  key={t._id.toString()}
                  href={`/crm/tickets/${t._id}`}
                  className="flex items-center justify-between gap-3 rounded-xl p-3 hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-blue-600">{ticketPublicId(t)}</p>
                    <p className="truncate text-sm">{t.callerName || t.problem}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-rose-600">{formatDuration(t.createdAt)}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Ochiq ticket yo‘q.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

