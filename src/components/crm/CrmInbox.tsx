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
import { toast } from "sonner";
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
  CRM_PRIORITIES,
  CRM_PRIORITY_LABELS,
  CRM_STATUSES,
  CRM_STATUS_LABELS,
  formatDuration,
  formatUzDateTime,
  formatUzPhone,
  normalizeUzPhone,
  isOpenStatus,
  isOverdue,
  ticketPublicId,
  uzDateKey,
  computeTicketStats,
} from "@/lib/crm";
import { cn } from "@/lib/utils";

import CreateTicketModal from "@/components/crm/CreateTicketModal";
import ExecutiveReportModal from "@/components/crm/ExecutiveReportModal";

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

function CreateTicketControl({
  agents,
  canAssign,
  onSuccess,
}: {
  agents: any[];
  canAssign: boolean;
  onSuccess: (newTicket: any) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        className="h-10 rounded-xl bg-brand-blue text-white hover:bg-brand-blue-hover"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="mr-1 h-4 w-4" /> Ticket qo‘shish
      </Button>
      <CreateTicketModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        agents={agents}
        canAssign={canAssign}
        onSuccess={onSuccess}
      />
    </>
  );
}

export default function CrmInbox({
  initialTickets,
  agents,
  currentUserId,
  canAssign,
  nowIso,
}: {
  initialTickets: any[];
  agents: any[];
  initialTasks: any[];
  initialNotifications: any[];
  currentUserId: string;
  canAssign: boolean;
  nowIso: string;
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [active, setActive] = useState("ALL");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [assignee, setAssignee] = useState("ALL");
  const [date, setDate] = useState("");
  const [updating, setUpdating] = useState("");
  const [executiveReportOpen, setExecutiveReportOpen] = useState(false);
  const stats = useMemo(() => computeTicketStats(tickets, nowIso), [tickets, nowIso]);
  const summary = useMemo(
    () => ({
      open: stats.openCount,
      newToday: stats.createdTodayCount,
      inProgress: stats.inProgressCount,
      waiting: stats.waitingCount,
      overdue: stats.overdueCount,
      critical: stats.criticalCount,
    }),
    [stats]
  );
  const rows = useMemo(
    () =>
      tickets.filter((t) => {
        const q = search.toLowerCase().trim();
        const searchable =
          `${ticketPublicId(t)} ${t.callerName || ""} ${t.callerPhone || ""} ${t.orderId || ""} ${t.problem || ""}`.toLowerCase();
        const compactQuery = q.replace(/[\s()+-]/g, "");
        const compactSearchable = searchable.replace(/[\s()+-]/g, "");
        const activeMatch =
          active === "ALL" ||
          (active === "OPEN"
            ? isOpenStatus(t.status)
            : active === "TODAY_CREATED"
              ? uzDateKey(t.createdAt) === uzDateKey(nowIso)
              : active === "MY"
            ? t.assignedTo?._id === currentUserId && isOpenStatus(t.status)
            : active === "NEW"
              ? ["NEW", "OPEN"].includes(t.status)
              : active === "OVERDUE"
                ? isOverdue(t, nowIso)
                : active === "CRITICAL"
                  ? t.priority === "CRITICAL" && isOpenStatus(t.status)
                  : active === "WAITING"
                    ? ["WAITING", "WAITING_CLIENT"].includes(t.status)
                  : active === "CLOSED"
                    ? ["RESOLVED", "CLOSED"].includes(t.status)
                    : t.status === active);
        return (
          activeMatch &&
          (!q || searchable.includes(q) || compactSearchable.includes(compactQuery)) &&
          (category === "ALL" || t.category === category) &&
          (priority === "ALL" || t.priority === priority) &&
          (assignee === "ALL" ||
            (assignee === "ME"
              ? t.assignedTo?._id === currentUserId
              : t.assignedTo?._id === assignee)) &&
          (!date || new Date(t.createdAt).toISOString().slice(0, 10) === date)
        );
      }).sort((a, b) => {
        const aOpen = isOpenStatus(a.status);
        const bOpen = isOpenStatus(b.status);
        if (aOpen !== bOpen) return aOpen ? -1 : 1;
        if (aOpen && bOpen) {
          const aDeadline = a.deadlineAt ? new Date(a.deadlineAt).getTime() : Number.POSITIVE_INFINITY;
          const bDeadline = b.deadlineAt ? new Date(b.deadlineAt).getTime() : Number.POSITIVE_INFINITY;
          if (aDeadline !== bDeadline) return aDeadline - bDeadline;
        }
        return new Date(b.resolvedAt || b.lastInteractionAt || b.createdAt).getTime() - new Date(a.resolvedAt || a.lastInteractionAt || a.createdAt).getTime();
      }),
    [
      tickets,
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

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} nusxalandi`);
    } catch { toast.error("Nusxalab bo‘lmadi"); }
  };

  const updateTicket = async (ticket: any, field: "status" | "priority" | "assignedTo", value: string) => {
    const key = `${ticket._id}:${field}`;
    const previous = tickets;
    const optimisticValue = field === "assignedTo" ? (value === "UNASSIGNED" ? null : agents.find((agent) => agent._id === value) || null) : value;
    setUpdating(key);
    setTickets((items) => items.map((item) => item._id === ticket._id ? { ...item, [field]: optimisticValue } : item));
    try {
      const response = await fetch(`/api/crm/tickets/${ticket._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: field === "assignedTo" && value === "UNASSIGNED" ? null : value }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "O‘zgarish saqlanmadi");
      setTickets((items) => items.map((item) => item._id === ticket._id ? { ...item, ...result } : item));
      toast.success(field === "status" ? "Status yangilandi" : field === "priority" ? "Muhimlik yangilandi" : "Operator yangilandi");
    } catch (error: any) {
      setTickets(previous);
      toast.error(error.message || "O‘zgarish saqlanmadi");
    } finally { setUpdating(""); }
  };

  const cards = [
    ["Ochiq", summary.open, MessageSquareText, "text-blue-600 bg-blue-500/10", "OPEN"],
    [
      "Bugun yangi",
      summary.newToday,
      Inbox,
      "text-violet-600 bg-violet-500/10",
      "TODAY_CREATED",
    ],
    [
      "Jarayonda",
      summary.inProgress,
      UserRoundCheck,
      "text-cyan-600 bg-cyan-500/10",
      "IN_PROGRESS",
    ],
    ["Kutilmoqda", summary.waiting, Clock3, "text-amber-600 bg-amber-500/10", "WAITING"],
    [
      "Kechikkan",
      summary.overdue,
      AlertTriangle,
      "text-rose-600 bg-rose-500/10",
      "OVERDUE",
    ],
    ["Kritik", summary.critical, Flame, "text-red-600 bg-red-500/10", "CRITICAL"],
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
          {canAssign && (
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              onClick={() => setExecutiveReportOpen(true)}
            >
              Rahbarga hisobot
            </Button>
          )}
          <Button
            nativeButton={false}
            variant="outline"
            className="h-10 rounded-xl"
            render={<Link href="/crm/analytics" />}
          >
            Analytics
          </Button>
          <CreateTicketControl
            agents={agents}
            canAssign={canAssign}
            onSuccess={(newTicket) => {
              setTickets((prev) => [newTicket, ...prev]);
            }}
          />
        </div>
      </div>
      <ExecutiveReportModal
        isOpen={executiveReportOpen}
        onClose={() => setExecutiveReportOpen(false)}
      />
      {/* Task nazorati hozircha admin va operator panellaridan yashirilgan. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {cards.map(([label, value, Icon, style, filterKey]) => (
          <button
            type="button"
            key={label}
            aria-pressed={active === filterKey}
            onClick={() => {
              setActive(filterKey);
              setSearch("");
              setCategory("ALL");
              setPriority("ALL");
              setAssignee("ALL");
              setDate("");
              document.getElementById("crm-ticket-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={cn(
              "rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              active === filterKey && "border-blue-500 ring-2 ring-blue-500/20",
            )}
          >
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
          </button>
        ))}
      </div>
      <div id="crm-ticket-table" className="scroll-mt-24 rounded-2xl border bg-card shadow-sm">
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
                  "Davomiyligi",
                ].map((h) => (
                  <th key={h} className="px-4 py-3 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                return (
                <tr
                  key={t._id}
                  className={cn(
                    "border-t transition hover:bg-muted/40",
                    isOverdue(t, nowIso) && "bg-rose-500/[.035]",
                  )}
                >
                  <td className="px-4 py-3">
                    <Link href={`/crm/tickets/${t._id}`} className="font-bold text-blue-700 hover:underline dark:text-blue-300">{ticketPublicId(t)}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/crm/tickets/${t._id}`} className="font-semibold hover:text-blue-600 hover:underline">{t.callerName || "Noma'lum"}</Link>
                    <button onClick={() => copyValue(normalizeUzPhone(t.callerPhone), "Telefon raqami")} className="block cursor-copy text-left text-xs text-muted-foreground hover:text-foreground" aria-label="Telefon raqamini nusxalash" title="Bosib bo‘shliqsiz nusxalash">{formatUzPhone(t.callerPhone)}</button>
                  </td>
                  <td className="px-4 py-3 text-xs">{t.orderId || "—"}</td>
                  <td className="max-w-40 px-4 py-3 text-xs">
                    {CRM_CATEGORY_LABELS[t.category || "OTHER"]}
                  </td>
                  <td className="min-w-36 px-2 py-3 text-xs">{canAssign ? <Select value={t.assignedTo?._id || "UNASSIGNED"} onValueChange={(value) => value && updateTicket(t, "assignedTo", value)} disabled={updating === `${t._id}:assignedTo`}><SelectTrigger className="h-8 w-36 rounded-md border-transparent bg-transparent px-2 text-xs hover:border-border hover:bg-muted"><SelectValue>{t.assignedTo?.name || "Navbatda"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="UNASSIGNED">Navbatda</SelectItem>{agents.map((agent) => <SelectItem key={agent._id} value={agent._id}>{agent.name}</SelectItem>)}</SelectContent></Select> : t.assignedTo?.name || <span className="text-amber-600">Navbatda</span>}</td>
                  <td className="px-4 py-3">
                    <Select value={t.priority || "NORMAL"} onValueChange={(value) => value && updateTicket(t, "priority", value)} disabled={updating === `${t._id}:priority`}><SelectTrigger className={cn("h-8 w-24 rounded-md border-transparent px-2 text-[10px] font-bold hover:border-border", priorityStyle[t.priority || "NORMAL"])}><SelectValue>{CRM_PRIORITY_LABELS[t.priority || "NORMAL"]}</SelectValue></SelectTrigger><SelectContent>{CRM_PRIORITIES.map((value) => <SelectItem key={value} value={value}>{CRM_PRIORITY_LABELS[value]}</SelectItem>)}</SelectContent></Select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-32 flex-col gap-1"><Select value={t.status === "OPEN" ? "NEW" : (t.status || "NEW")} onValueChange={(value) => value && updateTicket(t, "status", value)} disabled={updating === `${t._id}:status` || ["RESOLVED", "CLOSED"].includes(t.status)}><SelectTrigger className={cn("h-8 w-32 rounded-md border-transparent px-2 text-[10px] font-bold hover:border-border", ["RESOLVED", "CLOSED"].includes(t.status) ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-foreground")}><SelectValue>{CRM_STATUS_LABELS[t.status] || "Yangi"}</SelectValue></SelectTrigger><SelectContent>{CRM_STATUSES.filter((value) => !["RESOLVED", "CLOSED"].includes(value)).map((value) => <SelectItem key={value} value={value}>{CRM_STATUS_LABELS[value]}</SelectItem>)}</SelectContent></Select>{t.resolutionApprovalStatus === "PENDING" && <span className="px-2 text-[9px] font-bold text-blue-600">Admin tasdig‘ida</span>}{t.resolutionApprovalStatus === "RETURNED" && <span className="px-2 text-[9px] font-bold text-rose-600">Operatorga qaytarilgan</span>}{isOverdue(t, nowIso) && <span className="px-2 text-[9px] font-bold text-rose-600">SLA kechikkan</span>}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatUzDateTime(t.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold">
                    {formatDuration(t.createdAt, t.resolvedAt || nowIso)}
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
        <div className="divide-y lg:hidden">
          {rows.map((t) => {
            return <div key={t._id} className="p-4">
              <div className="flex justify-between gap-3"><div className="min-w-0"><Link href={`/crm/tickets/${t._id}`} className="text-xs font-bold text-blue-600 hover:underline">{ticketPublicId(t)}</Link><Link href={`/crm/tickets/${t._id}`} className="mt-1 block truncate font-semibold hover:text-blue-600">{t.callerName || "Noma'lum"}</Link><div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground"><button onClick={() => copyValue(normalizeUzPhone(t.callerPhone), "Telefon raqami")} className="cursor-copy truncate text-left" title="Bosib bo‘shliqsiz nusxalash">{formatUzPhone(t.callerPhone)}</button><span className="truncate">· {t.orderId || "Order yo'q"}</span></div></div><span className="shrink-0 text-xs font-semibold text-muted-foreground">{formatDuration(t.createdAt, t.resolvedAt || nowIso)}</span></div>
              <Link href={`/crm/tickets/${t._id}`} className="mt-3 block line-clamp-2 text-sm">{t.problem}</Link>
              <div className={cn("mt-3 grid gap-2", canAssign ? "grid-cols-3" : "grid-cols-2")}>
                {canAssign && <Select value={t.assignedTo?._id || "UNASSIGNED"} onValueChange={(value) => value && updateTicket(t, "assignedTo", value)} disabled={updating === `${t._id}:assignedTo`}><SelectTrigger className="h-9 min-w-0 rounded-md px-2 text-[10px]"><SelectValue>{t.assignedTo?.name || "Navbatda"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="UNASSIGNED">Navbatda</SelectItem>{agents.map((agent) => <SelectItem key={agent._id} value={agent._id}>{agent.name}</SelectItem>)}</SelectContent></Select>}
                <Select value={t.priority || "NORMAL"} onValueChange={(value) => value && updateTicket(t, "priority", value)} disabled={updating === `${t._id}:priority`}><SelectTrigger className={cn("h-9 min-w-0 rounded-md px-2 text-[10px] font-bold", priorityStyle[t.priority || "NORMAL"])}><SelectValue>{CRM_PRIORITY_LABELS[t.priority || "NORMAL"]}</SelectValue></SelectTrigger><SelectContent>{CRM_PRIORITIES.map((value) => <SelectItem key={value} value={value}>{CRM_PRIORITY_LABELS[value]}</SelectItem>)}</SelectContent></Select>
                <Select value={t.status === "OPEN" ? "NEW" : (t.status || "NEW")} onValueChange={(value) => value && updateTicket(t, "status", value)} disabled={updating === `${t._id}:status` || ["RESOLVED", "CLOSED"].includes(t.status)}><SelectTrigger className="h-9 min-w-0 rounded-md px-2 text-[10px] font-bold"><SelectValue>{CRM_STATUS_LABELS[t.status] || "Yangi"}</SelectValue></SelectTrigger><SelectContent>{CRM_STATUSES.filter((value) => !["RESOLVED", "CLOSED"].includes(value)).map((value) => <SelectItem key={value} value={value}>{CRM_STATUS_LABELS[value]}</SelectItem>)}</SelectContent></Select>
              </div>
              {t.resolutionApprovalStatus === "PENDING" && <p className="mt-2 text-[10px] font-bold text-blue-600">Admin tasdig‘i kutilmoqda</p>}
              {t.resolutionApprovalStatus === "RETURNED" && <p className="mt-2 text-[10px] font-bold text-rose-600">Admin operatorga qaytardi</p>}
              {isOverdue(t, nowIso) && <p className="mt-2 text-[10px] font-bold text-rose-600">SLA muddati kechikkan</p>}
            </div>
          })}
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
