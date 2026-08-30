"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone } from "lucide-react";
import { WizardFormState } from "./types";

interface Props {
  form: WizardFormState;
  setForm: React.Dispatch<React.SetStateAction<WizardFormState>>;
}

export const StepContact: React.FC<Props> = ({ form, setForm }) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Asosiy telefon raqami <span className="text-rose-500">*</span>
          </Label>
          <Input
            placeholder="+998 90 123 45 67"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            className="h-12 rounded-xl font-medium"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Qo'shimcha telefon
          </Label>
          <Input
            placeholder="+998 93 987 65 43"
            value={form.secondaryPhone}
            onChange={(e) => setForm((p) => ({ ...p, secondaryPhone: e.target.value }))}
            className="h-12 rounded-xl font-medium"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Telegram username
          </Label>
          <Input
            placeholder="@username"
            value={form.telegramUsername}
            onChange={(e) => setForm((p) => ({ ...p, telegramUsername: e.target.value }))}
            className="h-12 rounded-xl font-medium"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Email manzili
          </Label>
          <Input
            type="email"
            placeholder="xodim@sahiy.uz"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            className="h-12 rounded-xl font-medium"
          />
        </div>

        <div className="sm:col-span-2 pt-2 border-t border-border">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-amber-500" />
            Favqulodda aloqa (Emergency Contact)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground">Ismi</Label>
              <Input
                placeholder="Masalan: Ota-onasi"
                value={form.emergencyName}
                onChange={(e) => setForm((p) => ({ ...p, emergencyName: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground">Qarindoshligi</Label>
              <Input
                placeholder="Otasi / Onasi / Turmush o'rtog'i"
                value={form.emergencyRelation}
                onChange={(e) => setForm((p) => ({ ...p, emergencyRelation: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground">Telefoni</Label>
              <Input
                placeholder="+998 90 000 00 00"
                value={form.emergencyPhone}
                onChange={(e) => setForm((p) => ({ ...p, emergencyPhone: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
