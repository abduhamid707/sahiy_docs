"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { WizardFormState } from "./types";

interface Props {
  form: WizardFormState;
  setForm: React.Dispatch<React.SetStateAction<WizardFormState>>;
}

export const StepAccess: React.FC<Props> = ({ form, setForm }) => {
  const [showPassword, setShowPassword] = useState(false);

  const formatLiveSalary = (val: string) => {
    const numbers = val.replace(/\D/g, "");
    if (!numbers) return "";
    return new Intl.NumberFormat("ru-RU").format(Number(numbers));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Access Toggle */}
      <div className="p-5 rounded-2xl border border-border bg-muted/30 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-foreground">
            Tizimga kirish huquqi berish
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Xodim platformaga o'z login va paroli bilan kira olishi uchun ruxsat
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={form.hasSystemAccess}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                hasSystemAccess: e.target.checked,
                loginEmail: e.target.checked && !prev.loginEmail ? prev.email : prev.loginEmail,
              }))
            }
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Login Fields if enabled */}
      {form.hasSystemAccess && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Kirish uchun Email <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="email"
              placeholder="xodim@sahiy.uz"
              value={form.loginEmail}
              onChange={(e) => setForm((p) => ({ ...p, loginEmail: e.target.value }))}
              className="h-12 rounded-xl font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Vaqtinchalik parol <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="h-12 rounded-xl font-medium pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          Ma'lumotlar xulosasi
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground block">Xodim:</span>
            <span className="font-bold text-foreground">{form.fullName || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Telefon:</span>
            <span className="font-bold text-foreground">{form.phone || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Bo'lim:</span>
            <span className="font-bold text-foreground">{form.department}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Lavozim:</span>
            <span className="font-bold text-foreground">{form.position}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Maosh:</span>
            <span className="font-bold text-foreground">
              {form.salaryAmount ? `${formatLiveSalary(form.salaryAmount)} so‘m` : "Kiritilmagan"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Tizimga kirish:</span>
            <span
              className={`font-bold ${
                form.hasSystemAccess ? "text-emerald-600" : "text-slate-500"
              }`}
            >
              {form.hasSystemAccess ? "Ruxsat berilgan" : "Faqat profil"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
