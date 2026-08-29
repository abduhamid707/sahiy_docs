"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Phone, CheckCircle2, Save, Inbox, PhoneIncoming } from "lucide-react";
import Link from "next/link";
import { getTicketTier } from "@/lib/ticketStatus";
import { TICKET_TIER_LABELS, TicketTier } from "@/lib/constants";

const getStatusColor = (tier: TicketTier) => {
  switch (tier) {
    case "OPEN": return "bg-status-open text-white";
    case "WARNING": return "bg-status-warning text-black";
    case "OVERDUE": return "bg-status-overdue text-white animate-pulse";
    case "RESOLVED": return "bg-status-resolved text-white";
    default: return "bg-slate-500 text-white";
  }
};

function toDatetimeLocal(date: string) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default function TicketDetail({ ticket, agents, canManage, currentUserId, canClaim }: { ticket: any, agents: any[], canManage: boolean, currentUserId?: string, canClaim?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [assignedToId, setAssignedToId] = useState(ticket.assignedTo?._id);
  const [claimed, setClaimed] = useState(false);
  const [problem, setProblem] = useState(ticket.problem);
  const [notes, setNotes] = useState(ticket.notes || "");
  const [deadlineAt, setDeadlineAt] = useState(toDatetimeLocal(ticket.deadlineAt));
  const [recordingUrl, setRecordingUrl] = useState(ticket.recording?.url || "");
  const [resolutionNote, setResolutionNote] = useState(ticket.resolutionNote || "");

  const tier = getTicketTier(ticket);
  const isResolved = ticket.status === "RESOLVED";
  const isUnassigned = !ticket.assignedTo;
  const showClaimPanel = isUnassigned && canClaim && !canManage && !claimed;

  const handleClaimSelf = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket._id}/reassign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: currentUserId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Xatolik yuz berdi");
      setClaimed(true);
      toast.success("Ticket o'zingizga olindi");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem, notes, deadlineAt, recordingUrl: recordingUrl || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Saqlashda xatolik yuz berdi");
      toast.success("Ticket yangilandi");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isResolved ? "OPEN" : "RESOLVED", resolutionNote }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Xatolik yuz berdi");
      toast.success(isResolved ? "Ticket qayta ochildi" : "Ticket hal qilindi deb belgilandi");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async (newAgentId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket._id}/reassign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: newAgentId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Qayta biriktirishda xatolik yuz berdi");
      setAssignedToId(newAgentId);
      toast.success("Ticket qayta biriktirildi");
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
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-foreground tracking-tight">{ticket.callerName || "Noma'lum"}</h1>
            <Badge className={`${getStatusColor(tier)} text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border-none shadow-sm`}>
              {TICKET_TIER_LABELS[tier]}
            </Badge>
          </div>
          <p className="text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
            <Phone className="h-3.5 w-3.5" /> {ticket.callerPhone}
            {ticket.origin === "PBX_WEBHOOK" && (
              <span className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 ml-2">
                <PhoneIncoming className="h-3.5 w-3.5" /> Avtomatik qo'ng'iroqdan
              </span>
            )}
          </p>
        </div>
      </div>

      {showClaimPanel && (
        <Card className="rounded-[2.5rem] border-border shadow-xl shadow-slate-900/5 dark:shadow-none overflow-hidden bg-card">
          <CardContent className="flex flex-col items-center text-center gap-4 px-8 py-12">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Inbox className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-black text-foreground">Bu ticket hali hech kimga biriktirilmagan</p>
              <p className="text-muted-foreground font-medium mt-1">Muammoni yozib, hal qilishni boshlash uchun uni o'zingizga oling.</p>
            </div>
            <Button
              onClick={handleClaimSelf}
              disabled={loading}
              className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
            >
              O'zimga olish
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className={cn("rounded-[2.5rem] border-border shadow-xl shadow-slate-900/5 dark:shadow-none overflow-hidden bg-card", showClaimPanel && "hidden")}>
        <CardHeader className="bg-muted/50 border-b border-border px-8 py-6">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Muammo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-8 py-6 sm:py-8">
          <div className="space-y-3">
            <Textarea
              className="min-h-[120px] rounded-3xl border-border bg-muted/50 focus:bg-card font-medium p-4"
              value={problem}
              onChange={e => setProblem(e.target.value)}
              disabled={isResolved}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-sm font-bold text-foreground ml-1">Hal qilish muddati</Label>
              <Input
                type="datetime-local"
                className="h-12 rounded-2xl border-border bg-muted/50 focus:bg-card font-medium"
                value={deadlineAt}
                onChange={e => setDeadlineAt(e.target.value)}
                disabled={isResolved}
              />
            </div>

            {canManage && (
              <div className="space-y-3">
                <Label className="text-sm font-bold text-foreground ml-1">Xodim</Label>
                <Select value={assignedToId} onValueChange={(val) => val && handleReassign(val)} disabled={loading}>
                  <SelectTrigger className="h-12 rounded-2xl border-border bg-muted/50 font-medium">
                    <SelectValue placeholder="Xodim tanlang">
                      {agents.find((a) => a._id === assignedToId)?.name || "Xodim tanlang"}
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
            <Label className="text-sm font-bold text-foreground ml-1">Izoh</Label>
            <Textarea
              className="min-h-[80px] rounded-3xl border-border bg-muted/50 focus:bg-card font-medium p-4"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={isResolved}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold text-foreground ml-1">Qo'ng'iroq yozuvi</Label>
            {ticket.recording?.url ? (
              <audio controls src={ticket.recording.url} className="w-full rounded-xl" />
            ) : (
              <p className="text-sm text-muted-foreground">Hali yozuv biriktirilmagan.</p>
            )}
            <Input
              placeholder="Yozuv linkini kiriting yoki yangilang"
              className="h-11 rounded-xl border-border bg-muted/50 font-medium"
              value={recordingUrl}
              onChange={e => setRecordingUrl(e.target.value)}
              disabled={isResolved}
            />
          </div>

          {!isResolved && (
            <div className="pt-2">
              <Button
                onClick={handleSave}
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold active:scale-95 transition-all"
              >
                <Save className="mr-2 h-4 w-4" /> Saqlash
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={cn("rounded-[2.5rem] border-border shadow-xl shadow-slate-900/5 dark:shadow-none overflow-hidden bg-card", showClaimPanel && "hidden")}>
        <CardHeader className="bg-muted/50 border-b border-border px-8 py-6">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Yakunlash</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-8 py-6 sm:py-8">
          {!isResolved && (
            <Textarea
              placeholder="Muammo qanday hal qilinganini yozing (ixtiyoriy)..."
              className="min-h-[80px] rounded-3xl border-border bg-muted/50 focus:bg-card font-medium p-4"
              value={resolutionNote}
              onChange={e => setResolutionNote(e.target.value)}
            />
          )}
          {isResolved && ticket.resolutionNote && (
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-2xl p-4">{ticket.resolutionNote}</p>
          )}
          <Button
            onClick={handleResolve}
            disabled={loading}
            variant={isResolved ? "outline" : "default"}
            className={cn(
              "w-full h-14 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all",
              !isResolved && "bg-status-resolved hover:opacity-90 text-white shadow-xl"
            )}
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            {isResolved ? "Qayta ochish" : "Hal qilindi deb belgilash"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
