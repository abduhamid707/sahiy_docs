"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  Loader2,
  Check,
  ChevronRight,
  ChevronLeft,
  User,
  Phone,
  Briefcase,
  DollarSign,
  FileText,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { WizardFormState } from "./wizard/types";
import { StepBasic } from "./wizard/StepBasic";
import { StepContact } from "./wizard/StepContact";
import { StepEmployment } from "./wizard/StepEmployment";
import { StepSalary } from "./wizard/StepSalary";
import { StepDocuments } from "./wizard/StepDocuments";
import { StepAccess } from "./wizard/StepAccess";

interface StepDef {
  id: number;
  label: string;
  icon: any;
}

const STEPS: StepDef[] = [
  { id: 1, label: "Asosiy", icon: User },
  { id: 2, label: "Aloqa", icon: Phone },
  { id: 3, label: "Ish", icon: Briefcase },
  { id: 4, label: "Maosh", icon: DollarSign },
  { id: 5, label: "Hujjatlar", icon: FileText },
  { id: 6, label: "Kirish", icon: KeyRound },
];

const INITIAL_FORM: WizardFormState = {
  fullName: "",
  employeeId: "",
  avatarUrl: "",
  gender: "MALE",
  birthDate: "",
  age: "",
  address: "",
  notes: "",

  phone: "",
  secondaryPhone: "",
  telegramUsername: "",
  email: "",
  emergencyName: "",
  emergencyRelation: "",
  emergencyPhone: "",

  department: "Call Center",
  position: "Operator",
  role: "SUPPORT",
  isLead: false,
  hiredAt: new Date().toISOString().split("T")[0],
  employmentType: "FULL_TIME",
  workSchedule: "09:00 - 18:00 (6/1)",

  salaryAmount: "",
  salaryCurrency: "USD",
  salaryPayDay: "5",
  salaryNotes: "",

  passportSeries: "",
  passportPinfl: "",
  passportIssuedBy: "",
  passportIssuedAt: "",
  passportExpiresAt: "",
  passportFront: null,
  passportBack: null,

  hasSystemAccess: false,
  loginEmail: "",
  password: "",
  forcePasswordChange: true,
};

export default function AddEmployeeWizard({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<WizardFormState>(INITIAL_FORM);

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!form.fullName.trim()) {
        toast.error("To'liq ismni kiriting");
        return false;
      }
    }
    if (step === 2) {
      if (!form.phone.trim()) {
        toast.error("Asosiy telefon raqamini kiriting");
        return false;
      }
    }
    if (step === 3) {
      if (!form.department || !form.position) {
        toast.error("Bo'lim va lavozimni tanlang");
        return false;
      }
    }
    if (step === 6) {
      if (form.hasSystemAccess) {
        if (!form.loginEmail.trim() || !form.password.trim()) {
          toast.error("Tizimga kirish uchun Email va Parol kiritilishi shart");
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((p) => Math.min(p + 1, 6));
    }
  };

  const handlePrev = () => {
    setCurrentStep((p) => Math.max(p - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(6)) return;

    setSubmitting(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        employeeId: form.employeeId.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
        gender: form.gender,
        birthDate: form.birthDate || undefined,
        age: form.age ? Number(form.age) : undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,

        phone: form.phone.trim(),
        secondaryPhone: form.secondaryPhone.trim() || undefined,
        telegramUsername: form.telegramUsername.trim() || undefined,
        email: form.email.trim() || (form.hasSystemAccess ? form.loginEmail.trim() : undefined),
        emergencyContact: {
          name: form.emergencyName.trim() || undefined,
          relationship: form.emergencyRelation.trim() || undefined,
          phone: form.emergencyPhone.trim() || undefined,
        },

        department: form.department,
        position: form.position,
        role: form.role,
        isLead: form.isLead,
        hiredAt: form.hiredAt ? new Date(form.hiredAt) : new Date(),
        employmentType: form.employmentType,
        workSchedule: form.workSchedule.trim() || undefined,

        salary: {
          amount: form.salaryAmount ? Number(form.salaryAmount) : 0,
          currency: form.salaryCurrency,
          payDay: Number(form.salaryPayDay) || 5,
          notes: form.salaryNotes.trim() || undefined,
        },

        passport: {
          seriesNumber: form.passportSeries.trim() || undefined,
          pinfl: form.passportPinfl.trim() || undefined,
          issuedBy: form.passportIssuedBy.trim() || undefined,
          issuedAt: form.passportIssuedAt ? new Date(form.passportIssuedAt) : undefined,
          expiresAt: form.passportExpiresAt ? new Date(form.passportExpiresAt) : undefined,
          frontFile: form.passportFront || undefined,
          backFile: form.passportBack || undefined,
        },

        hasSystemAccess: form.hasSystemAccess,
        password: form.hasSystemAccess ? form.password : undefined,
        forcePasswordChange: form.forcePasswordChange,
      };

      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Xodim qo'shishda xatolik yuz berdi");
      }

      toast.success("Yangi xodim muvaffaqiyatli qo'shildi!");
      setOpen(false);
      setForm(INITIAL_FORM);
      setCurrentStep(1);
      router.refresh();
      onCreated?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
            <UserPlus className="h-4 w-4" />
            Yangi Xodim Qo'shish
          </Button>
        }
      />

      <DialogContent className="sm:max-w-4xl w-full max-w-4xl rounded-[2.5rem] border border-border shadow-2xl p-0 overflow-hidden bg-card">
        {/* Wizard Header */}
        <div className="bg-muted/30 p-6 border-b border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground flex items-center justify-between">
              <span>Yangi Xodim Qo'shish</span>
              <span className="text-xs font-bold px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full">
                Qadam {currentStep} / 6
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Steps Breadcrumb */}
          <div className="flex items-center justify-between gap-1 mt-6">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isPassed = currentStep > s.id;
              const isCurrent = currentStep === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.id < currentStep) setCurrentStep(s.id);
                  }}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl transition-all ${
                    isCurrent
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold"
                      : isPassed
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-muted-foreground opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {isPassed ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    <span className="text-xs hidden sm:inline">{s.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wizard Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {currentStep === 1 && <StepBasic form={form} setForm={setForm} />}
          {currentStep === 2 && <StepContact form={form} setForm={setForm} />}
          {currentStep === 3 && <StepEmployment form={form} setForm={setForm} />}
          {currentStep === 4 && <StepSalary form={form} setForm={setForm} />}
          {currentStep === 5 && <StepDocuments form={form} setForm={setForm} />}
          {currentStep === 6 && <StepAccess form={form} setForm={setForm} />}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="p-6 bg-muted/30 border-t border-border flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 1 || submitting}
            className="rounded-xl h-11 px-5 font-bold gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Orqaga
          </Button>

          {currentStep < 6 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="rounded-xl h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-md shadow-blue-500/20"
            >
              Davom etish
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-xl h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-wider text-xs shadow-xl"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Xodimni Saqlash"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
