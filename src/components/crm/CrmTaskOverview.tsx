"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlarmClock, Bell, BellRing, CheckCheck, Flame, Loader2, Smartphone, TimerReset } from "lucide-react";
import { onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { messaging } from "@/lib/firebase";
import { CRM_PRIORITY_LABELS, formatUzDateTime, ticketPublicId } from "@/lib/crm";
import { taskMatchesFilter, taskTimeLabel, taskUrgency, taskUrgencyScore } from "@/lib/crmTasks";
import { cn } from "@/lib/utils";

const taskFilters = [
  ["ALL", "Barcha aktiv"], ["MY", "Menga biriktirilgan"], ["OVERDUE", "Overdue"], ["HOUR", "Keyingi 1 soat"],
  ["TODAY", "Bugun"], ["CRITICAL", "Critical"], ["REMINDED", "Reminder yuborilgan"],
] as const;

const urgencyRow: Record<string, string> = {
  OVERDUE: "border-rose-400 bg-rose-500/10",
  ONE_HOUR: "border-red-300 bg-red-500/10",
  SIX_HOURS: "border-orange-300 bg-orange-500/10",
  TODAY: "border-amber-300 bg-amber-500/10",
  NORMAL: "bg-card",
  DONE: "bg-muted/30 opacity-70",
};

export default function CrmTaskOverview({ initialTasks, initialNotifications, currentUserId, nowIso, activeFilter = "ALL", onFilterChange }: any) {
  const filter = activeFilter;
  const [notifications, setNotifications] = useState(initialNotifications);
  const [pushLoading, setPushLoading] = useState(false);
  const unread = notifications.filter((item: any) => !item.readAt).length;
  const tasks = useMemo(() => [...initialTasks]
    .filter((task: any) => taskMatchesFilter(task, filter, currentUserId, new Date(nowIso)))
    .sort((a: any, b: any) => taskUrgencyScore(a, new Date(nowIso)) - taskUrgencyScore(b, new Date(nowIso)) || new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime()), [initialTasks, filter, currentUserId, nowIso]);

  useEffect(() => {
    const poll = async () => {
      const response = await fetch("/api/crm/notifications");
      if (response.ok) setNotifications((await response.json()).notifications);
    };
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") poll(); };
    window.addEventListener("focus", poll);
    window.addEventListener("crm-notifications-changed", poll);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const unsubscribe = messaging ? onMessage(messaging, (payload) => { toast(payload.notification?.title || "Sahiy CRM", { description: payload.notification?.body }); poll(); }) : undefined;
    return () => {
      window.removeEventListener("focus", poll);
      window.removeEventListener("crm-notifications-changed", poll);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      unsubscribe?.();
    };
  }, []);

  const enablePush = async () => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      return toast.error("Bu brauzer push bildirishnomalarni qo‘llamaydi");
    }
    setPushLoading(true);
    try {
      if (Notification.permission === "denied") {
        throw new Error("Bildirishnoma brauzerda bloklangan. Manzil (URL) yonidagi qulf/sozlama belgisidan 'Notifications'ni Allow qiling");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Bildirishnomaga ruxsat berilmadi");
      }
      const { app } = await import("@/lib/firebase");
      const { getMessaging, getToken } = await import("firebase/messaging");
      const activeMessaging = messaging || getMessaging(app);
      if (!activeMessaging) throw new Error("Firebase Messaging ishga tushmadi");

      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "BHLoN0b2nTyshjRQHRMtyihDuOS9-OZWMquI5MhrsLYXBSA7XlPm0eOV4941sZExRMKvRCch_HHNu9brjWntVPY";
      const token = await getToken(activeMessaging, {
        serviceWorkerRegistration: registration,
        vapidKey,
      });
      if (!token) throw new Error("FCM token olinmadi");

      const response = await fetch("/api/crm/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error("Token serverda saqlanmadi");
      toast.success("Push notification muvaffaqiyatli yoqildi!");
    } catch (error: any) {
      console.error("Push enable error:", error);
      toast.error(error.message || "Push notification yoqilmadi", { duration: 6000 });
    } finally {
      setPushLoading(false);
    }
  };

  const markAllRead = async () => {
    await fetch("/api/crm/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    setNotifications((items: any[]) => items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
  };

  return <section className="rounded-2xl border bg-card shadow-sm">
    <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
      <div><div className="flex items-center gap-2"><AlarmClock className="h-5 w-5 text-blue-600"/><h2 className="font-bold">Operator task nazorati</h2></div><p className="mt-1 text-xs text-muted-foreground">Eng shoshilinch tasklar avtomatik tepaga chiqadi</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={enablePush} disabled={pushLoading} className="rounded-xl">{pushLoading ? <Loader2 className="animate-spin"/> : <Smartphone/>}Push yoqish</Button>
        <details className="relative"><summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-xl border bg-background px-3 text-xs font-bold"><BellRing className="h-4 w-4"/>Bildirishnomalar{unread > 0 && <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] text-white">{unread}</span>}</summary><div className="absolute right-0 z-30 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border bg-popover shadow-2xl"><div className="flex items-center justify-between border-b p-3"><p className="text-sm font-bold">Notification center</p><button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-semibold text-blue-600"><CheckCheck className="h-3.5 w-3.5"/>Barchasini o‘qish</button></div><div className="max-h-80 overflow-y-auto">{!notifications.length && <p className="p-6 text-center text-xs text-muted-foreground">Bildirishnoma yo‘q</p>}{notifications.map((item: any) => <Link href={item.link || "/crm"} key={item._id} className={cn("block border-b p-3 hover:bg-muted/50", !item.readAt && "bg-blue-500/5")}><div className="flex gap-2"><Bell className={cn("mt-0.5 h-4 w-4 shrink-0", item.kind === "OVERDUE" ? "text-rose-600" : "text-blue-600")}/><div><p className="text-xs font-bold">{item.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p><p className="mt-1 text-[10px] text-muted-foreground">{formatUzDateTime(item.createdAt, true)}</p></div></div></Link>)}</div></div></details>
      </div>
    </div>
    <div className="flex gap-2 overflow-x-auto border-b p-3">{taskFilters.map(([key, label]) => <button key={key} onClick={() => onFilterChange?.(key)} className={cn("shrink-0 rounded-xl px-3 py-2 text-xs font-semibold", filter === key ? "bg-brand-blue text-white" : "bg-muted text-muted-foreground")}>{key === "CRITICAL" && <Flame className="mr-1 inline h-3.5 w-3.5"/>}{label}</button>)}</div>
    <div className="grid gap-2 p-3 lg:grid-cols-2">{!tasks.length && <div className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Bu filtrda aktiv task yo‘q — hammasi nazoratda.</div>}{tasks.slice(0, 10).map((task: any) => { const urgency = taskUrgency(task.deadlineAt, task.status, new Date(nowIso)); return <Link href={`/crm/tickets/${task.ticketId?._id}`} key={task._id} className={cn("rounded-xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md", urgencyRow[urgency])}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{task.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{ticketPublicId(task.ticketId)} · {task.ticketId?.callerName || "Mijoz"} · {task.assignedTo?.name}</p></div><span className={cn("shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold", urgency === "OVERDUE" || urgency === "ONE_HOUR" ? "bg-rose-600 text-white" : "bg-background")}>{taskTimeLabel(task.deadlineAt, task.status, new Date(nowIso))}</span></div><div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground"><span>{CRM_PRIORITY_LABELS[task.priority]}</span><span className="flex items-center gap-1"><TimerReset className="h-3 w-3"/>{formatUzDateTime(task.deadlineAt, true)}</span></div></Link>; })}</div>
  </section>;
}
