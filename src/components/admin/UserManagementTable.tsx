"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, UserCog, ShieldCheck, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

import { ALL_ROLES } from "@/lib/constants";

const ROLES = ALL_ROLES;

const getRoleColor = (role: string) => {
  switch (role) {
    case "SUPER_ADMIN": return "bg-rose-500 hover:bg-rose-600";
    case "ADMIN": return "bg-blue-600 hover:bg-blue-700";
    case "MOBILE": return "bg-orange-500 hover:bg-orange-600";
    case "FRONTEND": case "BACKEND": return "bg-emerald-600 hover:bg-emerald-700";
    case "VIEWER": return "bg-slate-500 hover:bg-slate-600";
    default: return "bg-indigo-600 hover:bg-indigo-700";
  }
};

export default function UserManagementTable({ initialUsers, currentUserId }: { initialUsers: any[], currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const router = useRouter();

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Rolni yangilashda xatolik yuz berdi");
      }

      setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
      toast.success("Foydalanuvchi roli muvaffaqiyatli yangilandi");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Ushbu foydalanuvchini o'chirishga ishonchingiz komilmi? Bu amalni ortga qaytarib bo'lmaydi.")) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Foydalanuvchini o'chirishda xatolik yuz berdi");
      }

      setUsers(users.filter(u => u._id !== userId));
      toast.success("Foydalanuvchi platformadan muvaffaqiyatli o'chirildi");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="rounded-[2.5rem] border border-border bg-card shadow-xl shadow-slate-900/5 dark:shadow-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="w-[300px] h-16 px-8 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Foydalanuvchi</TableHead>
            <TableHead className="h-16 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Email manzili</TableHead>
            <TableHead className="h-16 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Hozirgi rol</TableHead>
            <TableHead className="h-16 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Rolni o'zgartirish</TableHead>
            <TableHead className="h-16 px-8 text-right text-[10px] font-black uppercase text-muted-foreground tracking-widest">Amallar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user._id} className="hover:bg-muted/50 border-border group transition-colors">
              <TableCell className="px-8 py-5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground font-black group-hover:bg-blue-500/10 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all border border-border">
                    {user.name?.[0]?.toUpperCase() || <UserCog className="h-6 w-6" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user.name || "Noma'lum"}</div>
                    <div className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-tighter">ID: {user._id.slice(-6)}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-5">
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                  <span className="text-sm">{user.email}</span>
                </div>
              </TableCell>
              <TableCell className="py-5">
                <Badge className={`${getRoleColor(user.role)} text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border-none shadow-sm`}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell className="py-5">
                <Select 
                  defaultValue={user.role} 
                  onValueChange={(val) => handleRoleChange(user._id, val || "")}
                  disabled={user._id === currentUserId}
                >
                  <SelectTrigger className="w-[180px] h-10 rounded-xl border-border bg-background shadow-sm focus:ring-blue-500/20 font-bold text-xs">
                    <SelectValue placeholder="Rolni tanlang" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border bg-card shadow-2xl dark:shadow-none">
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role} className="rounded-xl text-xs font-bold py-2 focus:bg-blue-500/10 focus:text-blue-600 dark:focus:text-blue-400 cursor-pointer">
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="px-8 py-5 text-right">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-all active:scale-95"
                  disabled={user._id === currentUserId}
                  onClick={() => handleDelete(user._id)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
