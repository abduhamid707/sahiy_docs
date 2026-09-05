"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Phone, Clock, Plus, Search, RefreshCw, AudioLines, Copy, ExternalLink, AlertTriangle, ArrowRight, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreateTicketModal from "./CreateTicketModal";
import { toast } from "sonner";
import { formatPhone, formatCallDuration, cn } from "@/lib/utils";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function CrmCallsList({ initialCalls, agents, currentUserId, initialPeriod, initialFrom, initialTo }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [calls, setCalls] = useState(initialCalls);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "answered" | "missed" | "linked" | "unlinked">("all");
  const [period, setPeriod] = useState(initialPeriod || "today");
  const [customFrom, setCustomFrom] = useState(initialFrom || "");
  const [customTo, setCustomTo] = useState(initialTo || "");
  
  const [syncing, setSyncing] = useState(false);
  const [syncCountdown, setSyncCountdown] = useState(60);
  
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [prefillPhone, setPrefillPhone] = useState("");
  const [quickDetailOpen, setQuickDetailOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<any>(null);

  // Sync initialCalls update when router.refresh() gets new data
  useEffect(() => {
    setCalls(initialCalls);
  }, [initialCalls]);

  const pushPeriod = (p: string, from?: string, to?: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("period", p);
    if (from) params.set("from", from); else params.delete("from");
    if (to) params.set("to", to); else params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    if (val !== "custom") {
      pushPeriod(val);
    }
  };

  
  const handleMarkAsHandled = async (e: React.MouseEvent, callId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/support/calls/${callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'handled' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Qo'ng'iroq 'Javob berilgan' deb belgilandi");
        router.refresh();
      } else {
        toast.error("Xatolik yuz berdi");
      }
    } catch (e) {
      toast.error("Tarmoq xatosi");
    }
  };


  const applyCustomRange = () => {
    pushPeriod("custom", customFrom, customTo);
  };

  // Auto-sync in the background every 1 minute with countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSyncCountdown(prev => {
        if (prev <= 1) {
          // Trigger sync
          const doSync = async () => {
            try {
              const qs = searchParams?.toString() || "";
              await fetch(`/api/telephony/sync${qs ? '?' + qs : ''}`, { method: "POST" });
              router.refresh();
            } catch (e) {
              console.error("Auto sync failed", e);
            }
          };
          doSync();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router, searchParams]);

  const callFrequencies = useMemo(() => {
    const counts: Record<string, number> = {};
    calls.forEach((c: any) => {
      counts[c.phone] = (counts[c.phone] || 0) + 1;
    });
    return counts;
  }, [calls]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const qs = searchParams?.toString() || "";
      const res = await fetch(`/api/telephony/sync${qs ? '?' + qs : ''}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `${data.added} ta yangi qo'ng'iroq qo'shildi! ${data.autoLinked} tasi avto-biriktirildi.`);
        router.refresh();
        setSyncCountdown(60); // Reset timer
      } else {
        toast.error("Xatolik yuz berdi");
      }
    } catch (error) {
      toast.error("Tarmoq xatosi");
    }
    setSyncing(false);
  };

  const handleCreateTicket = (e: React.MouseEvent, callId: string, phone: string) => {
    e.stopPropagation();
    setSelectedCallId(callId);
    setPrefillPhone(phone);
    setTicketModalOpen(true);
  };

  const copyToClipboard = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success("Nusxalandi!");
  };

  const openQuickDetail = (call: any) => {
    setActiveCall(call);
    setQuickDetailOpen(true);
  };

  const filteredCalls = useMemo(() => {
    return calls.filter((c: any) => {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        c.phone.includes(searchLower) || 
        (c.ticketId?.ticketNumber?.toLowerCase().includes(searchLower)) ||
        (c.operator?.includes(searchLower));
      if (!matchesSearch) return false;

      if (filter === "answered" && c.status !== "answered") return false;
      if (filter === "missed" && c.status !== "missed") return false;
      if (filter === "linked" && !c.ticketId) return false;
      if (filter === "unlinked" && c.ticketId) return false;

      return true;
    });
  }, [calls, search, filter]);

  const counts = {
    all: calls.length,
    answered: calls.filter((c: any) => c.status === "answered").length,
    missed: calls.filter((c: any) => c.status === "missed").length,
    linked: calls.filter((c: any) => !!c.ticketId).length,
    unlinked: calls.filter((c: any) => !c.ticketId).length,
  };

  const tabs = [
    { id: "all", label: `Barchasi (${counts.all})` },
    { id: "answered", label: `Javob berilgan (${counts.answered})` },
    { id: "missed", label: `Missed (${counts.missed})` },
    { id: "linked", label: `Ticketli (${counts.linked})` },
    { id: "unlinked", label: `Ticketsiz (${counts.unlinked})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id as any)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                filter === t.id 
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[140px] h-9">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Davrni tanlang" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="today">Bugun</SelectItem>
                <SelectItem value="yesterday">Kecha</SelectItem>
                <SelectItem value="3days">Oxirgi 3 kun</SelectItem>
                <SelectItem value="4days">Oxirgi 4 kun</SelectItem>
                <SelectItem value="5days">Oxirgi 5 kun</SelectItem>
                <SelectItem value="custom">Qo'lda (Custom)</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {period === "custom" && (
            <div className="flex items-center gap-2">
              <Input 
                type="date" 
                className="h-9 w-[130px]" 
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
              />
              <span className="text-muted-foreground">-</span>
              <Input 
                type="date" 
                className="h-9 w-[130px]" 
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
              />
              <Button onClick={applyCustomRange} size="sm" variant="secondary" className="h-9">
                Qo'llash
              </Button>
            </div>
          )}

          <div className="relative flex-1 sm:w-64 min-w-[150px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Raqam, operator yoki ticket..." 
              className="pl-9 h-9" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          <Button onClick={handleSync} disabled={syncing || syncCountdown > 55} variant="outline" size="sm" className="shrink-0 h-9 w-[130px]">
            <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
            Sinxron {syncCountdown < 60 && `(${syncCountdown})`}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <tr>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Vaqt</th>
                <th className="px-4 py-3">Davomiyligi</th>
                <th className="px-4 py-3">Operator</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Chipta</th>
                <th className="px-4 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCalls.map((call: any) => {
                const isMissed = call.status === 'missed';
                const isUnlinkedMissed = isMissed && !call.ticketId;
                const freq = callFrequencies[call.phone] || 1;
                
                return (
                  <tr 
                    key={call._id} 
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => openQuickDetail(call)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 font-medium">
                          {formatPhone(call.phone) || call.phone}
                          <button 
                            onClick={(e) => copyToClipboard(e, call.phone)}
                            className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Nusxa olish"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {freq >= 3 && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20" title={`${freq} marta qo'ng'iroq qilgan`}>
                            {freq} marta
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(call.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {formatCallDuration(call.duration)} / Jami: {formatCallDuration(call.totalDuration)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {call.operator ? (
                        <div className="flex items-center gap-1">
                          {call.operator}
                          <button 
                            onClick={(e) => copyToClipboard(e, call.operator)}
                            className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                          call.status === 'answered' 
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" 
                            : call.status === 'handled'
                              ? "bg-blue-50 text-blue-700 ring-blue-600/20"
                              : "bg-red-50 text-red-700 ring-red-600/10"
                        )}>
                          {call.status === 'answered' ? 'Javob berilgan' : call.status === 'handled' ? 'Qaytarilgan' : "O'tkazib yuborilgan"}
                        </span>
                        {isUnlinkedMissed && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600">
                            <AlertTriangle className="h-3 w-3" />
                            Qayta aloqa kerak
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {call.ticketId ? (
                        <Link 
                          href={`/crm/tickets/${call.ticketId._id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 hover:bg-blue-100"
                        >
                          {call.ticketId.ticketNumber}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                      </td>
                                         <td className="px-4 py-3 text-right">
                        <div className="flex justify-end items-center gap-1">
                          {isMissed && !call.ticketId && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={(e) => handleMarkAsHandled(e, call._id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Javob berdim
                            </Button>
                          )}
                          {!call.ticketId ? (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={(e) => handleCreateTicket(e, call._id, call.phone)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Ticket
                            </Button>
                          ) : (
                            <Link 
                              href={`/crm/tickets/${call.ticketId._id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button size="sm" variant="ghost" className="h-8 gap-1 text-slate-600">
                                O'tish
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                  </tr>
                );
              })}
              {filteredCalls.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Qo'ng'iroqlar topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateTicketModal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        agents={agents}
        canAssign={true}
        linkedCallId={selectedCallId || undefined}
        prefillPhone={prefillPhone}
        onSuccess={() => {
          setTicketModalOpen(false);
          window.location.reload();
        }}
      />

      <Dialog open={quickDetailOpen} onOpenChange={setQuickDetailOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Qo'ng'iroq tafsilotlari</DialogTitle>
          </DialogHeader>
          {activeCall && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Telefon raqami</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatPhone(activeCall.phone) || activeCall.phone}</span>
                  <button onClick={(e) => copyToClipboard(e, activeCall.phone)} className="text-slate-400 hover:text-slate-700">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vaqt</span>
                <span className="font-medium">{formatDate(activeCall.startedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Operator</span>
                <span className="font-medium">{activeCall.operator || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Gaplashildi</span>
                <span className="font-medium">{formatCallDuration(activeCall.duration)} (Jami {formatCallDuration(activeCall.totalDuration)})</span>
              </div>
              
              <div className="pt-2">
                <span className="text-sm text-muted-foreground block mb-2">Audio yozuv:</span>
                {activeCall.audioUrl ? (
                  <audio 
                    controls 
                    src={`/api/telephony/audio?url=${encodeURIComponent(activeCall.audioUrl)}`} 
                    className="w-full h-10" 
                  />
                ) : (
                  <div className="text-sm text-slate-400 bg-slate-50 rounded-lg p-3 text-center">Audio mavjud emas</div>
                )}
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                {!activeCall.ticketId ? (
                  <Button 
                    className="w-full gap-2"
                    onClick={(e) => {
                      setQuickDetailOpen(false);
                      handleCreateTicket(e, activeCall._id, activeCall.phone);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Ticket yaratish
                  </Button>
                ) : (
                  <Link href={`/crm/tickets/${activeCall.ticketId._id}`} className="w-full block">
                    <Button variant="outline" className="w-full gap-2 text-blue-600">
                      <ExternalLink className="h-4 w-4" />
                      Ticketga o'tish
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

