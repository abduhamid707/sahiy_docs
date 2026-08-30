"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}

export const EditAccess: React.FC<Props> = ({ form, setForm }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="p-5 rounded-2xl border border-border bg-muted/30 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-foreground">
            Tizimga kirish huquqi berish
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Xodim platformaga kirishi uchun ruxsat holati
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(form.hasSystemAccess)}
            onChange={(e) => setForm({ ...form, hasSystemAccess: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {form.hasSystemAccess && (
        <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Yangi parol o'rnatish (Ixtiyoriy)
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Yangi parolni kiriting (bo'sh qoldirilsa eski parol qoladi)"
                value={form.newPassword || ""}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
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
    </div>
  );
};
