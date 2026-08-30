"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WizardFormState } from "./types";

interface Props {
  form: WizardFormState;
  setForm: React.Dispatch<React.SetStateAction<WizardFormState>>;
}

export const StepSalary: React.FC<Props> = ({ form, setForm }) => {
  const formatLiveSalary = (val: string) => {
    const numbers = val.replace(/\D/g, "");
    if (!numbers) return "";
    return new Intl.NumberFormat("ru-RU").format(Number(numbers));
  };

  const handleSalaryChange = (raw: string) => {
    const cleanNumbers = raw.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, salaryAmount: cleanNumbers }));
  };

  const isUsd = form.salaryCurrency === "USD" || form.salaryCurrency === "$";

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
        🔒 <strong>Maxfiy ma'lumot:</strong> Maosh ma'lumotlari faqat Super Admin, HR va ruxsat berilgan Rahbarga ko'rinadi. Oddiy xodimlarga berilmaydi.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Valyuta */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Valyuta
          </Label>
          <Select
            value={form.salaryCurrency || "USD"}
            onValueChange={(val) => setForm((p) => ({ ...p, salaryCurrency: val || "USD" }))}
          >
            <SelectTrigger className="h-12 rounded-xl font-bold">
              <SelectValue placeholder="Valyutani tanlang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($ - AQSh dollari)</SelectItem>
              <SelectItem value="UZS">UZS (so‘m)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Oylik miqdori */}
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Oylik maosh miqdori ({isUsd ? "$" : "so'm"})
          </Label>
          <div className="relative">
            <Input
              placeholder={isUsd ? "Masalan: 1 200" : "Masalan: 8 500 000"}
              value={formatLiveSalary(form.salaryAmount)}
              onChange={(e) => handleSalaryChange(e.target.value)}
              className="h-12 rounded-xl font-bold text-base pr-16"
            />
            <div className="absolute right-3 top-3 text-xs font-black text-muted-foreground/70">
              {isUsd ? "USD ($)" : "SO'M"}
            </div>
          </div>
          {form.salaryAmount ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              Formatlangan: {isUsd ? `$ ${formatLiveSalary(form.salaryAmount)}` : `${formatLiveSalary(form.salaryAmount)} so‘m`}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-3">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Maosh beriladigan kun (oyiga)
          </Label>
          <Input
            type="number"
            min="1"
            max="31"
            placeholder="Masalan: 5"
            value={form.salaryPayDay}
            onChange={(e) => setForm((p) => ({ ...p, salaryPayDay: e.target.value }))}
            className="h-12 rounded-xl font-medium"
          />
        </div>

        <div className="space-y-2 sm:col-span-3">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Maosh bo'yicha izoh (ixtiyoriy)
          </Label>
          <Input
            placeholder="Bonus shartlari, KPI yoki sinov muddati stavkasi..."
            value={form.salaryNotes}
            onChange={(e) => setForm((p) => ({ ...p, salaryNotes: e.target.value }))}
            className="h-12 rounded-xl font-medium"
          />
        </div>
      </div>
    </div>
  );
};
