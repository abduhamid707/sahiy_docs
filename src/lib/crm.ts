export const CRM_STATUSES = ["NEW", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"] as const;
export const CRM_PRIORITIES = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const;
export const CRM_CATEGORIES = ["DELIVERY", "DELIVERY_DELAY", "TRACKING", "NOT_RECEIVED", "WRONG_OR_MISSING", "REFUND_PAYMENT", "CARGO_PAYMENT", "CHINA_WAREHOUSE", "OTHER"] as const;
export const CRM_MESSAGE_TYPES = ["CUSTOMER_MESSAGE", "OPERATOR_RESPONSE", "INTERNAL_NOTE"] as const;

export const CRM_STATUS_LABELS: Record<string, string> = {
  OPEN: "Yangi",
  NEW: "Yangi",
  IN_PROGRESS: "Jarayonda",
  WAITING: "Kutilmoqda",
  RESOLVED: "Hal qilindi",
  CLOSED: "Yopildi",
};

export const CRM_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Past",
  NORMAL: "Oddiy",
  HIGH: "Yuqori",
  CRITICAL: "Kritik",
};

export const CRM_CATEGORY_LABELS: Record<string, string> = {
  DELIVERY: "Yetkazib berish bo'yicha",
  DELIVERY_DELAY: "Buyurtma kechikishi",
  TRACKING: "Tracking muammosi",
  NOT_RECEIVED: "Mahsulot kelmagan",
  WRONG_OR_MISSING: "Noto'g'ri / yetishmaydi",
  REFUND_PAYMENT: "Refund / to'lov",
  CARGO_PAYMENT: "Kargo uchun to'lov",
  CHINA_WAREHOUSE: "Xitoy ombori",
  OTHER: "Boshqa",
};

export function isOpenStatus(status: string) {
  return !["RESOLVED", "CLOSED"].includes(status);
}

export function isOverdue(
  ticket: { status: string; deadlineAt?: string | Date | null },
  now: string | Date | number = Date.now()
) {
  return (
    isOpenStatus(ticket.status) &&
    !!ticket.deadlineAt &&
    new Date(ticket.deadlineAt).getTime() < new Date(now).getTime()
  );
}

export function ticketPublicId(ticket: { ticketNumber?: string; _id?: unknown }) {
  return ticket.ticketNumber || `TKT-${String(ticket._id || "").slice(-6).toUpperCase()}`;
}

export function formatDuration(from: string | Date, to: string | Date = new Date()) {
  const minutes = Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 60000));
  if (minutes < 60) return `${minutes} daq`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat`;
  return `${Math.floor(hours / 24)} kun ${hours % 24} soat`;
}

const UZ_MONTHS = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];

function tashkentDate(value: string | Date) {
  return new Date(new Date(value).getTime() + 5 * 60 * 60 * 1000);
}

export function formatUzDateTime(value: string | Date, includeYear = false) {
  const date = tashkentDate(value);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = UZ_MONTHS[date.getUTCMonth()];
  const year = includeYear ? ` ${date.getUTCFullYear()}` : "";
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month}${year}, ${hour}:${minute}`;
}

export function uzDateKey(value: string | Date) {
  const date = tashkentDate(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function getTashkentStartOfToday(now: Date = new Date()): Date {
  const tashkentOffset = 5 * 60 * 60 * 1000;
  const tashkentNow = new Date(now.getTime() + tashkentOffset);
  return new Date(
    Date.UTC(
      tashkentNow.getUTCFullYear(),
      tashkentNow.getUTCMonth(),
      tashkentNow.getUTCDate()
    ) - tashkentOffset
  );
}

export function normalizeUzPhone(value?: string | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  let local = digits.startsWith("998") ? digits.slice(3) : digits;
  if (local.startsWith("0")) local = local.slice(1);
  return `+998${local.slice(0, 9)}`;
}

export function formatUzPhone(value?: string | null) {
  const normalized = normalizeUzPhone(value);
  if (!normalized) return "—";
  const local = normalized.slice(4);
  const groups = [local.slice(0, 2), local.slice(2, 5), local.slice(5, 7), local.slice(7, 9)].filter(Boolean);
  return groups.length ? `+998 ${groups.join(" ")}` : "+998";
}

export interface CrmTicketStats {
  openCount: number;
  createdTodayCount: number;
  inProgressCount: number;
  waitingCount: number;
  overdueCount: number;
  criticalCount: number;
}

export function computeTicketStats(
  tickets: Array<{
    status: string;
    createdAt?: string | Date;
    deadlineAt?: string | Date | null;
    priority?: string;
  }>,
  nowIso: string = new Date().toISOString()
): CrmTicketStats {
  const targetKey = uzDateKey(nowIso);
  return {
    openCount: tickets.filter((t) => isOpenStatus(t.status)).length,
    createdTodayCount: tickets.filter(
      (t) => t.createdAt && uzDateKey(t.createdAt) === targetKey
    ).length,
    inProgressCount: tickets.filter((t) => t.status === "IN_PROGRESS").length,
    waitingCount: tickets.filter((t) =>
      ["WAITING", "WAITING_CLIENT"].includes(t.status)
    ).length,
    overdueCount: tickets.filter((t) => isOverdue(t, nowIso)).length,
    criticalCount: tickets.filter(
      (t) => t.priority === "CRITICAL" && isOpenStatus(t.status)
    ).length,
  };
}
