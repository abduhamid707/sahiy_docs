"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Phone,
  Send,
  Mail,
  Briefcase,
  DollarSign,
  FileText,
  KeyRound,
  History,
  Eye,
  EyeOff,
  Download,
  Calendar,
  Clock,
  Building2,
  HeartHandshake,
  X,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { ROLE_LABELS, EMPLOYMENT_TYPE_LABELS } from "@/lib/constants";
import EditEmployeeModal from "./EditEmployeeModal";

interface EmployeeDetailProps {
  employee: any | null;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-xl border border-emerald-500/20 shadow-none">
          Faol
        </Badge>
      );
    case "ON_LEAVE":
      return (
        <Badge className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-xl border border-amber-500/20 shadow-none">
          Ta’tilda
        </Badge>
      );
    case "INACTIVE":
      return (
        <Badge className="bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-xl border border-slate-500/20 shadow-none">
          Vaqtincha nofaol
        </Badge>
      );
    case "TERMINATED":
      return (
        <Badge className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-xl border border-rose-500/20 shadow-none">
          Bo‘shagan
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function EmployeeDetailDrawer({
  employee,
  open,
  onClose,
  onRefresh,
}: EmployeeDetailProps) {
  const { data: session } = useSession();
  const sessionUser = session?.user as any;
  const canEdit = sessionUser?.role === "SUPER_ADMIN" || sessionUser?.role === "HR";

  const [activeTab, setActiveTab] = useState<
    "general" | "employment" | "salary" | "documents" | "access" | "audit"
  >("general");

  const [revealSensitive, setRevealSensitive] = useState(false);
  const [loadingReveal, setLoadingReveal] = useState(false);
  const [revealedData, setRevealedData] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [avatarZoom, setAvatarZoom] = useState(false);

  if (!employee) return null;

  const currentEmp = revealedData || employee;

  const handleToggleReveal = async () => {
    if (revealSensitive) {
      setRevealSensitive(false);
      setRevealedData(null);
      return;
    }

    setLoadingReveal(true);
    try {
      const res = await fetch(`/api/admin/employees/${employee._id}?reveal=true`);
      if (!res.ok) {
        throw new Error("Maxfiy ma'lumotlarni ko'rishga ruxsat berilmadi");
      }
      const data = await res.json();
      setRevealedData(data);
      setRevealSensitive(true);
      toast.success("Maxfiy ma'lumotlar ochildi");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingReveal(false);
    }
  };

  const calculateTenure = (hiredAtDate: string | Date) => {
    if (!hiredAtDate) return "—";
    const start = new Date(hiredAtDate);
    const now = new Date();
    const diffMonths =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth());
    if (diffMonths < 1) return "Yangi xodim (1 oydan kam)";
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;
    if (years === 0) return `${months} oy`;
    if (months === 0) return `${years} yil`;
    return `${years} yil ${months} oy`;
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-4xl w-full max-w-4xl rounded-[2.5rem] border border-border shadow-2xl p-0 overflow-hidden bg-card"
      >
        {/* Header Profile Bar */}
        <div className="bg-muted/40 p-6 md:p-8 border-b border-border relative">
          {/* Top Right Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 h-9 w-9 rounded-xl bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center border border-border transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pr-10">
            <div className="flex items-center gap-5">
              <button
                type="button"
                disabled={!currentEmp.avatarUrl}
                onClick={() => currentEmp.avatarUrl && setAvatarZoom(true)}
                className={`h-16 w-16 md:h-20 md:w-20 rounded-2xl overflow-hidden bg-blue-600 text-white flex items-center justify-center text-2xl md:text-3xl font-black shadow-xl shadow-blue-500/20 border-2 border-blue-400/30 flex-shrink-0 transition-transform ${
                  currentEmp.avatarUrl ? "cursor-pointer hover:scale-105" : ""
                }`}
                title={currentEmp.avatarUrl ? "Rasmni kattalashtirish" : undefined}
              >
                {currentEmp.avatarUrl ? (
                  <img
                    src={currentEmp.avatarUrl}
                    alt={currentEmp.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{currentEmp.fullName?.charAt(0)?.toUpperCase() || "X"}</span>
                )}
              </button>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl md:text-2xl font-black text-foreground">
                    {currentEmp.fullName}
                  </h2>
                  {getStatusBadge(currentEmp.status)}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm font-semibold text-muted-foreground">
                  <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">
                    {currentEmp.employeeId || "SH-001"}
                  </span>
                  <span>•</span>
                  <span>{currentEmp.position}</span>
                  <span>•</span>
                  <span>{currentEmp.department}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Contact Buttons & Edit */}
            <div className="flex items-center gap-2.5">
              {canEdit && (
                <Button
                  onClick={() => setEditOpen(true)}
                  className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Tahrirlash
                </Button>
              )}
              {currentEmp.phone && (
                <a
                  href={`tel:${currentEmp.phone}`}
                  className="h-11 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs inline-flex items-center gap-2 transition-all border border-emerald-500/20 shadow-sm"
                >
                  <Phone className="w-4 h-4" />
                  Qo'ng'iroq
                </a>
              )}
              {currentEmp.telegramUsername && (
                <a
                  href={`https://t.me/${currentEmp.telegramUsername.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-11 px-4 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-xs inline-flex items-center gap-2 transition-all border border-sky-500/20 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  Telegram
                </a>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-8 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "general", label: "Umumiy", icon: User },
              { id: "employment", label: "Ish", icon: Briefcase },
              { id: "salary", label: "Maosh", icon: DollarSign },
              { id: "documents", label: "Hujjatlar", icon: FileText },
              { id: "access", label: "Kirish huquqi", icon: KeyRound },
              { id: "audit", label: "Tarix", icon: History },
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

        {/* Drawer Body Content */}
        <div className="p-6 md:p-8 max-h-[60vh] overflow-y-auto space-y-6">
          {/* TAB 1: UMUMIY & ALOQA */}
          {activeTab === "general" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    Shaxsiy ma'lumotlar
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Jinsi:</span>
                      <span className="font-bold text-foreground">
                        {currentEmp.gender === "MALE"
                          ? "Erkak"
                          : currentEmp.gender === "FEMALE"
                          ? "Ayol"
                          : "Belgilanmagan"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Tug'ilgan sana:</span>
                      <span className="font-bold text-foreground">
                        {currentEmp.birthDate
                          ? new Date(currentEmp.birthDate).toLocaleDateString("ru-RU")
                          : "Belgilanmagan"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Yoshi:</span>
                      <span className="font-bold text-foreground">
                        {currentEmp.age ? `${currentEmp.age} yosh` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">Manzil:</span>
                      <span className="font-bold text-foreground text-right max-w-[220px]">
                        {currentEmp.address || "Belgilanmagan"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    Aloqa ma'lumotlari
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Asosiy telefon:</span>
                      <span className="font-bold text-foreground">{currentEmp.phone || "—"}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Qo'shimcha tel:</span>
                      <span className="font-bold text-foreground">{currentEmp.secondaryPhone || "—"}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Telegram:</span>
                      <span className="font-bold text-sky-500">{currentEmp.telegramUsername || "—"}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-bold text-foreground">{currentEmp.email || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                {currentEmp.emergencyContact?.name && (
                  <div className="md:col-span-2 p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <HeartHandshake className="w-4 h-4" />
                      Favqulodda aloqa (Emergency Contact)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground block mb-1">Ismi:</span>
                        <span className="font-bold text-foreground text-sm">{currentEmp.emergencyContact.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Qarindoshligi:</span>
                        <span className="font-bold text-foreground text-sm">{currentEmp.emergencyContact.relationship || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Telefoni:</span>
                        <span className="font-bold text-foreground text-sm font-mono">{currentEmp.emergencyContact.phone || "—"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ISH MA'LUMOTLARI */}
          {activeTab === "employment" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    Bo'lim va Lavozim
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Bo'lim:</span>
                      <span className="font-bold text-foreground">{currentEmp.department}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Lavozim:</span>
                      <span className="font-bold text-foreground">{currentEmp.position}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Tizimdagi rol:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {ROLE_LABELS[currentEmp.role as keyof typeof ROLE_LABELS] || currentEmp.role}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">Team Lead:</span>
                      <span className="font-bold text-foreground">{currentEmp.isLead ? "Ha (Lead)" : "Yo'q"}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500" />
                    Staj va Grafik
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Ishga kirgan sana:</span>
                      <span className="font-bold text-foreground">
                        {currentEmp.hiredAt ? new Date(currentEmp.hiredAt).toLocaleDateString("ru-RU") : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Ish staji:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {calculateTenure(currentEmp.hiredAt)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Bandlik turi:</span>
                      <span className="font-bold text-foreground">
                        {EMPLOYMENT_TYPE_LABELS[currentEmp.employmentType] || currentEmp.employmentType}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">Ish grafigi:</span>
                      <span className="font-bold text-foreground">{currentEmp.workSchedule || "09:00 - 18:00 (5/2)"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MAOSH */}
          {activeTab === "salary" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Maxfiy Maosh Ma'lumotlari
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ushbu ma'lumotlar faqat ruxsatli foydalanuvchilar uchun ochiladi
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleToggleReveal}
                  disabled={loadingReveal}
                  className="rounded-xl font-bold text-xs gap-2 bg-background shadow-sm h-10 px-4"
                >
                  {revealSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {revealSensitive ? "Yashirish" : "Ko'rsatish"}
                </Button>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card space-y-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-muted/40 border border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Oylik miqdori
                    </span>
                    <span className="text-xl font-black text-foreground mt-2 block font-mono">
                      {currentEmp.salary?.formatted || "•••••••• so‘m"}
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-muted/40 border border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Maosh to'lanadigan kun
                    </span>
                    <span className="text-xl font-black text-foreground mt-2 block">
                      {currentEmp.salary?.payDay ? `Har oyning ${currentEmp.salary.payDay}-sanasi` : "5-sanasi"}
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-muted/40 border border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      To'lov davri
                    </span>
                    <span className="text-xl font-black text-foreground mt-2 block">
                      Oyiga bir marta
                    </span>
                  </div>
                </div>

                {currentEmp.salary?.notes && (
                  <div className="p-4 rounded-xl bg-muted/20 border border-border text-xs">
                    <span className="text-muted-foreground block font-bold mb-1">Maosh izohi:</span>
                    <p className="text-foreground">{currentEmp.salary.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: HUJJATLAR & PASPORT */}
          {activeTab === "documents" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Pasport va Shaxsiy Hujjatlar
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Xavfsiz shaxsiy ombordan yuklanadi
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleToggleReveal}
                  disabled={loadingReveal}
                  className="rounded-xl font-bold text-xs gap-2 bg-background shadow-sm h-10 px-4"
                >
                  {revealSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {revealSensitive ? "Yashirish" : "Ko'rsatish"}
                </Button>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card space-y-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Pasport seriya va raqam:</span>
                    <span className="font-bold text-foreground font-mono text-sm">
                      {currentEmp.passport?.seriesNumber || currentEmp.passport?.maskedSeriesNumber || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">JShShIR / PINFL:</span>
                    <span className="font-bold text-foreground font-mono text-sm">
                      {currentEmp.passport?.pinfl || currentEmp.passport?.maskedPinfl || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Kim tomonidan berilgan:</span>
                    <span className="font-bold text-foreground">
                      {currentEmp.passport?.issuedBy || "Belgilanmagan"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Amal qilish muddati:</span>
                    <span className="font-bold text-foreground">
                      {currentEmp.passport?.expiresAt
                        ? new Date(currentEmp.passport.expiresAt).toLocaleDateString("ru-RU")
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Passport File Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {currentEmp.passport?.frontFile?.fileKey ? (
                    <a
                      href={`/api/admin/employees/documents/${currentEmp.passport.frontFile.fileKey}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-4 rounded-2xl border border-border hover:border-blue-500/40 bg-muted/20 flex items-center justify-between text-xs font-bold text-foreground transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div>
                          <span>Pasport old tomoni</span>
                          <span className="block text-[11px] text-muted-foreground font-normal truncate max-w-[180px]">
                            {currentEmp.passport.frontFile.fileName}
                          </span>
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </a>
                  ) : (
                    <div className="p-4 rounded-2xl border border-dashed border-border text-center text-xs text-muted-foreground">
                      Pasport oldi yuklanmagan
                    </div>
                  )}

                  {currentEmp.passport?.backFile?.fileKey ? (
                    <a
                      href={`/api/admin/employees/documents/${currentEmp.passport.backFile.fileKey}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-4 rounded-2xl border border-border hover:border-blue-500/40 bg-muted/20 flex items-center justify-between text-xs font-bold text-foreground transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div>
                          <span>Pasport orqa tomoni</span>
                          <span className="block text-[11px] text-muted-foreground font-normal truncate max-w-[180px]">
                            {currentEmp.passport.backFile.fileName}
                          </span>
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </a>
                  ) : (
                    <div className="p-4 rounded-2xl border border-dashed border-border text-center text-xs text-muted-foreground">
                      Pasport orqasi yuklanmagan
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: KIRISH HUQUQI */}
          {activeTab === "access" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-6 rounded-2xl border border-border bg-card space-y-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-6 h-6 text-blue-500" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        Tizimga kirish holati
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {currentEmp.hasSystemAccess
                          ? "Xodim platformaga kirish uchun akkountga ega"
                          : "Xodim faqat HR ma'lumotlar bazasida mavjud"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      currentEmp.hasSystemAccess
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold px-3 py-1 rounded-xl"
                        : "bg-slate-500/10 text-slate-600 border border-slate-500/20 font-bold px-3 py-1 rounded-xl"
                    }
                  >
                    {currentEmp.hasSystemAccess ? "Ruxsat berilgan" : "Login yo'q"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-1">Login Email:</span>
                    <span className="font-bold text-foreground text-sm">{currentEmp.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Tizimdagi rol:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {ROLE_LABELS[currentEmp.role as keyof typeof ROLE_LABELS] || currentEmp.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT TARIXI */}
          {activeTab === "audit" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" />
                Amallar tarixi (Audit Trail)
              </h4>
              {currentEmp.history && currentEmp.history.length > 0 ? (
                <div className="space-y-2.5">
                  {currentEmp.history.map((h: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-border bg-card flex items-start justify-between gap-4 text-xs shadow-sm"
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-foreground block text-sm">
                          {h.details || h.action}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          Bajaruvchi: {h.performedByName || "Tizim"}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap bg-muted px-2.5 py-1 rounded-lg">
                        {h.timestamp ? new Date(h.timestamp).toLocaleString("ru-RU") : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                  Amallar tarixi mavjud emas
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-muted/40 border-t border-border flex items-center justify-between">
          <div>
            {canEdit && (
              <Button
                type="button"
                onClick={() => setEditOpen(true)}
                className="rounded-xl h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-md shadow-blue-500/20 text-xs"
              >
                <Pencil className="w-4 h-4" />
                Ma'lumotlarni Tahrirlash
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl h-11 px-6 font-bold text-xs"
          >
            Yopish
          </Button>
        </div>
      </DialogContent>

      {/* Edit Modal */}
      <EditEmployeeModal
        employee={currentEmp}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onUpdated={(updated) => {
          setRevealedData(updated);
          onRefresh?.();
        }}
      />

      {/* Avatar Full Zoom Modal */}
      {avatarZoom && currentEmp.avatarUrl && (
        <Dialog open={avatarZoom} onOpenChange={setAvatarZoom}>
          <DialogContent
            showCloseButton={false}
            className="sm:max-w-md w-full p-4 bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => setAvatarZoom(false)}
                className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={currentEmp.avatarUrl}
                alt={currentEmp.fullName}
                className="w-full h-auto max-h-[70vh] object-contain rounded-2xl"
              />
              <div className="text-center pt-3 font-bold text-sm text-foreground">
                {currentEmp.fullName}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
