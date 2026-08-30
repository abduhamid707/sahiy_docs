"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, CheckCircle2, CirclePlus, Clock3, Loader2, RotateCcw, Send, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CRM_PRIORITY_LABELS, formatUzDateTime } from "@/lib/crm";
import { TASK_STATUS_LABELS, taskTimeLabel, taskUrgency, taskUrgencyScore } from "@/lib/crmTasks";
import { cn } from "@/lib/utils";

const urgencyStyle: Record<string, string> = {
  OVERDUE: "border-rose-400 bg-rose-500/10",
  ONE_HOUR: "border-red-300 bg-red-500/10",
  SIX_HOURS: "border-orange-300 bg-orange-500/10",
  TODAY: "border-amber-300 bg-amber-500/10",
  NORMAL: "bg-card",
  DONE: "bg-muted/40 opacity-80",
};

function localDateTimeAfter(hours: number) {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function CrmTaskPanel({ ticketId, initialTasks, agents, currentUser, nowIso, defaultAssigneeId }: any) {
  const router = useRouter();
  const initialAssignee = defaultAssigneeId || (currentUser.role === "SUPPORT" ? currentUser.id : agents[0]?._id) || "";
  const [tasks, setTasks] = useState(initialTasks);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyTask, setBusyTask] = useState("");
  const [submitTaskId, setSubmitTaskId] = useState("");
  const [resolutionTexts, setResolutionTexts] = useState<Record<string, string>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ title: "", description: "", assignedTo: initialAssignee, deadlineAt: localDateTimeAfter(24), priority: "NORMAL" });
  const canManage = ["SUPER_ADMIN", "ADMIN"].includes(currentUser.role) || currentUser.isLead;
  const sorted = useMemo(() => [...tasks].sort((a, b) => taskUrgencyScore(a, new Date(nowIso)) - taskUrgencyScore(b, new Date(nowIso)) || new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime()), [tasks, nowIso]);

  const createTask = async () => {
    if (!form.description.trim()) return toast.error("Izoh majburiy");
    if (!form.assignedTo) return toast.error("Mas’ul operatorni tanlang");
    setLoading(true);
    try {
      const response = await fetch(`/api/crm/tickets/${ticketId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, title: form.title.trim() || undefined, deadlineAt: form.deadlineAt ? new Date(form.deadlineAt).toISOString() : undefined, reminderMinutes: [60, 15] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTasks((items: any[]) => [...items, data]);
      setForm({ title: "", description: "", assignedTo: initialAssignee, deadlineAt: localDateTimeAfter(24), priority: "NORMAL" });
      setOpen(false);
      toast.success("Task yaratildi va operatorga yuborildi");
      window.dispatchEvent(new Event("crm-notifications-changed"));
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Task yaratilmadi");
    } finally { setLoading(false); }
  };

  const updateTask = async (taskId: string, payload: Record<string, string>, success: string) => {
    setBusyTask(taskId);
    try {
      const response = await fetch(`/api/crm/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTasks((items: any[]) => items.map((item) => item._id === taskId ? data : item));
      setSubmitTaskId("");
      toast.success(success);
      window.dispatchEvent(new Event("crm-notifications-changed"));
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Task yangilanmadi");
    } finally { setBusyTask(""); }
  };

  const submitForApproval = (task: any) => {
    const resolutionText = (resolutionTexts[task._id] || task.resolutionText || "").trim();
    if (resolutionText.length < 3) return toast.error("Mijozga yuboriladigan matnni yozing");
    updateTask(task._id, { action: "SUBMIT_FOR_APPROVAL", resolutionText }, "Task rahbar tasdig‘iga yuborildi");
  };

  const reviewTask = (task: any, action: "APPROVE" | "REJECT") => {
    const reviewComment = (reviewComments[task._id] || "").trim();
    if (action === "REJECT" && reviewComment.length < 3) return toast.error("Qaytarish sababini yozing");
    updateTask(task._id, { action, ...(reviewComment ? { reviewComment } : {}) }, action === "APPROVE" ? "Task tasdiqlandi va SMS qaydi yozildi" : "Task operatorga qaytarildi");
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex-row items-center justify-between border-b py-4">
        <div><CardTitle className="text-base">Operator tasklari</CardTitle><p className="mt-1 text-xs text-muted-foreground">Operator bajaradi, rahbar tasdiqlagandan keyin yopiladi</p></div>
        <Button size="sm" variant={open ? "outline" : "default"} onClick={() => setOpen((value) => !value)} className="rounded-xl"><CirclePlus />{open ? "Yopish" : "Task qo‘shish"}</Button>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {open && <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>Izoh *</Label><Textarea autoFocus required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Operator nima qilishi kerak?" className="min-h-24 rounded-xl" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Task nomi <span className="font-normal text-muted-foreground">(ixtiyoriy)</span></Label><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Bo‘sh qolsa: Mijoz muammosini hal qilish" className="rounded-xl" /></div>
          <div className="space-y-1.5"><Label>Mas’ul operator</Label><Select value={form.assignedTo} onValueChange={(value) => value && setForm({ ...form, assignedTo: value })}><SelectTrigger className="rounded-xl"><SelectValue>{agents.find((agent: any) => agent._id === form.assignedTo)?.name || "Operator"}</SelectValue></SelectTrigger><SelectContent>{agents.map((agent: any) => <SelectItem key={agent._id} value={agent._id}>{agent.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>SLA</Label><Input type="datetime-local" value={form.deadlineAt} onChange={(event) => setForm({ ...form, deadlineAt: event.target.value })} className="rounded-xl" /><div className="flex gap-1.5">{[[2,"2 soat"],[24,"1 kun"],[72,"3 kun"]].map(([hours,label]) => <button type="button" key={label} onClick={() => setForm({ ...form, deadlineAt: localDateTimeAfter(Number(hours)) })} className="rounded-md border px-2 py-1 text-[10px] font-semibold hover:bg-muted">{label}</button>)}</div></div>
          <div className="space-y-1.5"><Label>Muhimlik <span className="font-normal text-muted-foreground">(ixtiyoriy)</span></Label><Select value={form.priority} onValueChange={(value) => value && setForm({ ...form, priority: value })}><SelectTrigger className="rounded-xl"><SelectValue>{CRM_PRIORITY_LABELS[form.priority]}</SelectValue></SelectTrigger><SelectContent>{["LOW", "NORMAL", "HIGH", "CRITICAL"].map((priority) => <SelectItem key={priority} value={priority}>{CRM_PRIORITY_LABELS[priority]}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex items-end"><Button onClick={createTask} disabled={loading} className="w-full rounded-xl bg-brand-blue text-white hover:bg-brand-blue-hover">{loading ? <Loader2 className="animate-spin" /> : <AlarmClock />}Task yaratish</Button></div>
        </div>}

        {!sorted.length && <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">Bu ticketda task yo‘q.</div>}
        {sorted.map((task: any) => {
          const urgency = taskUrgency(task.deadlineAt, task.status, new Date(nowIso));
          const assigneeId = task.assignedTo?._id || task.assignedTo;
          const canSubmit = assigneeId === currentUser.id && !["PENDING_APPROVAL", "DONE", "CANCELLED"].includes(task.status);
          const busy = busyTask === task._id;
          return <div key={task._id} className={cn("rounded-2xl border p-4 transition", urgencyStyle[urgency], task.status === "PENDING_APPROVAL" && "border-blue-400 bg-blue-500/10")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1"><p className={cn("font-bold", task.status === "DONE" && "line-through")}>{task.title}</p>{task.description && <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>}</div>
              <span className={cn("rounded-lg px-2 py-1 text-[10px] font-bold", task.status === "PENDING_APPROVAL" ? "bg-blue-600 text-white" : urgency === "OVERDUE" || urgency === "ONE_HOUR" ? "bg-rose-600 text-white" : urgency === "SIX_HOURS" ? "bg-orange-500 text-white" : urgency === "TODAY" ? "bg-amber-400 text-black" : "bg-muted")}>{task.status === "PENDING_APPROVAL" ? "Tasdiq kutilmoqda" : taskTimeLabel(task.deadlineAt, task.status, new Date(nowIso))}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground"><span>{task.assignedTo?.name || "Operator"}</span><span>{formatUzDateTime(task.deadlineAt, true)}</span><span>{CRM_PRIORITY_LABELS[task.priority]}</span><span>{TASK_STATUS_LABELS[task.status]}</span></div>

            {task.reviewComment && task.status === "IN_PROGRESS" && <div className="mt-3 rounded-lg border border-rose-300 bg-rose-500/10 p-3 text-xs"><p className="font-bold text-rose-700 dark:text-rose-300">Rahbar qaytardi</p><p className="mt-1">{task.reviewComment}</p></div>}
            {task.resolutionText && task.status === "PENDING_APPROVAL" && <div className="mt-3 rounded-lg border border-blue-200 bg-background/70 p-3 text-xs"><p className="font-bold text-blue-700 dark:text-blue-300">Mijozga yuboriladigan matn</p><p className="mt-1 whitespace-pre-wrap">{task.resolutionText}</p></div>}

            {canSubmit && <div className="mt-3 border-t pt-3">{submitTaskId === task._id ? <div className="space-y-2"><Label>Mijozga ketadigan matn *</Label><Textarea value={resolutionTexts[task._id] ?? task.resolutionText ?? ""} onChange={(event) => setResolutionTexts((items) => ({ ...items, [task._id]: event.target.value }))} placeholder="Muammo qanday hal qilinganini mijozga tushunarli yozing..." className="min-h-24 rounded-xl" /><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setSubmitTaskId("")}>Bekor qilish</Button><Button size="sm" onClick={() => submitForApproval(task)} disabled={busy}><Send />Tasdiqqa yuborish</Button></div></div> : <div className="flex flex-wrap justify-end gap-2">{task.status === "TODO" && <Button variant="outline" size="sm" onClick={() => updateTask(task._id, { status: "IN_PROGRESS" }, "Task boshlandi")} disabled={busy}><Clock3 />Boshlash</Button>}<Button size="sm" onClick={() => setSubmitTaskId(task._id)} disabled={busy}><CheckCircle2 />Hal qildim</Button></div>}</div>}

            {task.status === "PENDING_APPROVAL" && canManage && <div className="mt-3 space-y-2 border-t pt-3"><Label>Rahbar izohi</Label><Textarea value={reviewComments[task._id] || ""} onChange={(event) => setReviewComments((items) => ({ ...items, [task._id]: event.target.value }))} placeholder="Tasdiqlashda ixtiyoriy, qaytarishda majburiy..." className="min-h-20 rounded-xl" /><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => reviewTask(task, "REJECT")} disabled={busy} className="border-rose-300 text-rose-700 hover:bg-rose-500/10"><RotateCcw />Operatorga qaytarish</Button><Button onClick={() => reviewTask(task, "APPROVE")} disabled={busy} className="bg-emerald-600 text-white hover:bg-emerald-700">{busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}Tasdiqlash</Button></div></div>}
            {task.status === "PENDING_APPROVAL" && !canManage && <p className="mt-3 flex items-center gap-2 border-t pt-3 text-xs font-semibold text-blue-600"><ShieldCheck className="h-4 w-4" />Rahbar tasdig‘i kutilmoqda. Bu paytda taskni yopib yoki o‘zgartirib bo‘lmaydi.</p>}
            {task.status === "DONE" && <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" />Rahbar tasdiqladi. Mijozga SMS yuborilgan deb qayd qilindi.</p>}
            {task.status === "CANCELLED" && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><XCircle className="h-4 w-4" />Task bekor qilingan.</p>}
          </div>;
        })}
      </CardContent>
    </Card>
  );
}
