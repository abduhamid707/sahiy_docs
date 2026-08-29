"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, CircleAlert, Loader2 } from "lucide-react";
import { onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { messaging } from "@/lib/firebase";
import { formatUzDateTime } from "@/lib/crm";
import { cn } from "@/lib/utils";

export default function HeaderNotifications({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const unread = notifications.filter((item) => !item.readAt).length;

  const load = useCallback(async (quiet = false) => {
    if (!enabled) return;
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/crm/notifications", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const initial = window.setTimeout(() => load(true), 0);
    const refreshOnFocus = () => load(true);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") load(true); };
    window.addEventListener("focus", refreshOnFocus);
    window.addEventListener("crm-notifications-changed", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const unsubscribe = messaging ? onMessage(messaging, (payload) => {
      if (payload.data?.kind === "CHAT_MESSAGE") {
        toast(payload.notification?.title || "Sahiy Chat", {
          description: payload.notification?.body,
          action: payload.data?.link ? { label: "Ochish", onClick: () => router.push(payload.data!.link) } : undefined,
        });
      } else {
        load(true);
      }
    }) : undefined;
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("focus", refreshOnFocus);
      window.removeEventListener("crm-notifications-changed", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      unsubscribe?.();
    };
  }, [enabled, load, router]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const toggle = () => {
    setOpen((value) => !value);
    if (!open) load();
  };

  const markAllRead = async () => {
    await fetch("/api/crm/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
  };

  const openNotification = async (item: any) => {
    setOpen(false);
    if (!item.readAt) {
      setNotifications((items) => items.map((notification) => notification._id === item._id ? { ...notification, readAt: new Date().toISOString() } : notification));
      await fetch("/api/crm/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item._id }) });
    }
    router.push(item.link || "/crm");
  };

  return <div ref={rootRef} className="relative">
    <button onClick={toggle} aria-label={`Bildirishnomalar${unread ? `, ${unread} ta o‘qilmagan` : ""}`} aria-expanded={open} className={cn("relative rounded-xl p-2.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-slate-800", open && "bg-gray-100 text-blue-600 dark:bg-slate-800")}>
      <Bell className="h-5 w-5" />
      {unread > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-600 px-1 text-[9px] font-bold leading-none text-white dark:border-slate-900">{unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && (
      <div className="fixed inset-x-3.5 top-[68px] z-50 overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
          <div>
            <p className="text-sm font-bold">Bildirishnomalar</p>
            <p className="text-[10px] text-muted-foreground">{unread ? `${unread} ta o‘qilmagan` : "Hammasi o‘qilgan"}</p>
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Barchasini o‘qish
            </button>
          )}
        </div>
        <div className="max-h-[min(65vh,430px)] overflow-y-auto">
          {loading && !notifications.length && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            </div>
          )}
          {!loading && !notifications.length && (
            <div className="px-6 py-10 text-center">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-semibold">Bildirishnoma yo‘q</p>
              <p className="mt-1 text-xs text-muted-foreground">Yangi task va deadline alertlari shu yerda chiqadi.</p>
            </div>
          )}
          {notifications.map((item) => (
            <button
              key={item._id}
              onClick={() => openNotification(item)}
              className={cn(
                "block w-full border-b px-4 py-3 text-left transition hover:bg-muted/60",
                !item.readAt && "bg-blue-500/[.06]"
              )}
            >
              <div className="flex gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                    item.kind === "OVERDUE" || item.kind === "CRITICAL"
                      ? "bg-rose-500/15 text-rose-600"
                      : "bg-blue-500/10 text-blue-600"
                  )}
                >
                  <CircleAlert className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold">{item.title}</span>
                    {!item.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.body}</span>
                  <span className="mt-1.5 block text-[10px] text-muted-foreground">{formatUzDateTime(item.createdAt, true)}</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )}
  </div>;
}
