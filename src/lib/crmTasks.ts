export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
export const TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const;

export const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: "Bajarish kerak",
  IN_PROGRESS: "Jarayonda",
  DONE: "Bajarildi",
  CANCELLED: "Bekor qilindi",
};

export function taskUrgency(deadlineAt: string | Date, status?: string, now = new Date()) {
  if (["DONE", "CANCELLED"].includes(status || "")) return "DONE";
  const remaining = new Date(deadlineAt).getTime() - now.getTime();
  if (remaining <= 0) return "OVERDUE";
  if (remaining <= 60 * 60 * 1000) return "ONE_HOUR";
  if (remaining <= 6 * 60 * 60 * 1000) return "SIX_HOURS";
  if (remaining <= 24 * 60 * 60 * 1000) return "TODAY";
  return "NORMAL";
}

export function taskUrgencyScore(task: { deadlineAt: string | Date; status?: string; priority?: string }, now = new Date()) {
  const urgency = taskUrgency(task.deadlineAt, task.status, now);
  const urgencyScore: Record<string, number> = { OVERDUE: 0, ONE_HOUR: 1, SIX_HOURS: 2, TODAY: 3, NORMAL: 4, DONE: 5 };
  const priorityScore: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
  return urgencyScore[urgency] * 10 + (priorityScore[task.priority || "NORMAL"] ?? 2);
}

export function taskMatchesFilter(
  task: {
    assignedTo?: { _id?: string } | string | null;
    deadlineAt: string | Date;
    status?: string;
    priority?: string;
    sentEvents?: unknown[];
  },
  filter: string,
  currentUserId: string,
  now = new Date(),
) {
  const urgency = taskUrgency(task.deadlineAt, task.status, now);
  const assignedToId = typeof task.assignedTo === "string" ? task.assignedTo : task.assignedTo?._id;
  if (filter === "MY") return assignedToId === currentUserId && urgency !== "DONE";
  if (filter === "OVERDUE") return urgency === "OVERDUE";
  if (filter === "HOUR") return urgency === "ONE_HOUR";
  if (filter === "TODAY") return ["ONE_HOUR", "SIX_HOURS", "TODAY"].includes(urgency);
  if (filter === "CRITICAL") return task.priority === "CRITICAL" && urgency !== "DONE";
  if (filter === "REMINDED") return (task.sentEvents || []).length > 0 && urgency !== "DONE";
  return urgency !== "DONE";
}

export function taskTimeLabel(deadlineAt: string | Date, status?: string, now = new Date()) {
  if (status === "DONE") return "Bajarildi";
  if (status === "CANCELLED") return "Bekor qilindi";
  const diff = new Date(deadlineAt).getTime() - now.getTime();
  const abs = Math.abs(diff);
  const minutes = Math.max(1, Math.round(abs / 60_000));
  const amount = minutes < 60 ? `${minutes} daqiqa` : minutes < 1440 ? `${Math.round(minutes / 60)} soat` : `${Math.round(minutes / 1440)} kun`;
  return diff < 0 ? `${amount} kechikdi` : `${amount} qoldi`;
}
