import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Employee } from "@/models/Employee";
import { getAuthUser } from "@/lib/auth-helper";
import { canUseCrm } from "@/lib/support/access";
import {
  canViewSalary,
  formatSalaryUz,
  maskSalary,
  syncExistingUsersToEmployees,
} from "@/lib/employees/service";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });
    if (!canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });

    await dbConnect();
    await syncExistingUsersToEmployees();

    const allowSalary = canViewSalary(user);

    const employees = await Employee.find({ role: { $ne: "RAHBAR" } })
      .sort({ fullName: 1 })
      .lean();

    const resolveAvatar = (url?: string | null) => {
      if (!url) return null;
      try {
        const parsed = new URL(url);
        if (parsed.pathname.startsWith("/uploads/")) {
          return `${parsed.pathname}${parsed.search}`;
        }
        return url;
      } catch {
        return `/${url.replace(/^\/+/, "")}`;
      }
    };

    const formatted = employees.map((emp: any) => {
      const avatar = resolveAvatar(emp.avatarUrl);
      return {
        id: emp._id.toString(),
        _id: emp._id.toString(),
        name: emp.fullName,
        fullName: emp.fullName,
        employeeId: emp.employeeId,
        email: emp.email || null,
        role: emp.role,
        department: emp.department || "Call Center",
        position: emp.position || "Operator",
        status: emp.status || "ACTIVE",
        isLead: Boolean(emp.isLead),
        image: avatar,
        avatarUrl: avatar,
        phone: emp.phone || null,
        secondaryPhone: emp.secondaryPhone || null,
        telegramUsername: emp.telegramUsername || null,
        age: emp.age || null,
        birthDate: emp.birthDate || null,
        hiredAt: emp.hiredAt || null,
        emergencyContact: emp.emergencyContact || null,
        salary: allowSalary
          ? {
              amount: emp.salary?.amount ?? 0,
              formatted: formatSalaryUz(emp.salary?.amount, emp.salary?.currency || "USD"),
              currency: emp.salary?.currency || "USD",
            }
          : {
              amount: null,
              formatted: maskSalary(emp.salary?.currency || "USD"),
              currency: emp.salary?.currency || "USD",
            },
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Staff list error:", error?.message || error);
    return NextResponse.json({ error: "Xodimlarni yuklashda xatolik" }, { status: 500 });
  }
}
