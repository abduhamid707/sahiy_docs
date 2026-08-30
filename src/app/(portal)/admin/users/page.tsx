import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Employee } from "@/models/Employee";
import { ShieldCheck, Users } from "lucide-react";
import { redirect } from "next/navigation";
import EmployeeManagementTable from "@/components/admin/employees/EmployeeManagementTable";
import {
  serializeEmployeeForUser,
  syncExistingUsersToEmployees,
} from "@/lib/employees/service";

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const sessionUser = session.user as any;
  const role = sessionUser?.role;
  const isLead = sessionUser?.isLead;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isHR = role === "HR";
  const isRahbar = role === "RAHBAR";

  if (!isSuperAdmin && !isHR && !isRahbar && !isLead) {
    redirect("/");
  }

  await dbConnect();
  // Auto-sync any existing User accounts to Employee records
  await syncExistingUsersToEmployees();

  let query: any = {};
  if (!isSuperAdmin && !isHR && !isRahbar && isLead) {
    // Lead can see users of their own role/department
    query = { role: role };
  }

  const rawEmployees = await Employee.find(query)
    .sort({ createdAt: -1 })
    .lean();

  const formatted = rawEmployees.map((emp: any) =>
    serializeEmployeeForUser(emp, sessionUser, false)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-sm font-bold uppercase tracking-wider">
            HR va Xodimlar Boshqaruvi
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            Xodimlar Boshqaruvi
            <span className="text-sm font-normal text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {formatted.length} ta xodim
            </span>
          </h1>
        </div>
        <p className="text-muted-foreground max-w-3xl text-sm">
          Kompaniyadagi barcha xodimlarning shaxsiy, aloqa, lavozim, maosh va hujjat ma’lumotlarini xavfsiz boshqarish tizimi.
        </p>
      </div>

      <EmployeeManagementTable
        initialEmployees={JSON.parse(JSON.stringify(formatted))}
      />
    </div>
  );
}
