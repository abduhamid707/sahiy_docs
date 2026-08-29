"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

function defaultDeadline() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000); // ertaga shu vaqt
  d.setSeconds(0, 0);
  // datetime-local input uchun mahalliy vaqt formatida kerak
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default function NewTicketForm({ agents, canAssign }: { agents: any[], canAssign: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    callerName: "",
    callerPhone: "",
    problem: "",
    notes: "",
    deadlineAt: defaultDeadline(),
    assignedTo: "",
    recordingUrl: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.callerPhone.trim() || !formData.problem.trim()) {
      toast.error("Telefon raqami va muammo tavsifi kiritilishi shart");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          assignedTo: formData.assignedTo || undefined,
          recordingUrl: formData.recordingUrl || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ticket yaratishda xatolik yuz berdi");
      }

      toast.success("Ticket muvaffaqiyatli yaratildi");
      router.push("/support");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-3xl">
      <div className="flex items-center gap-6">
        <Link
          href="/support"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "h-12 w-12 rounded-2xl bg-card border border-border shadow-sm text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-muted transition-all active:scale-95"
          )}
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Yangi ticket</h1>
          <p className="text-muted-foreground font-medium">Qo'ng'iroqdan keyin muammoni yozib qoldiring.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="rounded-[2.5rem] border-border shadow-xl shadow-slate-900/5 dark:shadow-none overflow-hidden bg-card">
          <CardHeader className="bg-muted/50 border-b border-border px-8 py-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Qo'ng'iroq ma'lumotlari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-4 sm:px-8 py-6 sm:py-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-bold text-foreground ml-1">Qo'ng'iroq beruvchi ismi</Label>
                <Input
                  placeholder="Masalan: Aziz aka"
                  className="h-12 rounded-2xl border-border bg-muted/50 focus:bg-card font-medium"
                  value={formData.callerName}
                  onChange={e => setFormData(prev => ({ ...prev, callerName: e.target.value }))}
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-bold text-foreground ml-1">Telefon raqami</Label>
                <Input
                  required
                  placeholder="+998 90 123 45 67"
                  className="h-12 rounded-2xl border-border bg-muted/50 focus:bg-card font-medium"
                  value={formData.callerPhone}
                  onChange={e => setFormData(prev => ({ ...prev, callerPhone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold text-foreground ml-1">Muammo nima?</Label>
              <Textarea
                required
                placeholder="Foydalanuvchining muammosini batafsil yozing..."
                className="min-h-[140px] rounded-3xl border-border bg-muted/50 focus:bg-card font-medium p-4"
                value={formData.problem}
                onChange={e => setFormData(prev => ({ ...prev, problem: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-bold text-foreground ml-1">Hal qilish muddati</Label>
                <Input
                  required
                  type="datetime-local"
                  className="h-12 rounded-2xl border-border bg-muted/50 focus:bg-card font-medium"
                  value={formData.deadlineAt}
                  onChange={e => setFormData(prev => ({ ...prev, deadlineAt: e.target.value }))}
                />
              </div>

              {canAssign && (
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-foreground ml-1">Xodimga biriktirish</Label>
                  <Select
                    value={formData.assignedTo}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, assignedTo: val || "" }))}
                  >
                    <SelectTrigger className="h-12 rounded-2xl border-border bg-muted/50 font-medium">
                      <SelectValue placeholder="O'zimga (default)">
                        {formData.assignedTo ? agents.find(a => a._id === formData.assignedTo)?.name : "O'zimga (default)"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border bg-card shadow-2xl">
                      {agents.map((a) => (
                        <SelectItem key={a._id} value={a._id} className="rounded-xl text-sm font-medium">
                          {a.name} ({a.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold text-foreground ml-1">Qo'ng'iroq yozuvi (ixtiyoriy)</Label>
              <Input
                placeholder="Ovozli yozuv linki (agar mavjud bo'lsa)"
                className="h-12 rounded-2xl border-border bg-muted/50 focus:bg-card font-medium"
                value={formData.recordingUrl}
                onChange={e => setFormData(prev => ({ ...prev, recordingUrl: e.target.value }))}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold text-foreground ml-1">Qo'shimcha izoh</Label>
              <Textarea
                placeholder="Ixtiyoriy izohlar..."
                className="min-h-[80px] rounded-3xl border-border bg-muted/50 focus:bg-card font-medium p-4"
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="pt-4 border-t border-border">
              <Button
                type="submit"
                className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:bg-muted disabled:shadow-none disabled:text-muted-foreground"
                disabled={loading}
              >
                {loading ? "Saqlanmoqda..." : "Ticketni saqlash"}
                <Save className="ml-3 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
