"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock3,
  Flame,
  Inbox,
  MessageSquareText,
  Plus,
  Search,
  UserRoundCheck,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CRM_CATEGORY_LABELS,
  CRM_PRIORITY_LABELS,
  CRM_STATUS_LABELS,
  formatDuration,
  formatUzDateTime,
  formatUzPhone,
  isOpenStatus,
  isOverdue,
  ticketPublicId,
  uzDateKey,
} from "@/lib/crm";
import { cn } from "@/lib/utils";
import CrmTaskOverview from "@/components/crm/CrmTaskOverview";

const filters = [
  ["ALL", "Barchasi"],
  ["MY", "Menga biriktirilgan"],
  ["NEW", "Yangi"],
  ["IN_PROGRESS", "Jarayonda"],
  ["WAITING", "Kutilmoqda"],
  ["OVERDUE", "Kechikkan"],
  ["CRITICAL", "Kritik"],
  ["CLOSED", "Yopilgan"],
];

const priorityStyle: Record<string, string> = {
  LOW: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  NORMAL: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  HIGH: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  CRITICAL: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export default function CrmInbox({
  initialTickets,
  agents,
  initialTasks,
  initialNotifications,
  currentUserId,
  nowIso,
}: {
  initialTickets: any[];
  agents: any[];
  initialTasks: any[];
  initialNotifications: any[];
  currentUserId: string;
  nowIso: string;
}) {
  const [active, setActive] = useState("ALL");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [assignee, setAssignee] = useState("ALL");
  const [date, setDate] = useState("");
  const summary = useMemo(
    () => ({
      open: initialTickets.filter((t) => isOpenStatus(t.status)).length,
      newToday: initialTickets.filter(
        (t) => uzDateKey(t.createdAt) === uzDateKey(nowIso),
      ).length,
      inProgress: initialTickets.filter((t) => t.status === "IN_PROGRESS")
        .length,
      waiting: initialTickets.filter((t) => t.status === "WAITING").length,
      overdue: initialTickets.filter((t) => isOverdue(t, nowIso)).length,
      critical: initialTickets.filter(
        (t) => t.priority === "CRITICAL" && isOpenStatus(t.status),
      ).length,
    }),
    [initialTickets, nowIso],
  );
  const rows = useMemo(
    () =>
      initialTickets.filter((t) => {
        const q = search.toLowerCase().trim();
        const searchable =
          `${ticketPublicId(t)} ${t.callerName || ""} ${t.callerPhone || ""} ${t.orderId || ""} ${t.problem || ""}`.toLowerCase();
        const activeMatch =
          active === "ALL" ||
          (active === "MY"
            ? t.assignedTo?._id === currentUserId && isOpenStatus(t.status)
            : active === "NEW"
              ? ["NEW", "OPEN"].includes(t.status)
              : active === "OVERDUE"
                ? isOverdue(t, nowIso)
                : active === "CRITICAL"
                  ? t.priority === "CRITICAL" && isOpenStatus(t.status)
                  : active === "CLOSED"
                    ? ["RESOLVED", "CLOSED"].includes(t.status)
                    : t.status === active);
        return (
          activeMatch &&
          (!q || searchable.includes(q)) &&
          (category === "ALL" || t.category === category) &&
          (priority === "ALL" || t.priority === priority) &&
          (assignee === "ALL" ||
            (assignee === "ME"
              ? t.assignedTo?._id === currentUserId
              : t.assignedTo?._id === assignee)) &&
          (!date || new Date(t.createdAt).toISOString().slice(0, 10) === date)
        );
      }),
    [
      initialTickets,
      active,
      search,
      category,
      priority,
      assignee,
      date,
      currentUserId,
      nowIso,
    ],
  );

  const cards = [
    ["Ochiq", summary.open, MessageSquareText, "text-blue-600 bg-blue-500/10"],
    [
      "Bugun yangi",
      summary.newToday,
      Inbox,
      "text-violet-600 bg-violet-500/10",
    ],
    [
      "Jarayonda",
      summary.inProgress,
      UserRoundCheck,
      "text-cyan-600 bg-cyan-500/10",
    ],
    ["Kutilmoqda", summary.waiting, Clock3, "text-amber-600 bg-amber-500/10"],
    [
      "Kechikkan",
      summary.overdue,
      AlertTriangle,
      "text-rose-600 bg-rose-500/10",
    ],
    ["Kritik", summary.critical, Flame, "text-red-600 bg-red-500/10"],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-600 dark:text-blue-400">
            Customer Support CRM
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Murojaatlar inbox’i
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Javobsiz va kechikkan muammolarni bir joydan nazorat qiling.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            nativeButton={false}
            variant="outline"
            className="h-10 rounded-xl"
            render={<Link href="/crm/analytics" />}
          >
            Analytics
          </Button>
          <Button
            nativeButton={false}
            className="h-10 rounded-xl bg-brand-blue text-white hover:bg-brand-blue-hover"
            render={<Link href="/crm/new" />}
          >
            <Plus /> Ticket qo‘shish
          </Button>
        </div>
      </div>
      <CrmTaskOverview initialTasks={initialTasks} initialNotifications={initialNotifications} currentUserId={currentUserId} nowIso={nowIso} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {cards.map(([label, value, Icon, style]) => (
          <div key={label} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div
              className={cn(
                "mb-3 flex h-9 w-9 items-center justify-center rounded-xl",
                style,
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-3 sm:p-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition",
                  active === key
                    ? "bg-brand-blue text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {key === "MY" && <UserCheck className="h-3.5 w-3.5" />}
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Mijoz, telefon, Order ID, Ticket ID..."
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v || "ALL")}
            >
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Kategoriya">
                  {category === "ALL"
                    ? "Kategoriya"
                    : CRM_CATEGORY_LABELS[category]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Barchasi</SelectItem>
                {Object.entries(CRM_CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={assignee}
              onValueChange={(v) => setAssignee(v || "ALL")}
            >
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Operator">
                  {assignee === "ALL"
                    ? "Operator"
                    : assignee === "ME"
                      ? "Menga biriktirilgan"
                      : agents.find((a) => a._id === assignee)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Barchasi</SelectItem>
                <SelectItem value="ME">Menga biriktirilgan</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v || "ALL")}
            >
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Muhimlik">
                  {priority === "ALL"
                    ? "Muhimlik"
                    : CRM_PRIORITY_LABELS[priority]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Barchasi</SelectItem>
                {Object.entries(CRM_PRIORITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Yaratilgan sana"
              className="h-10 rounded-xl"
            />
          </div>
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                {[
                  "Ticket",
                  "Mijoz",
                  "Order",
                  "Kategoriya",
                  "Operator",
                  "Muhimlik",
                  "Status",
                  "Yaratilgan",
                  "Ochiq vaqt",
                ].map((h) => (
                  <th key={h} className="px-4 py-3 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={t._id}
                  className={cn(
                    "border-t transition hover:bg-muted/40",
                    isOverdue(t, nowIso) && "bg-rose-500/[.035]",
                  )}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/crm/tickets/${t._id}`}
                      className="font-bold text-blue-700 hover:underline dark:text-blue-300"
                    >
                      {ticketPublicId(t)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">
                      {t.callerName || "Noma'lum"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatUzPhone(t.callerPhone)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs">{t.orderId || "—"}</td>
                  <td className="max-w-40 px-4 py-3 text-xs">
                    {CRM_CATEGORY_LABELS[t.category || "OTHER"]}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t.assignedTo?.name || (
                      <span className="text-amber-600">Navbatda</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-lg px-2 py-1 text-[10px] font-bold",
                        priorityStyle[t.priority || "NORMAL"],
                      )}
                    >
                      {CRM_PRIORITY_LABELS[t.priority || "NORMAL"]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-lg px-2 py-1 text-[10px] font-bold",
                        isOverdue(t, nowIso)
                          ? "bg-rose-500/15 text-rose-600"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {isOverdue(t, nowIso)
                        ? "Kechikkan"
                        : CRM_STATUS_LABELS[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatUzDateTime(t.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold">
                    {formatDuration(t.createdAt, t.resolvedAt || nowIso)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y lg:hidden">
          {rows.map((t) => (
            <Link
              key={t._id}
              href={`/crm/tickets/${t._id}`}
              className="block p-4 active:bg-muted"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-blue-600">
                    {ticketPublicId(t)}
                  </p>
                  <p className="mt-1 font-semibold">
                    {t.callerName || "Noma'lum"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatUzPhone(t.callerPhone)} · {t.orderId || "Order yo'q"}
                  </p>
                </div>
                <span
                  className={cn(
                    "h-fit rounded-lg px-2 py-1 text-[10px] font-bold",
                    isOverdue(t, nowIso)
                      ? "bg-rose-500/15 text-rose-600"
                      : priorityStyle[t.priority || "NORMAL"],
                  )}
                >
                  {isOverdue(t, nowIso)
                    ? "Kechikkan"
                    : CRM_PRIORITY_LABELS[t.priority || "NORMAL"]}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm">{t.problem}</p>
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>{CRM_STATUS_LABELS[t.status]}</span>
                <span>
                  {formatDuration(t.createdAt, t.resolvedAt || nowIso)}
                </span>
              </div>
            </Link>
          ))}
        </div>
        {!rows.length && (
          <div className="px-4 py-16 text-center">
            <Inbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">Ticket topilmadi</p>
            <p className="text-sm text-muted-foreground">
              Filter yoki qidiruvni o‘zgartirib ko‘ring.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
