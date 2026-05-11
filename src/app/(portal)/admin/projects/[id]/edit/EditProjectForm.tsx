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
import { ArrowLeft, Save, Trash2, FolderPlus, Plus } from "lucide-react";
import Link from "next/link";

import { ALL_ROLES } from "@/lib/constants";

export default function EditProjectForm({ project, categories: initialCategories = [] }: { project: any, categories?: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || "",
    techStack: project.techStack || "",
    allowedRoles: project.allowedRoles || [],
  });

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName,
          projectId: project._id,
          order: categories.length,
        }),
      });

      if (!res.ok) throw new Error("Kategoriyani qo'shishda xatolik yuz berdi");
      
      const newCat = await res.json();
      setCategories([...categories, newCat]);
      setNewCategoryName("");
      toast.success("Kategoriya muvaffaqiyatli qo'shildi");
    } catch (error) {
      toast.error("Kategoriyani qo'shishda xatolik yuz berdi");
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("Ishonchingiz komilmi? Bu hujjatlarni o'chirmaydi, lekin ular kategoriyasiz qoladi.")) return;

    try {
      const res = await fetch(`/api/admin/categories/${catId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Kategoriyani o'chirishda xatolik yuz berdi");
      
      setCategories(categories.filter(c => c._id !== catId));
      toast.success("Kategoriya o'chirildi");
    } catch (error) {
      toast.error("Kategoriyani o'chirishda xatolik yuz berdi");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/projects/${project._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          techStack: formData.techStack.split(",").map((s: string) => s.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) throw new Error("Loyihani yangilashda xatolik yuz berdi");

      toast.success("Loyiha muvaffaqiyatli yangilandi");
      router.push("/admin/projects");
      router.refresh();
    } catch (error) {
      toast.error("Loyihani yangilashda xatolik yuz berdi");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      allowedRoles: prev.allowedRoles.includes(role)
        ? prev.allowedRoles.filter((r: string) => r !== role)
        : [...prev.allowedRoles, role],
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Loyihani tahrirlash</h1>
          <p className="text-slate-500 font-medium">Mavjud loyiha ma'lumotlari va ruxsatlarini boshqarish.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-10 py-8 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Loyiha tafsilotlari</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Loyihani o'chirish
              </Button>
            </CardHeader>
            <CardContent className="px-10 py-10">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-bold text-slate-700 ml-1">Loyiha nomi</Label>
                    <Input 
                      id="name" 
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
                    className="min-h-[140px] rounded-3xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-blue-500/20 font-medium leading-relaxed p-6 transition-all"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-6">
                  <Label className="text-sm font-bold text-slate-700 ml-1">Kirish nazorati (Rollar)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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

                <div className="flex justify-end gap-4 pt-8 border-t border-slate-100">
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
                    {loading ? "Saqlanmoqda..." : "O'zgarishlarni saqlash"}
                    <Save className="ml-3 h-5 w-5" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden sticky top-24">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-3">
                <FolderPlus className="h-5 w-5 text-blue-500" />
                Kategoriyalar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 px-8 py-8">
              <div className="flex gap-3">
                <Input 
                  placeholder="Yangi kategoriya..." 
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-bold text-sm"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddCategory()}
                />
                <Button 
                  size="icon" 
                  className="h-11 w-11 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-90"
                  onClick={handleAddCategory}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <div key={cat._id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white shadow-sm group hover:border-blue-100 transition-all">
                      <span className="font-bold text-slate-700 text-sm tracking-tight">{cat.name}</span>
                      <button 
                        onClick={() => handleDeleteCategory(cat._id)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50/30">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">Hozircha kategoriyalar yo'q</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
