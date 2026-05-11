"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ALL_ROLES } from "@/lib/constants";

export default function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Foydalanuvchi qo'shishda xatolik yuz berdi");
      }

      toast.success("Yangi foydalanuvchi muvaffaqiyatli qo'shildi");
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-lg shadow-blue-500/20 dark:shadow-none active:scale-95 transition-all">
            <UserPlus className="h-4 w-4" />
            Foydalanuvchi Qo'shish
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] border border-border shadow-2xl p-0 overflow-hidden bg-card">
        <form onSubmit={handleSubmit}>
          <div className="bg-muted/30 p-8 border-b border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-foreground">Yangi Foydalanuvchi</DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-1">
                Platformaga yangi xodim qo'shish va unga tegishli rolni biriktirish.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] font-black uppercase text-muted-foreground/70 tracking-widest ml-1">To'liq ism</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="Masalan: Dostonbek" 
                required 
                className="h-12 rounded-2xl border-border bg-background focus:ring-blue-500/20 font-bold transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase text-muted-foreground/70 tracking-widest ml-1">Email manzili</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="email@example.com" 
                required 
                className="h-12 rounded-2xl border-border bg-background focus:ring-blue-500/20 font-bold transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] font-black uppercase text-muted-foreground/70 tracking-widest ml-1">Parol</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                placeholder="••••••••"
                className="h-12 rounded-2xl border-border bg-background focus:ring-blue-500/20 font-bold transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-[10px] font-black uppercase text-muted-foreground/70 tracking-widest ml-1">Rol</Label>
              <Select name="role" defaultValue="VIEWER">
                <SelectTrigger className="h-12 rounded-2xl border-border bg-background focus:ring-blue-500/20 font-bold transition-all">
                  <SelectValue placeholder="Rolni tanlang" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border bg-card shadow-2xl dark:shadow-none">
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role} className="rounded-xl text-xs font-bold py-2 focus:bg-blue-500/10 focus:text-blue-600 dark:focus:text-blue-400 cursor-pointer">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="p-8 bg-muted/30 border-t border-border">
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl dark:shadow-none"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Foydalanuvchini Saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
