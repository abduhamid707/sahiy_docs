import dbConnect from "@/lib/mongodb";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { normalizeUzPhone } from "@/lib/crm";

export function canManageEmployees(user: any): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "HR") return true;
  if (user.role === "ADMIN" && Boolean(user.isLead)) return true;
  return false;
}

export function canViewSalary(user: any): boolean {
  if (!user) return false;
  return user.role === "SUPER_ADMIN" || user.role === "HR" || user.role === "RAHBAR";
}

export function canViewPassport(user: any): boolean {
  if (!user) return false;
  return user.role === "SUPER_ADMIN" || user.role === "HR" || user.role === "RAHBAR";
}

export function calculateAgeFromBirthDate(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 && age <= 120 ? age : null;
}

export async function generateNextEmployeeId(): Promise<string> {
  await dbConnect();
  const lastEmployee = await Employee.findOne({ employeeId: { $regex: /^SH-\d+$/ } })
    .sort({ createdAt: -1 })
    .select("employeeId")
    .lean();

  if (!lastEmployee || !(lastEmployee as any).employeeId) {
    const total = await Employee.countDocuments();
    return `SH-${String(total + 1).padStart(3, "0")}`;
  }

  const match = (lastEmployee as any).employeeId.match(/^SH-(\d+)$/);
  if (match) {
    const nextNum = parseInt(match[1], 10) + 1;
    return `SH-${String(nextNum).padStart(3, "0")}`;
  }

  const total = await Employee.countDocuments();
  return `SH-${String(total + 1).padStart(3, "0")}`;
}

export function formatSalaryUz(amount: number | null | undefined, currency = "USD"): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "Belgilanmagan";
  const formatted = new Intl.NumberFormat("ru-RU").format(amount);
  if (currency === "USD" || currency === "$") {
    return `$ ${formatted}`;
  }
  return currency === "UZS" ? `${formatted} so‘m` : `${formatted} ${currency}`;
}

export function maskSalary(currency = "USD"): string {
  if (currency === "USD" || currency === "$") {
    return "$ ••••••";
  }
  return `•••••••• ${currency === "UZS" ? "so‘m" : currency}`;
}

export function maskPassport(seriesNumber: string | null | undefined): string {
  if (!seriesNumber) return "Kiritilmagan";
  const clean = seriesNumber.trim();
  if (clean.length < 5) return "••••••";
  const start = clean.slice(0, 4);
  const end = clean.slice(-2);
  return `${start} •• ${end}`;
}

export function maskPinfl(pinfl: string | null | undefined): string {
  if (!pinfl) return "Kiritilmagan";
  const clean = pinfl.trim();
  if (clean.length !== 14) return "••••••••••••••";
  return `${clean.slice(0, 4)} •••••• ${clean.slice(-4)}`;
}

export function serializeEmployeeForUser(emp: any, sessionUser: any, revealSensitive = false) {
  const isSuperAdmin = sessionUser?.role === "SUPER_ADMIN";
  const isHR = sessionUser?.role === "HR";
  const isRahbar = sessionUser?.role === "RAHBAR";

  const allowSalary = isSuperAdmin || isHR || (isRahbar && revealSensitive);
  const allowPassport = isSuperAdmin || isHR || (isRahbar && revealSensitive);

  const rawSalary = emp.salary || {};
  const rawPassport = emp.passport || {};

  return {
    _id: emp._id.toString(),
    id: emp._id.toString(),
    userId: emp.userId ? emp.userId.toString() : null,

    // Basic
    fullName: emp.fullName,
    employeeId: emp.employeeId,
    avatarUrl: emp.avatarUrl || null,
    gender: emp.gender || null,
    birthDate: emp.birthDate || null,
    age: emp.age ?? calculateAgeFromBirthDate(emp.birthDate),
    address: emp.address || null,
    notes: emp.notes || null,

    // Contact
    phone: emp.phone,
    secondaryPhone: emp.secondaryPhone || null,
    telegramUsername: emp.telegramUsername || null,
    telegramPhone: emp.telegramPhone || null,
    email: emp.email || null,
    emergencyContact: emp.emergencyContact || {
      name: null,
      relationship: null,
      phone: null,
    },

    // Employment
    department: emp.department,
    position: emp.position,
    role: emp.role,
    isLead: Boolean(emp.isLead),
    managerId: emp.managerId ? emp.managerId.toString() : null,
    hiredAt: emp.hiredAt,
    employmentType: emp.employmentType || "FULL_TIME",
    status: emp.status || "ACTIVE",
    workSchedule: emp.workSchedule || null,
    probationEndDate: emp.probationEndDate || null,
    termination: emp.termination || { terminatedAt: null, reason: null },

    // Salary
    salary: allowSalary
      ? {
          amount: rawSalary.amount ?? 0,
          formatted: formatSalaryUz(rawSalary.amount, rawSalary.currency || "USD"),
          currency: rawSalary.currency || "USD",
          payDay: rawSalary.payDay ?? 5,
          period: rawSalary.period || "MONTHLY",
          lastPaidAt: rawSalary.lastPaidAt || null,
          nextPayDate: rawSalary.nextPayDate || null,
          notes: rawSalary.notes || null,
        }
      : {
          amount: null,
          formatted: maskSalary(rawSalary.currency || "USD"),
          currency: rawSalary.currency || "USD",
          payDay: null,
          period: "MONTHLY",
          lastPaidAt: null,
          nextPayDate: null,
          notes: null,
        },

    // Passport & Documents
    passport: allowPassport
      ? {
          seriesNumber: rawPassport.seriesNumber || null,
          maskedSeriesNumber: maskPassport(rawPassport.seriesNumber),
          pinfl: rawPassport.pinfl || null,
          maskedPinfl: maskPinfl(rawPassport.pinfl),
          issuedBy: rawPassport.issuedBy || null,
          issuedAt: rawPassport.issuedAt || null,
          expiresAt: rawPassport.expiresAt || null,
          hasFrontFile: Boolean(rawPassport.frontFile?.fileKey),
          hasBackFile: Boolean(rawPassport.backFile?.fileKey),
          frontFile: rawPassport.frontFile || null,
          backFile: rawPassport.backFile || null,
        }
      : {
          seriesNumber: null,
          maskedSeriesNumber: maskPassport(rawPassport.seriesNumber),
          pinfl: null,
          maskedPinfl: maskPinfl(rawPassport.pinfl),
          issuedBy: null,
          issuedAt: null,
          expiresAt: null,
          hasFrontFile: Boolean(rawPassport.frontFile?.fileKey),
          hasBackFile: Boolean(rawPassport.backFile?.fileKey),
          frontFile: null,
          backFile: null,
        },
    documents: allowPassport ? (emp.documents || []) : [],

    // System Access
    hasSystemAccess: Boolean(emp.hasSystemAccess),
    forcePasswordChange: Boolean(emp.forcePasswordChange),

    // Audit
    history: isSuperAdmin || isHR ? (emp.history || []) : [],

    createdAt: emp.createdAt,
    updatedAt: emp.updatedAt,
  };
}

/**
 * Auto-sync existing Users into Employee profiles if not synced yet
 */
export async function syncExistingUsersToEmployees() {
  await dbConnect();
  const users = await User.find({}).lean();
  for (const u of users) {
    const existing = await Employee.findOne({
      $or: [{ userId: u._id }, { email: u.email?.toLowerCase().trim() }],
    });

    if (!existing) {
      const nextId = await generateNextEmployeeId();
      const normPhone = u.phone ? normalizeUzPhone(u.phone) : "+998 90 000 00 00";
      
      let dept = "Call Center";
      let pos = "Operator";
      if (u.role === "SUPER_ADMIN" || u.role === "ADMIN" || u.role === "RAHBAR") {
        dept = "Boshqaruv / Rahbariyat";
        pos = u.role === "RAHBAR" ? "Rahbar" : "Administrator";
      } else if (u.role === "HR") {
        dept = "HR / Kadrlar";
        pos = "HR Menejer";
      } else if (["FRONTEND", "BACKEND", "MOBILE", "DEVOPS", "QA", "DESIGNER", "PM"].includes(u.role)) {
        dept = "IT / Dasturlash";
        pos = u.role;
      }

      await Employee.create({
        userId: u._id,
        fullName: u.name || "Xodim",
        employeeId: nextId,
        avatarUrl: u.image || null,
        phone: normPhone,
        telegramUsername: u.telegramUsername || null,
        email: u.email ? u.email.toLowerCase().trim() : null,
        department: dept,
        position: pos,
        role: u.role || "SUPPORT",
        isLead: Boolean(u.isLead),
        hiredAt: u.createdAt || new Date(),
        status: "ACTIVE",
        hasSystemAccess: true,
        history: [
          {
            action: "MIGRATION_SYNC",
            performedByName: "Tizim",
            details: "Mavjud foydalanuvchi hisobidan xodim profili avtomatik yaratildi",
            timestamp: new Date(),
          },
        ],
      });
    }
  }
}
