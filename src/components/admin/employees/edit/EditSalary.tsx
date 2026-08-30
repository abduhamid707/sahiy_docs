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

interface Props {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}

export const EditSalary: React.FC<Props> = ({ form, setForm }) => {
  const formatLiveSalary = (val: string) => {
    const numbers = String(val).replace(/\D/g, "");
    if (!numbers) return "";
    return new Intl.NumberFormat("ru-RU").format(Number(numbers));
  };

  const handleSalaryChange = (raw: string) => {
    const cleanNumbers = raw.replace(/\D/g, "");
    setForm((prev: any) => ({ ...prev, salaryAmount: cleanNumbers }));
  };

  const isUsd = form.salaryCurrency === "USD" || form.salaryCurrency === "$";

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Valyuta */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Valyuta
          </Label>
          <Select
            value={form.salaryCurrency || "USD"}
            onValueChange={(val) => setForm({ ...form, salaryCurrency: val || "USD" })}
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
        <div className="space-y-2 md:col-span-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Oylik maosh miqdori ({isUsd ? "$" : "so'm"})
          </Label>
          <div className="relative">
            <Input
              value={formatLiveSalary(form.salaryAmount || "")}
              onChange={(e) => handleSalaryChange(e.target.value)}
              className="h-12 rounded-xl font-bold text-base pr-16"
              placeholder={isUsd ? "Masalan: 1 200" : "Masalan: 8 500 000"}
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

        <div className="space-y-2 md:col-span-3">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Maosh beriladigan kun (oyiga)
          </Label>
          <Input
            type="number"
            min="1"
            max="31"
            value={form.salaryPayDay || "5"}
            onChange={(e) => setForm({ ...form, salaryPayDay: e.target.value })}
            className="h-12 rounded-xl font-medium"
          />
        </div>

        <div className="space-y-2 md:col-span-3">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Maosh bo'yicha izoh
          </Label>
          <Input
            value={form.salaryNotes || ""}
            onChange={(e) => setForm({ ...form, salaryNotes: e.target.value })}
            className="h-12 rounded-xl font-medium"
          />
        </div>
      </div>
    </div>
  );
};
