"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  UploadCloud,
  FileText,
  User,
  Phone,
  Package,
  Clock,
  AlertTriangle,
  Loader2,
  Check,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  CRM_CATEGORIES,
  CRM_CATEGORY_LABELS,
  CRM_PRIORITIES,
  CRM_PRIORITY_LABELS,
  formatUzPhone,
  normalizeUzPhone,
} from "@/lib/crm";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: any[];
  canAssign: boolean;
  onSuccess: (newTicket: any) => void;
}

const SLA_OPTIONS = [
  { label: "2 soat", hours: 2 },
  { label: "12 soat", hours: 12 },
  { label: "24 soat", hours: 24 },
  { label: "3 kun", hours: 72 },
];

export default function CreateTicketModal({
  isOpen,
  onClose,
  agents,
  canAssign,
  onSuccess,
}: CreateTicketModalProps) {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searching, setSearching] = useState(false);
  const [customerFound, setCustomerFound] = useState<any>(null);

  const [form, setForm] = useState({
    customerName: "",
    phone: "+998",
    orderId: "",
    category: "DELIVERY_DELAY",
    description: "",
    assignedTo: "",
    priority: "NORMAL",
    status: "NEW",
    deadlineHours: 24,
  });

  const [attachments, setAttachments] = useState<
    Array<{ url: string; name: string; size?: number }>
  >([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        customerName: "",
        phone: "+998",
        orderId: "",
        category: "DELIVERY_DELAY",
        description: "",
        assignedTo: "",
        priority: "NORMAL",
        status: "NEW",
        deadlineHours: 24,
      });
      setCustomerFound(null);
      setAttachments([]);
    }
  }, [isOpen]);

  // Debounced auto-search when phone number changes
  useEffect(() => {
    const rawDigits = form.phone.replace(/\D/g, "");
    if (rawDigits.length < 7) {
      setCustomerFound(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/crm/customers/search?q=${encodeURIComponent(form.phone)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const match = data[0];
            setCustomerFound(match);
            setForm((prev) => ({
              ...prev,
              customerName: prev.customerName || match.customerName || "",
              orderId: prev.orderId || match.orderId || "",
              category: prev.category === "DELIVERY_DELAY" ? match.lastCategory || prev.category : prev.category,
            }));
          } else {
            setCustomerFound(null);
          }
        }
      } catch (e) {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [form.phone]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
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
            { url: uploaded.url, name: file.name, size: file.size },
          ]);
        }
      }
    } catch (e: any) {
      toast.error("Fayl yuklashda xatolik yuz berdi");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalized = normalizeUzPhone(form.phone);
    if (normalized.replace(/\D/g, "").length !== 12) {
      toast.error("Telefon raqamini to'liq kiriting (+998...)");
      return;
    }
    if (!form.customerName.trim()) {
      toast.error("Mijoz ismini kiriting");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Muammo matnini kiriting");
      return;
    }

    setLoading(true);
    try {
      const deadlineAt = new Date(Date.now() + form.deadlineHours * 3600 * 1000).toISOString();

      const payload = {
        customerName: form.customerName.trim(),
        phone: normalized,
        orderId: form.orderId.trim() || undefined,
        category: form.category,
        description: form.description.trim(),
        assignedTo: form.assignedTo || undefined,
        priority: form.priority,
        status: form.status,
        deadlineAt,
        attachment: attachments[0] || undefined,
      };

      const res = await fetch("/api/crm/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Murojaat yaratilmadi");
      }

      toast.success(`Murojaat yaratildi (${data.ticketNumber || "Yangi"})`);
      onSuccess(data);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm animate-in fade-in-0 duration-150 sm:p-6">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-background border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div>
            <h2 className="text-lg font-bold">Tezkor Murojaat Qo'shish</h2>
            <p className="text-xs text-muted-foreground">
              Mijoz qo'ng'irog'i yoki murojaatini darhol ro'yxatga oling
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Customer info row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Telefon raqami *</span>
                {searching && (
                  <span className="flex items-center gap-1 text-[11px] text-blue-600">
                    <Loader2 className="w-3 h-3 animate-spin" /> Qidirilmoqda...
                  </span>
                )}
                {!searching && customerFound && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <Check className="w-3 h-3" /> Topildi
                  </span>
                )}
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  required
                  value={form.phone}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      phone: formatUzPhone(e.target.value),
                    }))
                  }
                  placeholder="+998 90 123 45 67"
                  className="pl-9 text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mijoz ismi *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  required
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
              <Label className="text-xs font-semibold">Buyurtma (Order ID)</Label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={form.orderId}
                  onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                  placeholder="Masalan: DG0000000"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Muammo turi *</Label>
              <Select
                value={form.category}
                onValueChange={(val) => setForm({ ...form, category: val || "DELIVERY_DELAY" })}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRM_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CRM_CATEGORY_LABELS[cat] || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
              <Select
                value={form.priority}
                onValueChange={(val) => setForm({ ...form, priority: val || "NORMAL" })}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRM_PRIORITIES.map((pri) => (
                    <SelectItem key={pri} value={pri}>
                      {CRM_PRIORITY_LABELS[pri] || pri}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canAssign ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Biriktirilgan operator</Label>
                <Select
                  value={form.assignedTo}
                  onValueChange={(val) => setForm({ ...form, assignedTo: val || "" })}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="O'ziga olish yoki tanlash" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Biriktirilmagan (Navbatda)</SelectItem>
                    {agents.map((ag) => (
                      <SelectItem key={ag._id} value={ag._id}>
                        {ag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          {/* SLA Presets (1-Click) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Hal qilish muddati (SLA)</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {SLA_OPTIONS.map((opt) => {
                const isSelected = form.deadlineHours === opt.hours;
                return (
                  <button
                    key={opt.hours}
                    type="button"
                    onClick={() => setForm({ ...form, deadlineHours: opt.hours })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compact Attachment Upload */}
          <div className="space-y-2 pt-1 border-t">
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
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
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
      </div>
    </div>,
    document.body
  );
}
