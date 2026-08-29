"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, User as UserIcon, Inbox } from "lucide-react";
import { toast } from "sonner";
import { getTicketTier, formatDeadline } from "@/lib/ticketStatus";
import { TICKET_TIER_LABELS, TicketTier } from "@/lib/constants";

const getStatusColor = (tier: TicketTier) => {
  switch (tier) {
    case "OPEN": return "bg-status-open hover:opacity-90 text-white";
    case "WARNING": return "bg-status-warning hover:opacity-90 text-black";
    case "OVERDUE": return "bg-status-overdue hover:opacity-90 text-white animate-pulse";
    case "RESOLVED": return "bg-status-resolved hover:opacity-90 text-white";
    default: return "bg-slate-500 text-white";
  }
};

export default function TicketsTable({ initialTickets, agents, canManage, currentUserId, canClaim }: { initialTickets: any[], agents: any[], canManage: boolean, currentUserId?: string, canClaim?: boolean }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | OPEN | RESOLVED
  const [tierFilter, setTierFilter] = useState("ALL"); // ALL | OPEN | WARNING | OVERDUE | RESOLVED
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const tickets = useMemo(() => {
    return initialTickets
      .map(t => ({ ...t, tier: getTicketTier(t) }))
      .filter(t => statusFilter === "ALL" || t.status === statusFilter)
      .filter(t => tierFilter === "ALL" || t.tier === tierFilter);
  }, [initialTickets, statusFilter, tierFilter]);

  const handleClaim = async (ticketId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId) return;
    setClaimingId(ticketId);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/reassign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: currentUserId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Xatolik yuz berdi");
      toast.success("Ticket o'zingizga olindi");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
          <SelectTrigger className="w-[200px] h-11 rounded-xl border-border bg-card shadow-sm font-bold text-xs">
            <SelectValue placeholder="Holat">
              {{ ALL: "Barchasi", OPEN: "Hal qilinmadi", RESOLVED: "Hal qilindi" }[statusFilter]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border bg-card shadow-2xl">
            <SelectItem value="ALL" className="rounded-xl text-xs font-bold">Barchasi</SelectItem>
            <SelectItem value="OPEN" className="rounded-xl text-xs font-bold">Hal qilinmadi</SelectItem>
            <SelectItem value="RESOLVED" className="rounded-xl text-xs font-bold">Hal qilindi</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tierFilter} onValueChange={(v) => setTierFilter(v || "ALL")}>
          <SelectTrigger className="w-[200px] h-11 rounded-xl border-border bg-card shadow-sm font-bold text-xs">
            <SelectValue placeholder="Daraja">
              {tierFilter === "ALL" ? "Barcha darajalar" : TICKET_TIER_LABELS[tierFilter as TicketTier]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border bg-card shadow-2xl">
            <SelectItem value="ALL" className="rounded-xl text-xs font-bold">Barcha darajalar</SelectItem>
            {Object.entries(TICKET_TIER_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key} className="rounded-xl text-xs font-bold">{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobil kartochka ko'rinishi - kichik ekranlarda jadval o'rniga */}
      <div className="sm:hidden space-y-3">
        {tickets.length === 0 && (
          <div className="rounded-[2rem] border border-border bg-card text-center py-16 text-muted-foreground font-medium">
            Hech qanday ticket topilmadi
          </div>
        )}
        {tickets.map((ticket) => (
          <Link
            key={ticket._id}
            href={`/support/${ticket._id}`}
            className="block rounded-[2rem] border border-border bg-card p-5 shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-bold text-foreground">{ticket.callerName || "Noma'lum"}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mt-0.5">
                  <Phone className="h-3 w-3" /> {ticket.callerPhone}
                </div>
              </div>
              <Badge className={`${getStatusColor(ticket.tier)} text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border-none shadow-sm shrink-0`}>
                {TICKET_TIER_LABELS[ticket.tier as TicketTier]}
              </Badge>
            </div>
            <p className="text-sm text-foreground line-clamp-2 mb-3">{ticket.problem}</p>
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground border-t border-border pt-3">
              <span>{formatDeadline(ticket.deadlineAt)}</span>
              {!ticket.assignedTo ? (
                canClaim ? (
                  <Button
                    size="sm"
                    onClick={(e) => handleClaim(ticket._id, e)}
                    disabled={claimingId === ticket._id}
                    className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3"
                  >
                    O'zimga olish
                  </Button>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <Inbox className="h-3.5 w-3.5" /> Navbatda
                  </span>
                )
              ) : canManage ? (
                <span className="flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5" />
                  {ticket.assignedTo?.name || "—"}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden sm:block rounded-[2.5rem] border border-border bg-card shadow-xl shadow-slate-900/5 dark:shadow-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="h-14 px-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Qo'ng'iroq beruvchi</TableHead>
                <TableHead className="h-14 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Muammo</TableHead>
                {(canManage || canClaim) && <TableHead className="h-14 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Xodim</TableHead>}
                <TableHead className="h-14 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Muddat</TableHead>
                <TableHead className="h-14 px-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Holat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={(canManage || canClaim) ? 5 : 4} className="text-center py-16 text-muted-foreground font-medium">
                    Hech qanday ticket topilmadi
                  </TableCell>
                </TableRow>
              )}
              {tickets.map((ticket) => (
                <TableRow key={ticket._id} className="hover:bg-muted/50 border-border group transition-colors cursor-pointer">
                  <TableCell className="px-6 py-4" onClick={() => (window.location.href = `/support/${ticket._id}`)}>
                    <div>
                      <div className="text-sm font-bold text-foreground">{ticket.callerName || "Noma'lum"}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Phone className="h-3 w-3" /> {ticket.callerPhone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 max-w-xs" onClick={() => (window.location.href = `/support/${ticket._id}`)}>
                    <div className="text-sm text-foreground truncate">{ticket.problem}</div>
                  </TableCell>
                  {(canManage || canClaim) && (
                    <TableCell className="py-4">
                      {!ticket.assignedTo ? (
                        canClaim ? (
                          <Button
                            size="sm"
                            onClick={(e) => handleClaim(ticket._id, e)}
                            disabled={claimingId === ticket._id}
                            className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3"
                          >
                            O'zimga olish
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                            <Inbox className="h-3.5 w-3.5" /> Navbatda
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <UserIcon className="h-3.5 w-3.5" />
                          {ticket.assignedTo?.name || "—"}
                        </div>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="py-4 text-xs font-medium text-muted-foreground" onClick={() => (window.location.href = `/support/${ticket._id}`)}>
                    {formatDeadline(ticket.deadlineAt)}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Link href={`/support/${ticket._id}`}>
                      <Badge className={`${getStatusColor(ticket.tier)} text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border-none shadow-sm`}>
                        {TICKET_TIER_LABELS[ticket.tier as TicketTier]}
                      </Badge>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
