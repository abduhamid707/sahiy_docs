"use client";

import { useState } from "react";
import { X, Send, Loader2, BarChart2 } from "lucide-react";
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

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExecutiveReportModal({
  isOpen,
  onClose,
}: ExecutiveReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"NORMAL" | "HIGH" | "CRITICAL">("NORMAL");
  const [includeStats, setIncludeStats] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Sarlavha va hisobot matnini kiriting");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/crm/reports/executive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          priority,
          includeStats,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hisobot yuborilmadi");

      toast.success(`Hisobot ${data.sentCount} ta rahbarga yuborildi`);
      setTitle("");
      setBody("");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
      <div className="relative w-full max-w-lg bg-background border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div>
            <h2 className="text-lg font-bold">Rahbarga Hisobot Yuborish</h2>
            <p className="text-xs text-muted-foreground">
              Mobil ilovaga in-app va push bildirishnoma sifatida yuboriladi
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Sarlavha *</Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Ombordagi kechikishlar bo'yicha xulosa"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Hisobot matni *</Label>
            <Textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Rahbarga yetkazilishi kerak bo'lgan holat va tafsilotlar..."
              className="resize-none text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Muhimlik</Label>
              <Select
                value={priority}
                onValueChange={(val: any) => setPriority(val)}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Oddiy</SelectItem>
                  <SelectItem value="HIGH">Yuqori</SelectItem>
                  <SelectItem value="CRITICAL">Kritik</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                id="includeStats"
                type="checkbox"
                checked={includeStats}
                onChange={(e) => setIncludeStats(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="includeStats"
                className="text-xs font-medium cursor-pointer select-none flex items-center gap-1"
              >
                <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
                KPI statistikani qo'shish
              </label>
            </div>
          </div>

          {/* Footer */}
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
              className="gap-1.5 px-5 font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Hisobotni Yuborish
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
