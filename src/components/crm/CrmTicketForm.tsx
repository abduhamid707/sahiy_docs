"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileUp, History, Loader2, Save, Search, UserRoundSearch, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CRM_CATEGORY_LABELS, CRM_PRIORITY_LABELS, CRM_STATUS_LABELS, formatUzPhone } from "@/lib/crm";

export default function CrmTicketForm({ agents, canAssign }: { agents: any[]; canAssign: boolean }) {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [uploading, setUploading] = useState(false); const [attachment, setAttachment] = useState<any>(null);
  const [lookup, setLookup] = useState(""); const [searching, setSearching] = useState(false); const [results, setResults] = useState<any[]>([]); const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [form, setForm] = useState({ customerName: "", phone: "+998", orderId: "", category: "DELIVERY_DELAY", description: "", assignedTo: "", priority: "NORMAL", status: "NEW", deadlineAt: "" });
  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const findCustomer = async () => {
    if (lookup.trim().length < 2) { toast.error("Telefon, Order ID yoki ismning kamida 2 ta belgisini kiriting"); return; }
    setSearching(true);
    try { const res = await fetch(`/api/crm/customers/search?q=${encodeURIComponent(lookup.trim())}`); const data = await res.json(); if (!res.ok) throw new Error(data.error); setResults(data); if (!data.length) toast.info("Mavjud mijoz topilmadi — yangi ma'lumot kiriting"); }
    catch (e: any) { toast.error(e.message || "Qidiruv ishlamadi"); } finally { setSearching(false); }
  };
  const chooseCustomer = (customer: any) => {
    setSelectedCustomer(customer); setResults([]); setLookup("");
    setForm(prev => ({ ...prev, customerName: customer.customerName, phone: formatUzPhone(customer.phone), orderId: customer.orderId || prev.orderId }));
  };
  const upload = async (file?: File) => {
    if (!file) return; setUploading(true);
    try { const body = new FormData(); body.append("file", file); const res = await fetch("/api/crm/upload", { method: "POST", body }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setAttachment(data); toast.success("Fayl biriktirildi"); }
    catch (e: any) { toast.error(e.message || "Fayl yuklanmadi"); } finally { setUploading(false); }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const deadlineAt = form.deadlineAt ? new Date(`${form.deadlineAt}:00+05:00`) : null;
      if (deadlineAt && Number.isNaN(deadlineAt.getTime())) throw new Error("SLA muddati noto‘g‘ri kiritilgan");
      const res = await fetch("/api/crm/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, deadlineAt: deadlineAt?.toISOString(), assignedTo: form.assignedTo || undefined, attachment: attachment || undefined }) });
      const data = await res.json().catch(() => ({ error: `Server xatosi (${res.status})` }));
      if (!res.ok) throw new Error(data.error || `Ticket yaratilmadi (${res.status})`);
      if (!data._id) throw new Error("Server ticket ID qaytarmadi");
      toast.success("Ticket yaratildi"); router.push(`/crm/tickets/${data._id}`); router.refresh();
    }
    catch (e: any) { toast.error(e.message || "Ticket yaratilmadi", { duration: 6000 }); } finally { setLoading(false); }
  };
  return <div className="mx-auto max-w-4xl space-y-5">
    <div className="flex items-center gap-3"><Button nativeButton={false} variant="outline" size="icon" className="h-10 w-10 rounded-xl" render={<Link href="/crm" />}><ArrowLeft /></Button><div><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-600 dark:text-blue-400">Customer Support CRM</p><h1 className="text-2xl font-bold">Yangi ticket</h1></div></div>
    <form onSubmit={submit}><Card className="overflow-hidden rounded-2xl"><CardHeader className="border-b bg-muted/40"><CardTitle>Mijoz murojaatini ro‘yxatga olish</CardTitle></CardHeader><CardContent className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
      <div className="space-y-2 sm:col-span-2"><Label>Avval mavjud mijoz yoki buyurtmani toping</Label><div className="flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><UserRoundSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={lookup} onChange={e => setLookup(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); findCustomer(); } }} placeholder="Telefon, Order ID yoki mijoz ismi..." className="h-11 rounded-xl pl-9" /></div><Button type="button" variant="outline" disabled={searching} onClick={findCustomer} className="h-11 rounded-xl px-4">{searching ? <Loader2 className="animate-spin"/> : <Search/>} Qidirish</Button></div>
        {!!results.length && <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border bg-background p-2">{results.map(customer => <button type="button" key={customer.phone} onClick={() => chooseCustomer(customer)} className="w-full rounded-lg p-3 text-left transition hover:bg-muted"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold">{customer.customerName}</p><p className="text-xs text-muted-foreground">{formatUzPhone(customer.phone)}{customer.orderId ? ` · ${customer.orderId}` : ""}</p></div>{customer.openTickets.length > 0 && <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">{customer.openTickets.length} ta ochiq</span>}</div></button>)}</div>}
        {selectedCustomer && <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/30"><div className="flex items-start justify-between"><div><p className="text-sm font-bold">{selectedCustomer.customerName} tanlandi</p><p className="text-xs text-muted-foreground">Ma’lumotlar avtomatik to‘ldirildi.</p></div><Button type="button" size="icon-xs" variant="ghost" onClick={() => setSelectedCustomer(null)}><X/></Button></div>{selectedCustomer.openTickets.length > 0 && <div className="mt-3 space-y-2 border-t border-blue-200 pt-3 dark:border-blue-900"><p className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300"><History className="h-3.5 w-3.5"/>Ayni muammo bo‘lsa yangi ticket ochmang — mavjud history’ga qo‘shing:</p>{selectedCustomer.openTickets.slice(0,3).map((ticket:any) => <Link key={ticket._id} href={`/crm/tickets/${ticket._id}`} className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2 text-xs hover:bg-background"><span className="truncate font-semibold">{ticket.ticketNumber || "Ticket"} · {ticket.problem}</span><span className="ml-2 shrink-0 text-blue-600">Ochish →</span></Link>)}</div>}</div>}
      </div>
      <div className="space-y-2"><Label>Mijoz *</Label><Input required value={form.customerName} onChange={e => set("customerName", e.target.value)} placeholder="Ism va familiya" className="h-11 rounded-xl" /></div>
      <div className="space-y-2"><Label>Telefon *</Label><Input required type="tel" inputMode="numeric" maxLength={17} value={form.phone} onChange={e => set("phone", formatUzPhone(e.target.value))} className="h-11 rounded-xl" /></div>
      <div className="space-y-2"><Label>Order ID</Label><Input value={form.orderId} onChange={e => set("orderId", e.target.value)} placeholder="Masalan: DG-10482" className="h-11 rounded-xl" /></div>
      <div className="space-y-2"><Label>Muammo kategoriyasi *</Label><Select value={form.category} onValueChange={v => set("category", v || "OTHER")}><SelectTrigger className="h-11 rounded-xl"><SelectValue>{CRM_CATEGORY_LABELS[form.category]}</SelectValue></SelectTrigger><SelectContent>{Object.entries(CRM_CATEGORY_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2 sm:col-span-2"><Label>Muammo tavsifi *</Label><Textarea required minLength={3} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Mijoz nima dedi va muammo qachondan beri davom etmoqda?" className="min-h-32 rounded-xl" /></div>
      <div className="space-y-2"><Label>Muhimlik</Label><Select value={form.priority} onValueChange={v => set("priority", v || "NORMAL")}><SelectTrigger className="h-11 rounded-xl"><SelectValue>{CRM_PRIORITY_LABELS[form.priority]}</SelectValue></SelectTrigger><SelectContent>{Object.entries(CRM_PRIORITY_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={v => set("status", v || "NEW")}><SelectTrigger className="h-11 rounded-xl"><SelectValue>{CRM_STATUS_LABELS[form.status]}</SelectValue></SelectTrigger><SelectContent>{["NEW","IN_PROGRESS","WAITING"].map(k => <SelectItem key={k} value={k}>{CRM_STATUS_LABELS[k]}</SelectItem>)}</SelectContent></Select></div>
      {canAssign && <div className="space-y-2"><Label>Mas’ul operator</Label><Select value={form.assignedTo} onValueChange={v => set("assignedTo", v || "")}><SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Navbatda qoldirish">{agents.find(a => a._id === form.assignedTo)?.name || "Navbatda qoldirish"}</SelectValue></SelectTrigger><SelectContent>{agents.map(a => <SelectItem key={a._id} value={a._id}>{a.name} · {a.email}</SelectItem>)}</SelectContent></Select></div>}
      <div className="space-y-2"><Label>SLA muddati</Label><Input type="datetime-local" value={form.deadlineAt} onChange={e => set("deadlineAt", e.target.value)} className="h-11 rounded-xl" /><p className="text-xs text-muted-foreground">Bo‘sh qolsa muhimlik darajasiga qarab avtomatik belgilanadi.</p></div>
      <div className="space-y-2 sm:col-span-2"><Label>Attachment (ixtiyoriy)</Label>{attachment ? <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3 text-sm"><span className="truncate">{attachment.name}</span><Button type="button" size="icon-sm" variant="ghost" onClick={() => setAttachment(null)}><X /></Button></div> : <label className="flex h-20 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground hover:bg-muted/40"><FileUp className="h-4 w-4" />{uploading ? "Yuklanmoqda..." : "Rasm, PDF yoki DOC fayl"}<input type="file" className="hidden" disabled={uploading} accept="image/*,.pdf,.doc,.docx,.txt" onChange={e => upload(e.target.files?.[0])}/></label>}</div>
      <div className="flex justify-end gap-2 border-t pt-5 sm:col-span-2"><Button nativeButton={false} variant="outline" className="h-11 rounded-xl" render={<Link href="/crm" />}>Bekor qilish</Button><Button type="submit" disabled={loading || uploading} className="h-11 rounded-xl bg-brand-blue px-6 text-white hover:bg-brand-blue-hover">{loading ? <Loader2 className="animate-spin" /> : <Save />} Ticket yaratish</Button></div>
    </CardContent></Card></form>
  </div>;
}
