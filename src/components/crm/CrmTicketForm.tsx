"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/purity */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileUp,
  History,
  Loader2,
  Plus,
  Save,
  UserRoundSearch,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CRM_CATEGORY_LABELS,
  CRM_PRIORITY_LABELS,
  CRM_STATUS_LABELS,
  formatUzDateTime,
  formatUzPhone,
} from "@/lib/crm";
import { cn } from "@/lib/utils";

type StoredSlaPreset = {
  id: string;
  label: string;
  amount: number;
  unit: "HOUR" | "DAY";
};
const SLA_PRESETS_KEY = "sahiy_crm_sla_presets_v1";

function tashkentInputValue(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export default function CrmTicketForm({
  agents,
  canAssign,
}: {
  agents: any[];
  canAssign: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState<any>(null);
  const [lookup, setLookup] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [form, setForm] = useState({
    customerName: "",
    phone: "+998",
    orderIds: [""],
    category: "DELIVERY_DELAY",
    replacementOldValue: "",
    replacementNewValue: "",
    description: "",
    assignedTo: "",
    priority: "NORMAL",
    status: "NEW",
    deadlineAt: "",
  });
  const [slaMode, setSlaMode] = useState("CUSTOM");
  const [slaPresets, setSlaPresets] = useState<StoredSlaPreset[]>([]);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [newPreset, setNewPreset] = useState({
    label: "",
    amount: "",
    unit: "HOUR" as "HOUR" | "DAY",
  });
  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SLA_PRESETS_KEY) || "[]");
      if (Array.isArray(saved))
        setSlaPresets(
          saved.filter(
            (item) => item?.id && item?.label && Number(item?.amount) > 0,
          ),
        );
    } catch {
      localStorage.removeItem(SLA_PRESETS_KEY);
    }
    setForm((current) =>
      current.deadlineAt
        ? current
        : { ...current, deadlineAt: tashkentInputValue(new Date()) },
    );
  }, []);
  const persistPresets = (items: StoredSlaPreset[]) => {
    setSlaPresets(items);
    localStorage.setItem(SLA_PRESETS_KEY, JSON.stringify(items));
  };
  const openCustomDeadline = () => {
    setSlaMode("CUSTOM");
    if (!form.deadlineAt) set("deadlineAt", tashkentInputValue(new Date()));
  };
  const applyStoredPreset = (preset: StoredSlaPreset) => {
    const hours = preset.unit === "DAY" ? preset.amount * 24 : preset.amount;
    set(
      "deadlineAt",
      tashkentInputValue(new Date(Date.now() + hours * 60 * 60 * 1000)),
    );
    setSlaMode(preset.id);
  };
  const savePreset = () => {
    const amount = Number(newPreset.amount);
    if (!newPreset.label.trim() || !Number.isFinite(amount) || amount <= 0)
      return toast.error("Shablon nomi va muddatini kiriting");
    const item: StoredSlaPreset = {
      id: `${Date.now()}`,
      label: newPreset.label.trim().slice(0, 24),
      amount,
      unit: newPreset.unit,
    };
    persistPresets([...slaPresets, item]);
    setNewPreset({ label: "", amount: "", unit: "HOUR" });
    setPresetDialogOpen(false);
    applyStoredPreset(item);
    toast.success("SLA shabloni saqlandi");
  };
  const removePreset = (id: string) => {
    persistPresets(slaPresets.filter((item) => item.id !== id));
    if (slaMode === id) {
      setSlaMode("AUTO");
      set("deadlineAt", "");
    }
  };
  const findCustomer = useCallback(async (term: string, signal: AbortSignal) => {
    setSearching(true);
    try {
      const res = await fetch(
        `/api/crm/customers/search?q=${encodeURIComponent(term)}`,
        { signal },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data);
      setHasSearched(true);
    } catch (e: any) {
      if (e.name !== "AbortError") toast.error(e.message || "Qidiruv ishlamadi");
    } finally {
      if (!signal.aborted) setSearching(false);
    }
  }, []);
  useEffect(() => {
    const term = lookup.trim();
    if (term.length < 2) {
      setResults([]);
      setHasSearched(false);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => findCustomer(term, controller.signal), 300);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [lookup, findCustomer]);
    const chooseCustomer = (customer: any) => {
      setSelectedCustomer(customer);
      setResults([]);
      setHasSearched(false);
      setLookup("");
      setForm((prev) => {
        let newOrderIds = prev.orderIds;
        if (customer.orderId) {
          const fetchedIds = customer.orderId.split(",").map((s: string) => s.trim());
          newOrderIds = Array.from(new Set([...prev.orderIds.filter(Boolean), ...fetchedIds]));
          if (newOrderIds.length === 0) newOrderIds = [""];
        }
        return {
          ...prev,
          customerName: customer.customerName,
          phone: formatUzPhone(customer.phone),
          orderIds: newOrderIds,
        };
      });
    };
  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/crm/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAttachment(data);
      toast.success("Fayl biriktirildi");
    } catch (e: any) {
      toast.error(e.message || "Fayl yuklanmadi");
    } finally {
      setUploading(false);
    }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const deadlineAt = form.deadlineAt
        ? new Date(`${form.deadlineAt}:00+05:00`)
        : null;
      if (deadlineAt && Number.isNaN(deadlineAt.getTime()))
        throw new Error("SLA muddati noto'g'ri kiritilgan");
        
      const payload = {
        customerName: form.customerName,
        phone: form.phone,
        orderId: form.orderIds.filter(Boolean).join(", "),
        category: form.category,
        description: form.description,
        assignedTo: form.assignedTo || undefined,
        priority: form.priority,
        status: form.status,
        deadlineAt: deadlineAt?.toISOString(),
        attachment: attachment || undefined,
        replacementOldValue: form.category === "REPLACEMENT" ? form.replacementOldValue : undefined,
        replacementNewValue: form.category === "REPLACEMENT" ? form.replacementNewValue : undefined,
      };

      const res = await fetch("/api/crm/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res
        .json()
        .catch(() => ({ error: `Server xatosi (${res.status})` }));
      if (!res.ok)
        throw new Error(data.error || `Ticket yaratilmadi (${res.status})`);
      if (!data._id) throw new Error("Server ticket ID qaytarmadi");
      toast.success("Ticket yaratildi");
      router.push(`/crm/tickets/${data._id}`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Ticket yaratilmadi", { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Button
          nativeButton={false}
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl"
          render={<Link href="/crm" />}
        >
          <ArrowLeft />
        </Button>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-600 dark:text-blue-400">
            Customer Support CRM
          </p>
          <h1 className="text-2xl font-bold">Yangi ticket</h1>
        </div>
      </div>
      <form onSubmit={submit}>
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="border-b bg-muted/40">
            <CardTitle>Mijoz murojaatini ro‘yxatga olish</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
            <div className="space-y-2 sm:col-span-2">
              <Label>Avval mavjud mijoz yoki buyurtmani toping</Label>
              <div className="relative">
                  <UserRoundSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={lookup}
                    onChange={(e) => setLookup(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                    placeholder="Telefon, Order ID yoki mijoz ismi..."
                    className="h-11 rounded-xl px-9"
                  />
                  {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
              </div>
              {!!results.length && (
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border bg-background p-2">
                  {results.map((customer) => (
                    <button
                      type="button"
                      key={customer.phone}
                      onClick={() => chooseCustomer(customer)}
                      className="w-full rounded-lg p-3 text-left transition hover:bg-muted"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold">
                            {customer.customerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatUzPhone(customer.phone)}
                            {customer.orderId ? ` · ${customer.orderId}` : ""}
                          </p>
                        </div>
                        {customer.openTickets.length > 0 && (
                          <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            {customer.openTickets.length} ta ochiq
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {hasSearched && !searching && results.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Mavjud mijoz topilmadi — yangi ma’lumotlarni kiriting.
                </p>
              )}
              {selectedCustomer && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold">
                        {selectedCustomer.customerName} tanlandi
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ma’lumotlar avtomatik to‘ldirildi.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => setSelectedCustomer(null)}
                    >
                      <X />
                    </Button>
                  </div>
                  {selectedCustomer.openTickets.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-blue-200 pt-3 dark:border-blue-900">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                        <History className="h-3.5 w-3.5" />
                        Ayni muammo bo‘lsa yangi ticket ochmang — mavjud
                        history’ga qo‘shing:
                      </p>
                      {selectedCustomer.openTickets
                        .slice(0, 3)
                        .map((ticket: any) => (
                          <Link
                            key={ticket._id}
                            href={`/crm/tickets/${ticket._id}`}
                            className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2 text-xs hover:bg-background"
                          >
                            <span className="truncate font-semibold">
                              {ticket.ticketNumber || "Ticket"} ·{" "}
                              {ticket.problem}
                            </span>
                            <span className="ml-2 shrink-0 text-blue-600">
                              Ochish →
                            </span>
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
                <Label>Mijoz ID *</Label>
                <Input
                  required
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="ID yoki login"
                  className="h-11 rounded-xl"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>Mijoz ismi</Label>
                <Input
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  placeholder="Ism va familiya (Ixtiyoriy)"
                  className="h-11 rounded-xl"
                />
              </div>
                <div className="space-y-2">
                  <Label>Order ID (DG raqamlar)</Label>
                  <div className="space-y-2">
                    {form.orderIds.map((id, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={id}
                          onChange={(e) => {
                            const newIds = [...form.orderIds];
                            newIds[index] = e.target.value;
                            setForm({ ...form, orderIds: newIds });
                          }}
                          placeholder="DG0099993"
                          className="h-11 rounded-xl"
                        />
                        {index === form.orderIds.length - 1 ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 rounded-xl shrink-0"
                            onClick={() => setForm({ ...form, orderIds: [...form.orderIds, ""] })}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 rounded-xl shrink-0 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              const newIds = form.orderIds.filter((_, i) => i !== index);
                              setForm({ ...form, orderIds: newIds });
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
            <div className="space-y-2">
              <Label>Muammo kategoriyasi *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => set("category", v || "OTHER")}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue>
                    {CRM_CATEGORY_LABELS[form.category]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CRM_CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Muammo tavsifi *</Label>
              <Textarea
                required
                minLength={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Mijoz nima dedi va muammo qachondan beri davom etmoqda?"
                className="min-h-32 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Muhimlik</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => set("priority", v || "NORMAL")}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue>
                    {CRM_PRIORITY_LABELS[form.priority]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CRM_PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v || "NEW")}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue>{CRM_STATUS_LABELS[form.status]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {["NEW", "IN_PROGRESS", "WAITING"].map((k) => (
                    <SelectItem key={k} value={k}>
                      {CRM_STATUS_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canAssign && (
              <div className="space-y-2">
                <Label>Mas’ul operator</Label>
                <Select
                  value={form.assignedTo}
                  onValueChange={(v) => set("assignedTo", v || "")}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Navbatda qoldirish">
                      {agents.find((a) => a._id === form.assignedTo)?.name ||
                        "Navbatda qoldirish"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name} · {a.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label>SLA muddati</Label>
                {form.deadlineAt && (
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {formatUzDateTime(
                      new Date(`${form.deadlineAt}:00+05:00`),
                      true,
                    )}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openCustomDeadline}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                    slaMode === "CUSTOM"
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "bg-background text-muted-foreground hover:border-blue-400 hover:text-foreground",
                  )}
                >
                  Muddat
                </button>
                {slaPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className={cn(
                      "inline-flex overflow-hidden rounded-lg border",
                      slaMode === preset.id
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "bg-background text-muted-foreground",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => applyStoredPreset(preset)}
                      className="px-3 py-2 text-xs font-semibold"
                    >
                      {preset.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => removePreset(preset.id)}
                      className={cn(
                        "border-l px-1.5 transition hover:bg-rose-500 hover:text-white",
                        slaMode === preset.id
                          ? "border-white/30"
                          : "border-border",
                      )}
                      aria-label={`${preset.label} shablonini o‘chirish`}
                      title="Shablonni o‘chirish"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSlaMode("AUTO");
                    set("deadlineAt", "");
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                    slaMode === "AUTO"
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "bg-background text-muted-foreground hover:border-blue-400 hover:text-foreground",
                  )}
                >
                  1 kunda
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDialogOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground transition hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-600"
                  aria-label="SLA shabloni qo‘shish"
                  title="SLA shabloni qo‘shish"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {slaMode === "CUSTOM" && (
                <Input
                  autoFocus
                  type="datetime-local"
                  value={form.deadlineAt}
                  onChange={(e) => set("deadlineAt", e.target.value)}
                  className="h-11 max-w-sm rounded-xl"
                />
              )}
              <p className="text-xs text-muted-foreground">
                {slaMode === "AUTO"
                  ? "1 kunlik muddat."
                  : "Hozirgi vaqt avtomatik olindi — kerakli muddatga o‘zgartiring."}
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Attachment (ixtiyoriy)</Label>
              {attachment ? (
                <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3 text-sm">
                  <span className="truncate">{attachment.name}</span>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setAttachment(null)}
                  >
                    <X />
                  </Button>
                </div>
              ) : (
                <label className="flex h-20 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground hover:bg-muted/40">
                  <FileUp className="h-4 w-4" />
                  {uploading ? "Yuklanmoqda..." : "Rasm, PDF yoki DOC fayl"}
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploading}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={(e) => upload(e.target.files?.[0])}
                  />
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t pt-5 sm:col-span-2">
              <Button
                nativeButton={false}
                variant="outline"
                className="h-11 rounded-xl"
                render={<Link href="/crm" />}
              >
                Bekor qilish
              </Button>
              <Button
                type="submit"
                disabled={loading || uploading}
                className="h-11 rounded-xl bg-brand-blue px-6 text-white hover:bg-brand-blue-hover"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Save />}{" "}
                Ticket yaratish
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
      <Dialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen}>
        <DialogContent className="rounded-xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>SLA shabloni</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nomi</Label>
              <Input
                value={newPreset.label}
                onChange={(event) =>
                  setNewPreset((value) => ({
                    ...value,
                    label: event.target.value,
                  }))
                }
                placeholder="Masalan: Tezkor"
                className="h-11 rounded-lg"
                maxLength={24}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Miqdor</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={newPreset.amount}
                  onChange={(event) =>
                    setNewPreset((value) => ({
                      ...value,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="2"
                  className="h-11 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Birlik</Label>
                <Select
                  value={newPreset.unit}
                  onValueChange={(value) =>
                    setNewPreset((current) => ({
                      ...current,
                      unit: value === "DAY" ? "DAY" : "HOUR",
                    }))
                  }
                >
                  <SelectTrigger className="h-11 rounded-lg">
                    <SelectValue>
                      {newPreset.unit === "DAY" ? "Kun" : "Soat"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOUR">Soat</SelectItem>
                    <SelectItem value="DAY">Kun</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="button"
              onClick={savePreset}
              className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus />
              Qo‘shish
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Bu shablon faqat shu brauzerda saqlanadi.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
