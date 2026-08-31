"use client";

import { useEffect, useState, useRef } from "react";
import {
  X,
  UploadCloud,
  FileText,
  User,
  Package,
  Clock,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const DEFAULT_SLA_OPTIONS = [
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
  const [customSla, setCustomSla] = useState<number | null>(null);

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
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

  useEffect(() => {
    const savedCustomSla = localStorage.getItem("crm_custom_sla");
    if (savedCustomSla) {
      setCustomSla(parseInt(savedCustomSla, 10));
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setForm({
        customerName: "",
        phone: "",
        orderId: "",
        category: "DELIVERY_DELAY",
        description: "",
        assignedTo: "",
        priority: "NORMAL",
        status: "NEW",
        deadlineHours: 24,
      });
      setAttachments([]);
    }
  }, [isOpen]);

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
            { url: uploaded.url, name: uploaded.name, size: uploaded.size },
          ]);
        } else {
          toast.error(`${file.name} yuklanmadi.`);
        }
      }
    } catch (err) {
      toast.error("Fayl yuklashda xatolik");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone.trim()) {
      return toast.error("Mijoz ID kiritilishi shart");
    }
    setLoading(true);

    try {
      const payload = {
        customerName: form.customerName,
        phone: form.phone,
        orderId: form.orderId,
        category: form.category,
        description: form.description,
        assignedTo: form.assignedTo || undefined,
        priority: form.priority,
        status: form.status,
        deadlineAt: new Date(Date.now() + form.deadlineHours * 3600000).toISOString(),
        attachment: attachments.length > 0 ? attachments[0] : undefined,
      };

      const res = await fetch("/api/crm/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Xatolik yuz berdi");
      }

      const newTicket = await res.json();
      toast.success("Murojaat muvaffaqiyatli saqlandi");
      onSuccess(newTicket);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomSla = () => {
    const hours = prompt("Qo'shimcha necha soat bo'lsin? (Masalan: 48)");
    if (hours && !isNaN(Number(hours))) {
      const h = Number(hours);
      setCustomSla(h);
      localStorage.setItem("crm_custom_sla", h.toString());
      setForm({ ...form, deadlineHours: h });
    }
  };

  const calculatedDeadline = new Date(Date.now() + form.deadlineHours * 3600000);
  const formattedDeadline = calculatedDeadline.toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const slaOptions = [...DEFAULT_SLA_OPTIONS];
  if (customSla && !slaOptions.find(o => o.hours === customSla)) {
    slaOptions.push({ label: `${customSla} soat`, hours: customSla });
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-background gap-0">
        <DialogHeader className="px-5 py-4 border-b bg-muted/20">
          <DialogTitle className="text-lg font-bold">Tezkor Murojaat Qo'shish</DialogTitle>
          <p className="text-xs text-muted-foreground">Mijoz qo'ng'irog'i yoki murojaatini darhol ro'yxatga oling</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Client Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mijoz ID *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="ID yoki login"
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
                  placeholder="Mijoz ismi (Ixtiyoriy)"
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
                  placeholder="DG0099993"
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
                <SelectContent className="z-[10000]">
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
                <SelectContent className="z-[10000]">
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
                  <SelectContent className="z-[10000]">
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
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Hal qilish muddati (SLA)</span>
              </Label>
              <span className="text-[11px] font-medium bg-background px-2 py-0.5 rounded-full border text-primary">
                {formattedDeadline}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2 pt-1">
              {slaOptions.map((opt) => {
                const isSelected = form.deadlineHours === opt.hours;
                return (
                  <button
                    key={opt.hours}
                    type="button"
                    onClick={() => setForm({ ...form, deadlineHours: opt.hours })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
              
              <button
                type="button"
                onClick={handleAddCustomSla}
                className="px-2 py-1.5 rounded-lg text-xs font-semibold border bg-background hover:bg-muted text-muted-foreground transition flex items-center justify-center"
                title="Boshqa muddat qo'shish"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Compact Attachment Upload */}
          <div className="space-y-2 pt-2">
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
          <div className="flex items-center justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background pb-2 mt-2">
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
      </DialogContent>
    </Dialog>
  );
}
