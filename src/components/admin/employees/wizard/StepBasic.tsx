"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { WizardFormState } from "./types";

interface Props {
  form: WizardFormState;
  setForm: React.Dispatch<React.SetStateAction<WizardFormState>>;
}

export const StepBasic: React.FC<Props> = ({ form, setForm }) => {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Rasm hajmi 10MB dan oshmasligi kerak");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/admin/employees/avatar/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Rasm yuklashda xatolik");
      }

      const data = await res.json();
      setForm((prev) => ({ ...prev, avatarUrl: data.url }));
      toast.success("Profil rasmi muvaffaqiyatli yuklandi");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBirthDateChange = (dateStr: string) => {
    let calculatedAge = form.age;
    if (dateStr) {
      const birth = new Date(dateStr);
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        if (age >= 0 && age <= 120) {
          calculatedAge = String(age);
        }
      }
    }
    setForm((prev) => ({ ...prev, birthDate: dateStr, age: calculatedAge }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Avatar Upload Section */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row items-center gap-4">
        <div className="relative h-20 w-20 rounded-2xl overflow-hidden bg-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-500/20 border-2 border-border flex-shrink-0">
          {form.avatarUrl ? (
            <img
              src={form.avatarUrl}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{form.fullName?.charAt(0)?.toUpperCase() || "X"}</span>
          )}
          {uploadingAvatar && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          )}
        </div>

        <div className="space-y-1.5 text-center sm:text-left flex-1">
          <div className="text-sm font-bold text-foreground">
            Xodim profil rasmi (Avatar)
          </div>
          <div className="text-xs text-muted-foreground">
            Rahbar mobil ilovada xodimning ushbu rasmini ko'radi (JPG, PNG, WEBP)
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm transition-all">
              <Camera className="w-3.5 h-3.5" />
              <span>{form.avatarUrl ? "Rasmni almashtirish" : "Rasm yuklash"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </label>

            {form.avatarUrl && (
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, avatarUrl: "" }))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 text-xs font-bold transition-all border border-rose-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>O'chirish</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            To'liq ism-familiya <span className="text-rose-500">*</span>
          </Label>
          <Input
            placeholder="Masalan: Dostonbek Karimov"
            value={form.fullName}
            onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
            className="h-12 rounded-xl font-medium"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tabel raqami (Ixtiyoriy)
          </Label>
          <Input
            placeholder="Avtomatik (masalan: SH-005)"
            value={form.employeeId}
            onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}
            className="h-12 rounded-xl font-medium"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Jinsi
          </Label>
          <Select
            value={form.gender}
            onValueChange={(val) => setForm((p) => ({ ...p, gender: val || "MALE" }))}
          >
            <SelectTrigger className="h-12 rounded-xl font-medium">
              <SelectValue placeholder="Jinsni tanlang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Erkak</SelectItem>
              <SelectItem value="FEMALE">Ayol</SelectItem>
              <SelectItem value="OTHER">Boshqa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tug'ilgan sana (Kun.Oy.Yil)
          </Label>
          <DateInput
            value={form.birthDate}
            onChange={(val) => handleBirthDateChange(val)}
            placeholder="08.01.2005"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Yoshi
          </Label>
          <Input
            type="number"
            placeholder="Masalan: 26"
            value={form.age}
            onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
            className="h-12 rounded-xl font-medium"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Yashash manzili
          </Label>
          <Input
            placeholder="Toshkent sh., Chilonzor tumani..."
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            className="h-12 rounded-xl font-medium"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Qisqa izoh (ixtiyoriy)
          </Label>
          <Input
            placeholder="Qo'shimcha eslatma yoki ma'lumot..."
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            className="h-12 rounded-xl font-medium"
          />
        </div>
      </div>
    </div>
  );
};
