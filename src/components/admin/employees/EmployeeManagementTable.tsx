"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  User,
  Phone,
  Send,
  Building2,
  Calendar,
  Eye,
  Trash2,
  UserX,
  UserCheck,
  ShieldAlert,
  Loader2,
  Users,
  UserCheck2,
  UserMinus,
  Sparkles,
  Filter,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  DEPARTMENTS,
  ROLE_LABELS,
  EMPLOYEE_STATUS_LABELS,
} from "@/lib/constants";
import EmployeeDetailDrawer from "./EmployeeDetailDrawer";
import AddEmployeeWizard from "./AddEmployeeWizard";
import EditEmployeeModal from "./EditEmployeeModal";

interface EmployeeTableProps {
  initialEmployees: any[];
}

export default function EmployeeManagementTable({
  initialEmployees,
}: EmployeeTableProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUser = session?.user as any;
  const isSuperAdmin = sessionUser?.role === "SUPER_ADMIN";
  const isHR = sessionUser?.role === "HR";
  const canEdit = isSuperAdmin || isHR;

  const [employees, setEmployees] = useState<any[]>(initialEmployees);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const [activeEmployee, setActiveEmployee] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.status === "ACTIVE").length;
    const onLeave = employees.filter((e) => e.status === "ON_LEAVE").length;
    const terminated = employees.filter((e) => e.status === "TERMINATED").length;
    return { total, active, onLeave, terminated };
  }, [employees]);

  // Filtering
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matches =
          emp.fullName?.toLowerCase().includes(q) ||
          emp.employeeId?.toLowerCase().includes(q) ||
          emp.phone?.toLowerCase().includes(q) ||
          emp.email?.toLowerCase().includes(q) ||
          emp.position?.toLowerCase().includes(q) ||
          emp.department?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (selectedDept !== "ALL" && emp.department !== selectedDept) {
        return false;
      }

      if (selectedStatus !== "ALL" && emp.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [employees, search, selectedDept, selectedStatus]);

  const refreshList = async () => {
    try {
      const res = await fetch("/api/admin/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openDrawer = (emp: any) => {
    setActiveEmployee(emp);
    setDrawerOpen(true);
  };

  const handleStatusChange = async (empId: string, newStatus: string) => {
    setActionLoadingId(empId);
    try {
      const res = await fetch(`/api/admin/employees/${empId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Holatni yangilashda xatolik");
      }

      setEmployees((prev) =>
        prev.map((e) => (e._id === empId ? { ...e, status: newStatus } : e))
      );
      toast.success("Xodim holati yangilandi");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeactivate = async (emp: any) => {
    if (!confirm(`${emp.fullName}ni xodimlar safidan chiqarish (deaktivatsiya qilish)ni xohlaysizmi?`)) {
      return;
    }

    setActionLoadingId(emp._id);
    try {
      const res = await fetch(`/api/admin/employees/${emp._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Deaktivatsiya qilishda xatolik");
      }

      setEmployees((prev) =>
        prev.map((e) => (e._id === emp._id ? { ...e, status: "TERMINATED", hasSystemAccess: false } : e))
      );
      toast.success("Xodim muvaffaqiyatli deaktivatsiya qilindi");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleHardDelete = async (emp: any) => {
    if (!isSuperAdmin) return;
    const check = prompt(
      `DIQQAT: Ushbu amal xodimni butunlay o'chiradi. Tasdiqlash uchun xodim ismini kiriting: "${emp.fullName}"`
    );
    if (check !== emp.fullName) {
      if (check !== null) toast.error("Ism mos kelmadi");
      return;
    }

    setActionLoadingId(emp._id);
    try {
      const res = await fetch(`/api/admin/employees/${emp._id}?hard=true`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "O'chirishda xatolik");
      }

      setEmployees((prev) => prev.filter((e) => e._id !== emp._id));
      toast.success("Xodim bazadan butunlay o'chirildi");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
            Faol
          </Badge>
        );
      case "ON_LEAVE":
        return (
          <Badge className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-lg border border-amber-500/20">
            Ta’tilda
          </Badge>
        );
      case "INACTIVE":
        return (
          <Badge className="bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-lg border border-slate-500/20">
            Vaqtincha nofaol
          </Badge>
        );
      case "TERMINATED":
        return (
          <Badge className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-lg border border-rose-500/20">
            Bo‘shagan
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Metric Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-[2rem] border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground block">
              Jami xodimlar
            </span>
            <span className="text-2xl font-black text-foreground mt-0.5 block">
              {stats.total}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-[2rem] border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
            <UserCheck2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground block">
              Faol xodimlar
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {stats.active}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-[2rem] border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground block">
              Ta’tilda
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
              {stats.onLeave}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-[2rem] border border-border bg-card shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black">
            <UserMinus className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground block">
              Ishdan bo‘shagan
            </span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
              {stats.terminated}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filter & Action Bar */}
      <div className="p-4 rounded-[2rem] border border-border bg-card shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ism, telefon, lavozim, tabel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-10 rounded-xl bg-background font-medium border-border"
            />
          </div>

          {/* Department Filter */}
          <Select value={selectedDept} onValueChange={(val) => setSelectedDept(val || "ALL")}>
            <SelectTrigger className="w-[180px] h-11 rounded-xl font-semibold text-xs border-border bg-background">
              <SelectValue placeholder="Barcha bo'limlar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Barcha bo'limlar</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val || "ALL")}>
            <SelectTrigger className="w-[150px] h-11 rounded-xl font-semibold text-xs border-border bg-background">
              <SelectValue placeholder="Barcha holatlar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Barcha holatlar</SelectItem>
              <SelectItem value="ACTIVE">Faol</SelectItem>
              <SelectItem value="ON_LEAVE">Ta’tilda</SelectItem>
              <SelectItem value="INACTIVE">Vaqtincha nofaol</SelectItem>
              <SelectItem value="TERMINATED">Ishdan bo‘shagan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <AddEmployeeWizard onCreated={refreshList} />
        </div>
      </div>

      {/* 3. Employees Management Table */}
      <div className="rounded-[2.5rem] border border-border bg-card shadow-xl shadow-slate-900/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="h-16 px-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Xodim
              </TableHead>
              <TableHead className="h-16 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Telefon / Telegram
              </TableHead>
              <TableHead className="h-16 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Bo'lim
              </TableHead>
              <TableHead className="h-16 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Lavozim
              </TableHead>
              <TableHead className="h-16 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Ishga kirgan
              </TableHead>
              <TableHead className="h-16 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Holat
              </TableHead>
              <TableHead className="h-16 px-6 text-right text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Amallar
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-44 text-center text-muted-foreground text-sm">
                  Hech qanday xodim topilmadi
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => {
                const isLoading = actionLoadingId === emp._id;
                return (
                  <TableRow
                    key={emp._id}
                    className="hover:bg-muted/50 border-border group transition-colors cursor-pointer"
                    onClick={() => openDrawer(emp)}
                  >
                    {/* Xodim */}
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="h-11 w-11 rounded-2xl overflow-hidden bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black border border-blue-500/20 text-sm flex-shrink-0">
                          {emp.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt={emp.fullName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{emp.fullName?.charAt(0)?.toUpperCase() || "X"}</span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {emp.fullName}
                          </div>
                          <div className="text-[11px] font-bold text-blue-600/80 dark:text-blue-400/80 font-mono">
                            {emp.employeeId || "—"}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Telefon */}
                    <TableCell className="py-4">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          {emp.phone || "—"}
                        </div>
                        {emp.telegramUsername ? (
                          <div className="text-[11px] font-medium text-sky-500 flex items-center gap-1.5">
                            <Send className="w-3 h-3" />
                            {emp.telegramUsername}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>

                    {/* Bo'lim */}
                    <TableCell className="py-4">
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        {emp.department}
                      </div>
                    </TableCell>

                    {/* Lavozim */}
                    <TableCell className="py-4">
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          {emp.position}
                        </div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {ROLE_LABELS[emp.role as keyof typeof ROLE_LABELS] || emp.role}
                        </div>
                      </div>
                    </TableCell>

                    {/* Ishga kirgan */}
                    <TableCell className="py-4">
                      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {emp.hiredAt
                          ? new Date(emp.hiredAt).toLocaleDateString("ru-RU")
                          : "—"}
                      </div>
                    </TableCell>

                    {/* Holat */}
                    <TableCell className="py-4">
                      {getStatusBadge(emp.status)}
                    </TableCell>

                    {/* Amallar */}
                    <TableCell className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDrawer(emp)}
                          className="h-9 w-9 rounded-xl hover:bg-blue-500/10 hover:text-blue-600"
                          title="Profilni ko'rish"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isLoading}
                            onClick={() => setEditingEmployee(emp)}
                            className="h-9 w-9 rounded-xl hover:bg-blue-500/10 hover:text-blue-600"
                            title="Tahrirlash"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}

                        {emp.status === "ACTIVE" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isLoading}
                            onClick={() => handleDeactivate(emp)}
                            className="h-9 w-9 rounded-xl hover:bg-amber-500/10 hover:text-amber-600"
                            title="Xodimni deaktivatsiya qilish"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isLoading}
                            onClick={() => handleStatusChange(emp._id, "ACTIVE")}
                            className="h-9 w-9 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600"
                            title="Qayta faollashtirish"
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                        )}

                        {isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isLoading}
                            onClick={() => handleHardDelete(emp)}
                            className="h-9 w-9 rounded-xl hover:bg-rose-500/10 hover:text-rose-600"
                            title="Butunlay o'chirish (Super Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Drawer */}
      <EmployeeDetailDrawer
        employee={activeEmployee}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setActiveEmployee(null);
        }}
        onRefresh={refreshList}
      />

      {/* Edit Modal */}
      <EditEmployeeModal
        employee={editingEmployee}
        open={Boolean(editingEmployee)}
        onClose={() => setEditingEmployee(null)}
        onUpdated={refreshList}
      />
    </div>
  );
}
