"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  X,
  UploadCloud,
  FileText,
  User,
  Phone,
  Package,
  Clock,
  Calendar,
  ChevronDown,
  AlertTriangle,
  Loader2,
  Paperclip,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CRM_CATEGORIES,
  CRM_CATEGORY_LABELS,
  CRM_PRIORITIES,
  CRM_PRIORITY_LABELS,
} from "@/lib/crm";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: any[];
  canAssign: boolean;
  onSuccess: (newTicket: any) => void;
}

interface SlaPreset {
  id: string;
  label: string;
  hours: number;
}

const DEFAULT_SLA_PRESET: SlaPreset = { id: "default-24", label: "24 soat", hours: 24 };
const INITIAL_SLA_PRESETS: SlaPreset[] = [DEFAULT_SLA_PRESET];

export default function CreateTicketModal({
  isOpen,
  onClose,
  agents,
  canAssign,
  onSuccess,
}: CreateTicketModalProps) {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [slaPresets, setSlaPresets] = useState<SlaPreset[]>(INITIAL_SLA_PRESETS);
  const [customSlaHours, setCustomSlaHours] = useState("");
  const [slaPreviewHours, setSlaPreviewHours] = useState<number | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const toLocalDatetime = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [form, setForm] = useState({
    customerId: "",
    customerName: "",
    phone: "",
    orderIds: [""],
    category: "DELIVERY_DELAY",
    replacementOldValue: "",
    replacementNewValue: "",
    description: "",
    assignedTo: "",
    priority: "NORMAL",
    status: "NEW",
    deadlineHours: 24,
    deadlineAt: toLocalDatetime(new Date(Date.now() + 24 * 3600000)),
  });

  const [attachments, setAttachments] = useState<
    Array<{ url: string; name: string; mimeType?: string; size?: number }>
  >([]);
  const [uploading, setUploading] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDisplayDateTime = (isoOrLocalStr: string) => {
    if (!isoOrLocalStr) return "";
    const d = new Date(isoOrLocalStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = pad(d.getMinutes());
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day}.${month}.${year} ${pad(hours)}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    const saved = localStorage.getItem("crm_sla_presets");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSlaPresets([DEFAULT_SLA_PRESET, ...parsed.filter((item: SlaPreset) => item?.id !== DEFAULT_SLA_PRESET.id)]);
        }
      } catch (_) {}
    }
  }, []);

  const savePresets = (presets: SlaPreset[]) => {
    setSlaPresets(presets);
    localStorage.setItem("crm_sla_presets", JSON.stringify(presets.filter((item) => item.id !== DEFAULT_SLA_PRESET.id)));
  };

  const handleAddPreset = () => {
    const input = prompt("Yangi muddat kiriting:\n(Masalan: '5 kun' yoki '48 soat' yoki '12')");
    if (!input) return;
    const trimmed = input.trim().toLowerCase();
    let hours = 0;
    let label = "";

    if (trimmed.includes("kun") || trimmed.includes("k") || trimmed.includes("day")) {
      const num = parseFloat(trimmed.replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) {
        hours = Math.round(num * 24);
        label = `${num} kun`;
      }
    } else if (trimmed.includes("soat") || trimmed.includes("s") || trimmed.includes("hour")) {
      const num = parseFloat(trimmed.replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) {
        hours = Math.round(num);
        label = `${num} soat`;
      }
    } else {
      const num = parseFloat(trimmed.replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) {
        if (num <= 30) {
          hours = Math.round(num * 24);
          label = `${num} kun`;
        } else {
          hours = Math.round(num);
          label = `${num} soat`;
        }
      }
    }

    if (hours > 0 && label) {
      const newPreset: SlaPreset = {
        id: Date.now().toString(),
        label,
        hours,
      };
      const updated = [...slaPresets, newPreset];
      savePresets(updated);
      setCustomSlaHours("");
      setSlaPreviewHours(hours);
      const nextDate = new Date(Date.now() + hours * 3600000);
      setForm({
        ...form,
        deadlineHours: hours,
        deadlineAt: toLocalDatetime(nextDate),
      });
    }
  };

  const handleEditPreset = (preset: SlaPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    const input = prompt(`'${preset.label}' muddatini o'zgartiring:\n(Masalan: '7 kun' yoki '36 soat')`, preset.label);
    if (!input) return;
    const trimmed = input.trim().toLowerCase();
    let hours = 0;
    let label = "";

    if (trimmed.includes("kun") || trimmed.includes("k") || trimmed.includes("day")) {
      const num = parseFloat(trimmed.replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) {
        hours = Math.round(num * 24);
        label = `${num} kun`;
      }
    } else if (trimmed.includes("soat") || trimmed.includes("s") || trimmed.includes("hour")) {
      const num = parseFloat(trimmed.replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) {
        hours = Math.round(num);
        label = `${num} soat`;
      }
    } else {
      const num = parseFloat(trimmed.replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) {
        if (num <= 30) {
          hours = Math.round(num * 24);
          label = `${num} kun`;
        } else {
          hours = Math.round(num);
          label = `${num} soat`;
        }
      }
    }

    if (hours > 0 && label) {
      const updated = slaPresets.map((p) =>
        p.id === preset.id ? { ...p, label, hours } : p
      );
      savePresets(updated);
      if (form.deadlineHours === preset.hours) {
        const nextDate = new Date(Date.now() + hours * 3600000);
        setForm({
          ...form,
          deadlineHours: hours,
          deadlineAt: toLocalDatetime(nextDate),
        });
      }
    }
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === DEFAULT_SLA_PRESET.id) return;
    const updated = slaPresets.filter((p) => p.id !== id);
    savePresets(updated);
    toast.success("Muddat o'chirildi");
  };

  useEffect(() => {
    if (isOpen) {
      const initialDeadlineAt = toLocalDatetime(new Date(Date.now() + 24 * 3600000));
      setForm({
        customerId: "",
        customerName: "",
        phone: "",
        orderIds: [""],
        category: "DELIVERY_DELAY",
        replacementOldValue: "",
        replacementNewValue: "",
        description: "",
        assignedTo: "",
        priority: "NORMAL",
        status: "NEW",
        deadlineHours: 24,
        deadlineAt: initialDeadlineAt,
      });
      setAttachments([]);
      setCustomSlaHours("");
      setSlaPreviewHours(null);
      setFormError("");
      setDiscardConfirmOpen(false);
    }
  }, [isOpen]);

  const hasUnsavedChanges = Boolean(
    form.customerId.trim() ||
      form.customerName.trim() ||
      form.phone.trim() ||
      form.orderIds.join("").trim() ||
      form.description.trim() ||
      form.assignedTo ||
      form.category !== "DELIVERY_DELAY" ||
      form.priority !== "NORMAL" ||
      form.deadlineHours !== 24 ||
      customSlaHours ||
      attachments.length,
  );

  const requestClose = () => {
    if (loading || uploading) return;
    if (hasUnsavedChanges) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  };

  const discardAndClose = () => {
    setDiscardConfirmOpen(false);
    onClose();
  };

  const uploadFiles = useCallback(async (incomingFiles: File[]) => {
    if (!incomingFiles.length || uploading) return;
    const remainingSlots = Math.max(0, 10 - attachments.length);
    if (!remainingSlots) return toast.error("Ko‘pi bilan 10 ta fayl biriktirish mumkin");
    const selectedFiles = incomingFiles.slice(0, remainingSlots);
    if (incomingFiles.length > remainingSlots) toast.warning(`Faqat ${remainingSlots} ta fayl qo‘shildi`);
    setUploading(true);
    try {
      for (const file of selectedFiles) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name || "Fayl"} 5 MB dan katta`);
          continue;
        }
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/crm/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const uploaded = await res.json();
          setAttachments((prev) => [
            ...prev,
            { url: uploaded.url, name: uploaded.name, mimeType: uploaded.mimeType, size: uploaded.size },
          ]);
        } else {
          const error = await res.json().catch(() => null);
          toast.error(error?.error || `${file.name} yuklanmadi`);
        }
      }
    } catch {
      toast.error("Fayl yuklashda xatolik");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [attachments.length, uploading]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files || []);
      if (!files.length) return;
      event.preventDefault();
      void uploadFiles(files);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, uploadFiles]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    void uploadFiles(Array.from(e.target.files || []));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.customerId.trim() && form.orderIds.filter(Boolean).length === 0) {
      const message = "User ID yoki Order ID dan birini kiriting";
      setFormError(message);
      return toast.error(message);
    }
    if (form.description.trim().length < 3) {
      const message = "Muammo va izoh kamida 3 ta belgidan iborat bo'lishi kerak";
      setFormError(message);
      return toast.error(message);
    }
    const deadline = new Date(form.deadlineAt);
    if (Number.isNaN(deadline.getTime())) {
      const message = "Hal qilish muddatini to'g'ri kiriting";
      setFormError(message);
      return toast.error(message);
    }
    setLoading(true);

    try {
      const payload = {
        customerId: form.customerId,
        customerName: form.customerName,
        phone: form.phone,
        orderId: form.orderIds.filter(Boolean).join(", "),
        category: form.category,
        replacementOldValue: form.category === "REPLACEMENT" ? form.replacementOldValue : undefined,
        replacementNewValue: form.category === "REPLACEMENT" ? form.replacementNewValue : undefined,
        description: form.description,
        assignedTo: form.assignedTo || undefined,
        priority: form.priority,
        status: form.status,
        deadlineAt: deadline.toISOString(),
        attachments,
      };

      const res = await fetch("/api/crm/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Murojaat yaratilmadi (${res.status})`);
      }

      const newTicket = await res.json();
      toast.success("Murojaat muvaffaqiyatli saqlandi");
      onSuccess(newTicket);
      onClose();
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Server bilan bog'lanishda xatolik yuz berdi";
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      disablePointerDismissal
      onOpenChange={(open) => !open && requestClose()}
    >
      <DialogContent
        keepMounted
        overlayClassName="h-dvh w-screen bg-slate-950/45 backdrop-blur-none supports-backdrop-filter:backdrop-blur-none"
        className="gap-0 overflow-hidden bg-background p-0 duration-75 data-open:zoom-in-100 data-closed:zoom-out-100 sm:max-w-2xl"
      >
        <DialogHeader className="px-5 py-4 border-b bg-muted/20">
          <DialogTitle className="text-lg font-bold">Tezkor Murojaat Qo'shish</DialogTitle>
          <p className="text-xs text-muted-foreground">Mijoz qo'ng'irog'i yoki murojaatini darhol ro'yxatga oling</p>
        </DialogHeader>

        {discardConfirmOpen && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-background/85 p-5 backdrop-blur-sm">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="discard-ticket-title"
              aria-describedby="discard-ticket-description"
              className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-4.5" />
                </div>
                <div>
                  <h3 id="discard-ticket-title" className="font-semibold">
                    Kiritilgan ma’lumotlar o‘chib ketadi
                  </h3>
                  <p id="discard-ticket-description" className="mt-1 text-xs leading-5 text-muted-foreground">
                    Formani yopsangiz, kiritilgan ma’lumotlar va biriktirilgan fayllarni qayta tiklab bo‘lmaydi.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setDiscardConfirmOpen(false)}>
                  Formaga qaytish
                </Button>
                <Button type="button" variant="destructive" onClick={discardAndClose}>
                  Baribir yopish
                </Button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Client Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">User ID</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  placeholder="User ID"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Telefon raqami</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+998 90 123 45 67"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mijoz ismi</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Mijoz ismi"
                  className="pl-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Order ID & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Buyurtma (DG raqamlar)</Label>
                <div className="space-y-2">
                  {form.orderIds.map((id, index) => (
                    <div key={index} className="flex items-center gap-2 relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                      <Input
                        value={id}
                        onChange={(e) => {
                          const newIds = [...form.orderIds];
                          newIds[index] = e.target.value;
                          setForm({ ...form, orderIds: newIds });
                        }}
                        placeholder="DG0099993"
                        className="pl-9 text-sm"
                      />
                      {index === form.orderIds.length - 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => setForm({ ...form, orderIds: [...form.orderIds, ""] })}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10"
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Muammo turi *</Label>
              <div className="relative">
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 pr-8 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              >
                {CRM_CATEGORIES.map((cat) => <option key={cat} value={cat}>{CRM_CATEGORY_LABELS[cat] || cat}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            </div>

            {form.category === "REPLACEMENT" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-blue-700 dark:text-blue-400">Eski mahsulot (DG/Link) *</Label>
                  <Input
                    required
                    value={form.replacementOldValue}
                    onChange={(e) => setForm({ ...form, replacementOldValue: e.target.value })}
                    placeholder="Qaytayotgan mahsulot"
                    className="text-sm bg-white dark:bg-background border-blue-200 dark:border-blue-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-blue-700 dark:text-blue-400">Yangi zakaz (DG/Link) *</Label>
                  <Input
                    required
                    value={form.replacementNewValue}
                    onChange={(e) => setForm({ ...form, replacementNewValue: e.target.value })}
                    placeholder="O'rniga kiritilgan zakaz"
                    className="text-sm bg-white dark:bg-background border-blue-200 dark:border-blue-800"
                  />
                </div>
              </div>
            )}

            {/* Problem description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Muammo va izoh *</Label>
            <Textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Mijoz murojaati tafsilotlarini yozing..."
              className="resize-none text-sm"
            />
          </div>

          {/* Priority & Operator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Muhimlik darajasi</Label>
              <div className="relative">
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 pr-8 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              >
                {CRM_PRIORITIES.map((pri) => <option key={pri} value={pri}>{CRM_PRIORITY_LABELS[pri] || pri}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            {canAssign ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Biriktirilgan operator</Label>
                <div className="relative">
                <select
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 pr-8 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                >
                  <option value="">Biriktirilmagan (Navbatda)</option>
                  {agents.map((ag) => <option key={ag._id} value={ag._id}>{ag.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            ) : null}
          </div>

          {/* Minimal Clean SLA Section */}
          <div className="space-y-2.5 p-3.5 bg-muted/30 rounded-xl border border-border/70">
            <div className="flex items-start justify-between gap-3">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Hal qilish muddati (SLA)</span>
              </Label>
              <label className="relative flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted">
                <Calendar className="size-3.5 text-muted-foreground" />
                {formatDisplayDateTime(form.deadlineAt)}
                <input type="datetime-local" value={form.deadlineAt} onChange={(e) => { setCustomSlaHours(""); setSlaPreviewHours(null); setForm({ ...form, deadlineAt: e.target.value }); }} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Hal qilish muddatini o'zgartirish" />
              </label>
            </div>

            {/* Main Interactive Row: Prominent Input + || Divider + Preset Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={customSlaHours}
                  placeholder="Soat"
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setCustomSlaHours(digits);
                    const hours = Number(digits);
                    if (!digits || hours < 1) {
                      setSlaPreviewHours(null);
                      return;
                    }
                    setSlaPreviewHours(hours);
                    setForm({
                      ...form,
                      deadlineHours: hours,
                      deadlineAt: toLocalDatetime(new Date(Date.now() + hours * 3600000)),
                    });
                  }}
                  className="h-8 w-20 text-center text-sm font-semibold placeholder:font-normal"
                  aria-label="SLA muddati soatlarda"
                />
                {slaPreviewHours !== null && (
                  <span className="whitespace-nowrap text-xs font-medium text-muted-foreground" aria-live="polite">
                    {slaPreviewHours} soatda hal qilinadi
                  </span>
                )}
              </div>

              {/* 2. Visual Divider || (only if presets exist) */}
              {slaPresets.length > 0 && (
                <div className="flex items-center gap-1 px-1 py-1 text-border/80 select-none">
                  <div className="w-[2px] h-6 bg-border/80 rounded-full" />
                  <div className="w-[2px] h-6 bg-border/80 rounded-full" />
                </div>
              )}

              {/* 3. Preset chips */}
              {slaPresets.map((preset) => {
                const isSelected = form.deadlineHours === preset.hours;
                return (
                  <div
                    key={preset.id}
                    className="relative group inline-flex items-center"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCustomSlaHours("");
                        setSlaPreviewHours(preset.hours);
                        const nextDate = new Date(Date.now() + preset.hours * 3600000);
                        setForm({
                          ...form,
                          deadlineHours: preset.hours,
                          deadlineAt: toLocalDatetime(nextDate),
                        });
                      }}
                      onDoubleClick={(e) => handleEditPreset(preset, e)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 border ${
                        isSelected
                          ? "bg-blue-600 text-white border-2 border-blue-600 shadow-xs font-bold"
                          : "bg-background hover:bg-muted text-foreground border-border/80"
                      }`}
                      title="Tanlash (Tahrirlash uchun 2 marta bosing)"
                    >
                      <span>{preset.label}</span>
                      {preset.id !== DEFAULT_SLA_PRESET.id && <span
                        onClick={(e) => handleDeletePreset(preset.id, e)}
                        className={`transition ml-0.5 rounded-full p-0.5 ${
                          isSelected
                            ? "hover:bg-blue-700 text-white"
                            : "opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-red-600"
                        }`}
                        title="O'chirish"
                      >
                        <X className="w-2.5 h-2.5" />
                      </span>}
                    </button>
                  </div>
                );
              })}

              {/* Add Custom Preset '+' Button */}
              <button
                type="button"
                onClick={handleAddPreset}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-border/80 bg-background hover:bg-muted text-foreground transition flex items-center justify-center gap-1"
                title="Yangi muddat qo'shish (masalan: 5 kun, 8 kun, 10 kun, 15 kun)"
              >
                <Plus className="w-3.5 h-3.5" />
                {slaPresets.length === 0 && <span className="text-[11px] font-semibold text-muted-foreground">Muddat qo'shish</span>}
              </button>
            </div>
          </div>

          {formError && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Compact Attachment Upload */}
          <div
            className={`space-y-2 rounded-lg border border-dashed p-2.5 transition ${isDraggingFiles ? "border-blue-500 bg-blue-500/5" : "border-transparent"}`}
            onDragEnter={(event) => { event.preventDefault(); setIsDraggingFiles(true); }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setIsDraggingFiles(true); }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDraggingFiles(false); }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDraggingFiles(false);
              void uploadFiles(Array.from(event.dataTransfer.files || []));
            }}
          >
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Biriktirilgan fayllar</span>
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <UploadCloud className="w-3 h-3" />
                )}
                Fayl tanlash
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Sudrab tashlang yoki Ctrl+V bosing · har biri 5 MB gacha · ko‘pi bilan 10 ta</p>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs border max-w-[200px]"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="ml-1 text-muted-foreground hover:text-destructive transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Submit Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background pb-2 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={requestClose}
              disabled={loading}
              className="text-xs"
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gap-1.5 px-6 font-semibold"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Murojaatni Saqlash
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
