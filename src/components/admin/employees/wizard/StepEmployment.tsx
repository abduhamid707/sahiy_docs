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
import {
  ALL_ROLES,
  DEPARTMENTS,
  EMPLOYMENT_TYPE_LABELS,
  ROLE_LABELS,
} from "@/lib/constants";
import { DateInput } from "@/components/ui/date-input";
import { WizardFormState } from "./types";

interface Props {
  form: WizardFormState;
  setForm: React.Dispatch<React.SetStateAction<WizardFormState>>;
}

export const StepEmployment: React.FC<Props> = ({ form, setForm }) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Bo'lim <span className="text-rose-500">*</span>
          </Label>
          <Select
            value={form.department}
            onValueChange={(val) => setForm((p) => ({ ...p, department: val || "Call Center" }))}
          >
            <SelectTrigger className="h-12 rounded-xl font-medium">
              <SelectValue placeholder="Bo'limni tanlang" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Lavozim <span className="text-rose-500">*</span>
          </Label>
          <Input
            placeholder="Masalan: Katta Operator, Dasturchi..."
            value={form.position}
            onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
            className="h-12 rounded-xl font-medium"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tizimdagi rol
          </Label>
          <Select
            value={form.role}
            onValueChange={(val) => setForm((p) => ({ ...p, role: val || "SUPPORT" }))}
          >
            <SelectTrigger className="h-12 rounded-xl font-medium">
              <SelectValue placeholder="Rolni tanlang" />
            </SelectTrigger>
            <SelectContent>
              {ALL_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Bandlik turi
          </Label>
          <Select
            value={form.employmentType}
            onValueChange={(val) => setForm((p) => ({ ...p, employmentType: val || "FULL_TIME" }))}
          >
            <SelectTrigger className="h-12 rounded-xl font-medium">
              <SelectValue placeholder="Bandlik turini tanlang" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Ishga kirgan sana (Kun.Oy.Yil)
          </Label>
          <DateInput
            value={form.hiredAt}
            onChange={(val) => setForm((p) => ({ ...p, hiredAt: val }))}
            placeholder="01.01.2024"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Ish grafigi
          </Label>
          <Input
            placeholder="Masalan: 09:00 - 18:00 (6/1)"
            value={form.workSchedule}
            onChange={(e) => setForm((p) => ({ ...p, workSchedule: e.target.value }))}
            className="h-12 rounded-xl font-medium"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              "09:00 - 18:00 (6/1)",
              "09:00 - 18:00 (5/2)",
              "08:00 - 20:00 (2/2)",
              "10:00 - 19:00 (6/1)",
              "Erkin grafik",
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setForm((p) => ({ ...p, workSchedule: preset }))}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                  form.workSchedule === preset
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground border-border"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
