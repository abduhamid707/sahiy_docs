import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import UserManagementTable from "@/components/admin/UserManagementTable";
import AddUserDialog from "@/components/admin/AddUserDialog";

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  
  const role = (session.user as any)?.role;

  // Only SUPER_ADMIN can see this page
  if (role !== "SUPER_ADMIN") {
    redirect("/");
  }

  await dbConnect();
  const users = await User.find().sort({ createdAt: -1 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-sm font-bold uppercase tracking-wider">Xavfsizlik Boshqaruvi</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            Foydalanuvchilar
            <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {users.length} ta faol foydalanuvchi
            </span>
          </h1>
          <AddUserDialog />
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Tizimdagi barcha xodimlarni boshqarish, rollarni tayinlash va ruxsatlarni sozlash.
        </p>
      </div>

      <UserManagementTable 
        initialUsers={JSON.parse(JSON.stringify(users))} 
        currentUserId={(session.user as any).id} 
      />
    </div>
  );
}
