"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone } from "lucide-react";

interface Props {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}

export const EditContact: React.FC<Props> = ({ form, setForm }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Asosiy telefon raqami <span className="text-rose-500">*</span>
          </Label>
          <Input
            value={form.phone || ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="h-12 rounded-xl font-medium"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Qo'shimcha telefon
          </Label>
          <Input
            value={form.secondaryPhone || ""}
            onChange={(e) => setForm({ ...form, secondaryPhone: e.target.value })}
            className="h-12 rounded-xl font-medium"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Telegram username
          </Label>
          <Input
            placeholder="@username"
            value={form.telegramUsername || ""}
            onChange={(e) => setForm({ ...form, telegramUsername: e.target.value })}
            className="h-12 rounded-xl font-medium"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Email manzili
          </Label>
          <Input
            type="email"
            value={form.email || ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="h-12 rounded-xl font-medium"
          />
        </div>

        {/* Emergency Contact */}
        <div className="md:col-span-2 pt-3 border-t border-border">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-amber-500" />
            Favqulodda aloqa (Emergency Contact)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground">Ismi</Label>
              <Input
                value={form.emergencyName || ""}
                onChange={(e) => setForm({ ...form, emergencyName: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground">Qarindoshligi</Label>
              <Input
                value={form.emergencyRelation || ""}
                onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground">Telefoni</Label>
              <Input
                value={form.emergencyPhone || ""}
                onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
