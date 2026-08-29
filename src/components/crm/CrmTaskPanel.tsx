"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, Check, CirclePlus, Loader2 } from "lucide-react";
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
  DONE: "bg-muted/40 opacity-70",
};

export default function CrmTaskPanel({ ticketId, initialTasks, agents, currentUser, nowIso }: any) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignedTo: currentUser.id, deadlineAt: "", priority: "NORMAL" });
  const sorted = useMemo(() => [...tasks].sort((a, b) => taskUrgencyScore(a, new Date(nowIso)) - taskUrgencyScore(b, new Date(nowIso)) || new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime()), [tasks, nowIso]);

  const createTask = async () => {
    if (!form.title.trim() || !form.deadlineAt || !form.assignedTo) return toast.error("Task, operator va deadline majburiy");
    setLoading(true);
    try {
      const response = await fetch(`/api/crm/tickets/${ticketId}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, deadlineAt: new Date(form.deadlineAt).toISOString(), reminderMinutes: [60, 15] }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTasks((items: any[]) => [...items, data]);
      setForm({ title: "", description: "", assignedTo: currentUser.id, deadlineAt: "", priority: "NORMAL" });
      setOpen(false);
      toast.success("Task yaratildi va operatorga yuborildi");
      window.dispatchEvent(new Event("crm-notifications-changed"));
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Task yaratilmadi");
    } finally { setLoading(false); }
  };

  const updateStatus = async (taskId: string, status: string) => {
    const previous = tasks;
    setTasks((items: any[]) => items.map((item) => item._id === taskId ? { ...item, status } : item));
    try {
      const response = await fetch(`/api/crm/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTasks((items: any[]) => items.map((item) => item._id === taskId ? data : item));
      toast.success(status === "DONE" ? "Task bajarildi" : "Task statusi yangilandi");
    } catch (error: any) {
      setTasks(previous);
      toast.error(error.message || "Status saqlanmadi");
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex-row items-center justify-between border-b py-4">
        <div><CardTitle className="text-base">Operator tasklari</CardTitle><p className="mt-1 text-xs text-muted-foreground">Deadline bo‘yicha avtomatik tartiblanadi</p></div>
        <Button size="sm" variant={open ? "outline" : "default"} onClick={() => setOpen((value) => !value)} className="rounded-xl"><CirclePlus />{open ? "Yopish" : "Task qo‘shish"}</Button>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {open && <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>Task nomi *</Label><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Masalan: Mijozga qayta qo‘ng‘iroq qilish" className="rounded-xl" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Izoh</Label><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Operator uchun qisqa ko‘rsatma..." className="min-h-20 rounded-xl" /></div>
          <div className="space-y-1.5"><Label>Mas’ul operator *</Label><Select value={form.assignedTo} onValueChange={(value) => value && setForm({ ...form, assignedTo: value })}><SelectTrigger className="rounded-xl"><SelectValue>{agents.find((agent: any) => agent._id === form.assignedTo)?.name || "Operator"}</SelectValue></SelectTrigger><SelectContent>{agents.map((agent: any) => <SelectItem key={agent._id} value={agent._id}>{agent.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Deadline *</Label><Input type="datetime-local" value={form.deadlineAt} onChange={(event) => setForm({ ...form, deadlineAt: event.target.value })} className="rounded-xl" /></div>
          <div className="space-y-1.5"><Label>Muhimlik</Label><Select value={form.priority} onValueChange={(value) => value && setForm({ ...form, priority: value })}><SelectTrigger className="rounded-xl"><SelectValue>{CRM_PRIORITY_LABELS[form.priority]}</SelectValue></SelectTrigger><SelectContent>{["LOW", "NORMAL", "HIGH", "CRITICAL"].map((priority) => <SelectItem key={priority} value={priority}>{CRM_PRIORITY_LABELS[priority]}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex items-end"><Button onClick={createTask} disabled={loading} className="w-full rounded-xl bg-brand-blue text-white hover:bg-brand-blue-hover">{loading ? <Loader2 className="animate-spin" /> : <AlarmClock />}Yaratish va bildirish</Button></div>
        </div>}

        {!sorted.length && <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">Bu ticketda task yo‘q.</div>}
        {sorted.map((task: any) => {
          const urgency = taskUrgency(task.deadlineAt, task.status, new Date(nowIso));
          return <div key={task._id} className={cn("rounded-2xl border p-3 transition", urgencyStyle[urgency])}>
            <div className="flex items-start gap-3">
              <button onClick={() => updateStatus(task._id, task.status === "DONE" ? "TODO" : "DONE")} className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", task.status === "DONE" ? "border-emerald-600 bg-emerald-600 text-white" : "bg-background")} aria-label="Taskni bajarildi deb belgilash">{task.status === "DONE" && <Check className="h-4 w-4" />}</button>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className={cn("font-bold", task.status === "DONE" && "line-through")}>{task.title}</p><span className={cn("rounded-lg px-2 py-1 text-[10px] font-bold", urgency === "OVERDUE" || urgency === "ONE_HOUR" ? "bg-rose-600 text-white" : urgency === "SIX_HOURS" ? "bg-orange-500 text-white" : urgency === "TODAY" ? "bg-amber-400 text-black" : "bg-muted")}>{taskTimeLabel(task.deadlineAt, task.status, new Date(nowIso))}</span></div>
                {task.description && <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground"><span>{task.assignedTo?.name || "Operator"}</span><span>{formatUzDateTime(task.deadlineAt, true)}</span><span>{CRM_PRIORITY_LABELS[task.priority]}</span><span>{TASK_STATUS_LABELS[task.status]}</span></div>
              </div>
            </div>
          </div>;
        })}
      </CardContent>
    </Card>
  );
}
