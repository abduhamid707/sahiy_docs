"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  User,
  Phone,
  Briefcase,
  DollarSign,
  FileText,
  KeyRound,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EditBasic } from "./edit/EditBasic";
import { EditContact } from "./edit/EditContact";
import { EditEmployment } from "./edit/EditEmployment";
import { EditSalary } from "./edit/EditSalary";
import { EditDocuments } from "./edit/EditDocuments";
import { EditAccess } from "./edit/EditAccess";

interface EditModalProps {
  employee: any | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (updatedEmployee: any) => void;
}

export default function EditEmployeeModal({
  employee,
  open,
  onClose,
  onUpdated,
}: EditModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "basic" | "contact" | "employment" | "salary" | "documents" | "access"
  >("basic");

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (employee) {
      setForm({
        fullName: employee.fullName || "",
        employeeId: employee.employeeId || "",
        avatarUrl: employee.avatarUrl || "",
        gender: employee.gender || "MALE",
        birthDate: employee.birthDate ? employee.birthDate.split("T")[0] : "",
        age: employee.age ? String(employee.age) : "",
        address: employee.address || "",
        notes: employee.notes || "",

        phone: employee.phone || "",
        secondaryPhone: employee.secondaryPhone || "",
        telegramUsername: employee.telegramUsername || "",
        email: employee.email || "",
        emergencyName: employee.emergencyContact?.name || "",
        emergencyRelation: employee.emergencyContact?.relationship || "",
        emergencyPhone: employee.emergencyContact?.phone || "",

        department: employee.department || "Call Center",
        position: employee.position || "Operator",
        role: employee.role || "SUPPORT",
        isLead: Boolean(employee.isLead),
        hiredAt: employee.hiredAt
          ? employee.hiredAt.split("T")[0]
          : new Date().toISOString().split("T")[0],
        employmentType: employee.employmentType || "FULL_TIME",
        status: employee.status || "ACTIVE",
        workSchedule: employee.workSchedule || "09:00 - 18:00 (6/1)",

        salaryAmount:
          employee.salary?.amount !== undefined && employee.salary?.amount !== null
            ? String(employee.salary.amount)
            : "",
        salaryCurrency: employee.salary?.currency || "UZS",
        salaryPayDay:
          employee.salary?.payDay !== undefined ? String(employee.salary.payDay) : "5",
        salaryNotes: employee.salary?.notes || "",

        passportSeries: employee.passport?.seriesNumber || "",
        passportPinfl: employee.passport?.pinfl || "",
        passportIssuedBy: employee.passport?.issuedBy || "",
        passportIssuedAt: employee.passport?.issuedAt
          ? employee.passport.issuedAt.split("T")[0]
          : "",
        passportExpiresAt: employee.passport?.expiresAt
          ? employee.passport.expiresAt.split("T")[0]
          : "",
        passportFront: employee.passport?.frontFile || null,
        passportBack: employee.passport?.backFile || null,

        hasSystemAccess: Boolean(employee.hasSystemAccess),
        newPassword: "",
      });
      setActiveTab("basic");
    }
  }, [employee, open]);

  if (!employee) return null;

  const handleSave = async () => {
    if (!form.fullName?.trim()) {
      toast.error("Xodimning to'liq ismini kiriting");
      setActiveTab("basic");
      return;
    }

    if (!form.phone?.trim()) {
      toast.error("Asosiy telefon raqamini kiriting");
      setActiveTab("contact");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        fullName: form.fullName.trim(),
        avatarUrl: form.avatarUrl || null,
        gender: form.gender,
        birthDate: form.birthDate || null,
        age: form.age ? Number(form.age) : null,
        address: form.address?.trim() || null,
        notes: form.notes?.trim() || null,

        phone: form.phone.trim(),
        secondaryPhone: form.secondaryPhone?.trim() || null,
        telegramUsername: form.telegramUsername?.trim() || null,
        email: form.email?.trim() || null,
        emergencyContact: {
          name: form.emergencyName?.trim() || null,
          relationship: form.emergencyRelation?.trim() || null,
          phone: form.emergencyPhone?.trim() || null,
        },

        department: form.department,
        position: form.position,
        role: form.role,
        isLead: form.isLead,
        hiredAt: form.hiredAt ? new Date(form.hiredAt) : new Date(),
        employmentType: form.employmentType,
        status: form.status,
        workSchedule: form.workSchedule?.trim() || null,

        salary: {
          amount: form.salaryAmount ? Number(form.salaryAmount) : 0,
          currency: form.salaryCurrency || "UZS",
          payDay: Number(form.salaryPayDay) || 5,
          notes: form.salaryNotes?.trim() || null,
        },

        passport: {
          seriesNumber: form.passportSeries?.trim() || null,
          pinfl: form.passportPinfl?.trim() || null,
          issuedBy: form.passportIssuedBy?.trim() || null,
          issuedAt: form.passportIssuedAt ? new Date(form.passportIssuedAt) : null,
          expiresAt: form.passportExpiresAt ? new Date(form.passportExpiresAt) : null,
          frontFile: form.passportFront || null,
          backFile: form.passportBack || null,
        },

        hasSystemAccess: form.hasSystemAccess,
      };

      if (form.newPassword?.trim()) {
        payload.password = form.newPassword.trim();
      }

      const res = await fetch(`/api/admin/employees/${employee._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Ma'lumotlarni saqlashda xatolik");
      }

      const updated = await res.json();
      toast.success("Xodim ma'lumotlari muvaffaqiyatli yangilandi");
      onUpdated(updated);
      onClose();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-4xl w-full max-w-4xl rounded-[2.5rem] border border-border shadow-2xl p-0 overflow-hidden bg-card"
      >
        {/* Header */}
        <div className="bg-muted/40 p-6 md:p-8 border-b border-border relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 h-9 w-9 rounded-xl bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center border border-border transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground flex items-center gap-3">
              <span>Xodim Ma'lumotlarini Tahrirlash</span>
              <span className="text-xs font-bold px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full font-mono">
                {employee.employeeId || "SH-001"}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "basic", label: "Asosiy", icon: User },
              { id: "contact", label: "Aloqa", icon: Phone },
              { id: "employment", label: "Ish va Holat", icon: Briefcase },
              { id: "salary", label: "Maosh", icon: DollarSign },
              { id: "documents", label: "Hujjatlar", icon: FileText },
              { id: "access", label: "Kirish huquqi", icon: KeyRound },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 max-h-[60vh] overflow-y-auto space-y-6">
          {activeTab === "basic" && <EditBasic form={form} setForm={setForm} />}
          {activeTab === "contact" && <EditContact form={form} setForm={setForm} />}
          {activeTab === "employment" && <EditEmployment form={form} setForm={setForm} />}
          {activeTab === "salary" && <EditSalary form={form} setForm={setForm} />}
          {activeTab === "documents" && <EditDocuments form={form} setForm={setForm} />}
          {activeTab === "access" && <EditAccess form={form} setForm={setForm} />}
        </div>

        {/* Footer Navigation */}
        <div className="p-6 bg-muted/40 border-t border-border flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl h-11 px-6 font-bold"
          >
            Bekor qilish
          </Button>

          <Button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-xl h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-lg shadow-blue-500/20"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Saqlash
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
