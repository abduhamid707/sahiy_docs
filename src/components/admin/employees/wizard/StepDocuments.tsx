"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";
import { WizardFormState } from "./types";

interface Props {
  form: WizardFormState;
  setForm: React.Dispatch<React.SetStateAction<WizardFormState>>;
}

export const StepDocuments: React.FC<Props> = ({ form, setForm }) => {
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "front" | "back"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Fayl hajmi 15MB dan oshmasligi kerak");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    if (type === "front") setUploadingFront(true);
    else setUploadingBack(true);

    try {
      const res = await fetch("/api/admin/employees/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Faylni yuklashda xatolik yuz berdi");
      }

      const fileData = await res.json();
      setForm((prev) => ({
        ...prev,
        [type === "front" ? "passportFront" : "passportBack"]: fileData,
      }));
      toast.success(`${type === "front" ? "Old tomoni" : "Orqa tomoni"} muvaffaqiyatli yuklandi`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      if (type === "front") setUploadingFront(false);
      else setUploadingBack(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium">
        🛡️ <strong>Pasport xavfsizligi:</strong> Yuklangan hujjatlar xavfsiz shaxsiy omborda saqlanadi va ruxsatsiz shaxslarga ochiq URL orqali berilmaydi.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pasport seriya va raqami
          </Label>
          <Input
            placeholder="Masalan: AA 1234567"
            value={form.passportSeries}
            onChange={(e) => setForm((p) => ({ ...p, passportSeries: e.target.value.toUpperCase() }))}
            className="h-12 rounded-xl font-bold uppercase tracking-wider"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            JShShIR / PINFL (14 xonali)
          </Label>
          <Input
            maxLength={14}
            placeholder="30101900000000"
            value={form.passportPinfl}
            onChange={(e) => setForm((p) => ({ ...p, passportPinfl: e.target.value.replace(/\D/g, "") }))}
            className="h-12 rounded-xl font-bold tracking-wider"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Kim tomonidan berilgan
          </Label>
          <Input
            placeholder="Toshkent sh., IIB tomonidan..."
            value={form.passportIssuedBy}
            onChange={(e) => setForm((p) => ({ ...p, passportIssuedBy: e.target.value }))}
            className="h-12 rounded-xl font-medium"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Berilgan sana (Kun.Oy.Yil)
          </Label>
          <DateInput
            value={form.passportIssuedAt}
            onChange={(val) => setForm((p) => ({ ...p, passportIssuedAt: val }))}
            placeholder="10.02.2021"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Amal qilish muddati (Kun.Oy.Yil)
          </Label>
          <DateInput
            value={form.passportExpiresAt}
            onChange={(val) => setForm((p) => ({ ...p, passportExpiresAt: val }))}
            placeholder="09.02.2031"
          />
        </div>

        {/* Upload Buttons */}
        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Front Upload */}
          <div className="p-4 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center gap-2 hover:border-blue-500/40 transition-all bg-muted/20">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs font-bold text-foreground">
              Pasport old tomoni (Rasm/PDF)
            </span>
            {form.passportFront ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-lg mt-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="truncate max-w-[150px]">{form.passportFront.fileName}</span>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, passportFront: null }))}
                  className="text-rose-500 hover:text-rose-700 ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer mt-1">
                <span className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-all inline-flex items-center gap-1.5">
                  {uploadingFront ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Fayl tanlash"}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "front")}
                />
              </label>
            )}
          </div>

          {/* Back Upload */}
          <div className="p-4 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center gap-2 hover:border-blue-500/40 transition-all bg-muted/20">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs font-bold text-foreground">
              Pasport orqa tomoni (Propiska)
            </span>
            {form.passportBack ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-lg mt-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="truncate max-w-[150px]">{form.passportBack.fileName}</span>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, passportBack: null }))}
                  className="text-rose-500 hover:text-rose-700 ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer mt-1">
                <span className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-all inline-flex items-center gap-1.5">
                  {uploadingBack ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Fayl tanlash"}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "back")}
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
