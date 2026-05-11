"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

import { ALL_ROLES } from "@/lib/constants";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    techStack: "",
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          techStack: formData.techStack.split(",").map(s => s.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) throw new Error("Loyihani yaratishda xatolik yuz berdi");

      toast.success("Loyiha muvaffaqiyatli yaratildi");
      router.push("/admin/projects");
      router.refresh();
    } catch (error) {
      toast.error("Loyihani yaratishda xatolik yuz berdi");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      allowedRoles: prev.allowedRoles.includes(role)
        ? prev.allowedRoles.filter(r => r !== role)
        : [...prev.allowedRoles, role],
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex items-center gap-6">
        <Link 
          href="/admin/projects" 
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "h-12 w-12 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-95"
          )}
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Yangi loyiha yaratish</h1>
          <p className="text-slate-500 font-medium">Tizimga yangi dasturiy loyiha va uning texnik parametrlarini qo'shish.</p>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-10 py-8">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Loyiha tafsilotlari</CardTitle>
        </CardHeader>
        <CardContent className="px-10 py-10">
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-bold text-slate-700 ml-1">Loyiha nomi</Label>
                <Input 
                  id="name" 
                  placeholder="Masalan: Sahiy Marketplace" 
                  required 
                  className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-blue-500/20 font-bold text-lg transition-all"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="techStack" className="text-sm font-bold text-slate-700 ml-1">Texnologiyalar (vergul bilan)</Label>
                <Input 
                  id="techStack" 
                  placeholder="Next.js, Tailwind, MongoDB" 
                  className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-blue-500/20 font-medium transition-all"
                  value={formData.techStack}
                  onChange={e => setFormData(prev => ({ ...prev, techStack: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-bold text-slate-700 ml-1">Tavsif</Label>
              <Textarea 
                id="description" 
                placeholder="Loyiha maqsadini va uning asosiy vazifalarini qisqacha ta'riflang..." 
                className="min-h-[160px] rounded-3xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-blue-500/20 font-medium leading-relaxed p-6 transition-all"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <Label className="text-sm font-bold text-slate-700 ml-1">Ruxsat berilgan rollar (Kirish nazorati)</Label>
                <p className="text-xs text-slate-400 ml-1 font-medium">Tanlangan rollar ushbu loyiha va uning hujjatlarini ko'rish huquqiga ega bo'ladi.</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {ALL_ROLES.map(role => (
                  <label 
                    key={role}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
                      formData.allowedRoles.includes(role) 
                        ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" 
                        : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200"
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={formData.allowedRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all ${
                      formData.allowedRoles.includes(role) ? "bg-blue-600 border-blue-600" : "bg-white border-slate-200"
                    }`}>
                      {formData.allowedRoles.includes(role) && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-xs font-black uppercase tracking-tighter">{role}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 pt-10 border-t border-slate-100">
              <Button 
                variant="ghost" 
                type="button" 
                className="h-14 px-8 rounded-2xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
                onClick={() => router.back()}
              >
                Bekor qilish
              </Button>
              <Button 
                type="submit" 
                className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all disabled:bg-slate-200"
                disabled={loading}
              >
                {loading ? "Yaratilmoqda..." : "Loyihani yaratish"}
                <Save className="ml-3 h-5 w-5" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
