import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Employee } from "@/models/Employee";
import { getAuthUser } from "@/lib/auth-helper";
import { canUseCrm } from "@/lib/support/access";
import {
  canViewSalary,
  formatSalaryUz,
  maskSalary,
} from "@/lib/employees/service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });
    if (!canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });

    await dbConnect();
    const { id } = await params;

    const emp: any = await Employee.findById(id).lean();
    if (!emp) return NextResponse.json({ error: "Xodim topilmadi" }, { status: 404 });

    const allowSalary = canViewSalary(user);

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

    const avatar = resolveAvatar(emp.avatarUrl);

    const formattedStaff = {
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
      workSchedule: emp.workSchedule || null,
      employmentType: emp.employmentType || "FULL_TIME",
      emergencyContact: emp.emergencyContact || null,
      address: emp.address || null,
      notes: emp.notes || null,
      salary: allowSalary
        ? {
            amount: emp.salary?.amount ?? 0,
            formatted: formatSalaryUz(emp.salary?.amount, emp.salary?.currency || "USD"),
            currency: emp.salary?.currency || "USD",
            payDay: emp.salary?.payDay ?? 5,
            period: emp.salary?.period || "MONTHLY",
          }
        : {
            amount: null,
            formatted: maskSalary(emp.salary?.currency || "USD"),
            currency: emp.salary?.currency || "USD",
            payDay: null,
            period: "MONTHLY",
          },
    };

    return NextResponse.json({ staff: formattedStaff });
  } catch (error: any) {
    console.error("Staff detail error:", error?.message || error);
    return NextResponse.json({ error: "Xodim ma’lumotlarini yuklashda xatolik" }, { status: 500 });
  }
}
