"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

import { ALL_ROLES } from "@/lib/constants";

export default function NewDocForm({ projects, categories }: { projects: any[], categories: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    categoryId: "",
    status: "DRAFT",
    allowedRoles: ["ADMIN", "SUPER_ADMIN"],
  });
  const [keywordsInput, setKeywordsInput] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Filter categories based on selected project
  const filteredCategories = categories.filter(cat => cat.projectId === selectedProjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddingCategory && !formData.categoryId) {
      toast.error("Iltimos, kategoriyani tanlang");
      return;
    }
    
    if (isAddingCategory && !newCategoryName.trim()) {
      toast.error("Iltimos, yangi kategoriya nomini kiriting");
      return;
    }
    
    setLoading(true);

    try {
      const res = await fetch("/api/admin/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          keywords: keywordsInput.split(",").map(k => k.trim()).filter(k => k),
          newCategoryName: isAddingCategory ? newCategoryName : undefined,
          projectId: isAddingCategory ? selectedProjectId : undefined,
        }),
      });

      if (!res.ok) throw new Error("Hujjat yaratishda xatolik yuz berdi");

      toast.success("Hujjat muvaffaqiyatli yaratildi");
      router.push("/admin/docs");
      router.refresh();
    } catch (error) {
      toast.error("Hujjat yaratishda xatolik yuz berdi");
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
          href="/admin/docs" 
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "h-12 w-12 rounded-2xl bg-card border border-border shadow-sm text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-muted transition-all active:scale-95"
          )}
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Yangi hujjat yaratish</h1>
          <p className="text-muted-foreground font-medium">Platforma uchun yangi texnik qo'llanma yoki hujjat qo'shish.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[2.5rem] border-border shadow-xl shadow-slate-900/5 dark:shadow-none overflow-hidden bg-card">
            <CardHeader className="bg-muted/50 border-b border-border px-8 py-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Asosiy ma'lumotlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 px-4 sm:px-8 py-6 sm:py-8">
              <div className="space-y-3">
                <Label htmlFor="title" className="text-sm font-bold text-foreground ml-1">Hujjat sarlavhasi</Label>
                <Input 
                  id="title" 
                  required 
                  placeholder="Masalan: Ma'lumotlar bazasini sozlash bo'yicha qo'llanma"
                  className="h-12 rounded-2xl border-border bg-muted/50 focus:bg-card focus:ring-blue-500/20 font-medium transition-all"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="content" className="text-sm font-bold text-foreground ml-1">Markdown matni</Label>
                <Textarea 
                  id="content" 
                  placeholder="# Bu yerga markdown formatidagi matnni kiriting..."
                  className="min-h-[300px] sm:min-h-[600px] rounded-3xl border-border bg-muted/50 focus:bg-card focus:ring-blue-500/20 font-mono text-sm leading-relaxed p-4 sm:p-6 transition-all"
                  value={formData.content}
                  onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>
 
        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-border shadow-xl shadow-slate-900/5 dark:shadow-none overflow-hidden lg:sticky lg:top-24 bg-card">
            <CardHeader className="bg-muted/50 border-b border-border px-8 py-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Sozlamalar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 px-8 py-8">
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Loyiha</Label>
                <Select 
                  value={selectedProjectId} 
                  onValueChange={(val) => {
                    setSelectedProjectId(val || "");
                    setFormData(prev => ({ ...prev, categoryId: "" }));
                    setIsAddingCategory(false);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-border font-bold text-xs bg-card shadow-sm">
                    <SelectValue placeholder="Loyihani tanlang">
                      {selectedProjectId ? projects.find(p => p._id === selectedProjectId)?.name : "Loyihani tanlang"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border shadow-2xl bg-card">
                    {projects.map((proj) => (
                      <SelectItem key={proj._id} value={proj._id} className="rounded-xl text-xs font-bold py-2 focus:bg-blue-500/10 focus:text-blue-600 dark:focus:text-blue-400">
                        {proj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Kategoriya</Label>
                  {selectedProjectId && (
                    <button 
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(!isAddingCategory);
                        setNewCategoryName("");
                      }}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      {isAddingCategory ? "Bekor qilish" : "Yangi qo'shish"}
                    </button>
                  )}
                </div>
                
                {isAddingCategory ? (
                  <div className="space-y-2">
                    <Input 
                      placeholder="Yangi kategoriya nomi"
                      className="h-11 rounded-xl border-border font-medium text-sm bg-card shadow-sm"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      autoFocus
                    />
                    <p className="text-[10px] font-bold text-muted-foreground ml-1">Yangi hujjat yaratilganda ushbu kategoriya ham yaratiladi.</p>
                  </div>
                ) : (
                  <Select 
                    value={formData.categoryId} 
                    onValueChange={(val) => {
                      if (val === "__NEW_CATEGORY__") {
                        setIsAddingCategory(true);
                      } else {
                        setFormData(prev => ({ ...prev, categoryId: val || "" }));
                      }
                    }}
                    disabled={!selectedProjectId}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-border font-bold text-xs bg-card shadow-sm disabled:bg-muted disabled:opacity-50">
                      <SelectValue placeholder={selectedProjectId ? "Kategoriyani tanlang" : "Loyihani tanlang"}>
                        {formData.categoryId ? categories.find(c => c._id === formData.categoryId)?.name : (selectedProjectId ? "Kategoriyani tanlang" : "Loyihani tanlang")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border shadow-2xl bg-card">
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat._id} value={cat._id} className="rounded-xl text-xs font-bold py-2 focus:bg-blue-500/10 focus:text-blue-600 dark:focus:text-blue-400">
                          {cat.name}
                        </SelectItem>
                      ))}
                      {selectedProjectId && (
                        <SelectItem value="__NEW_CATEGORY__" className="rounded-xl text-xs font-bold py-2 text-blue-600 dark:text-blue-400 focus:bg-blue-500/10 border-t border-border mt-1">
                          + Yangi kategoriya qo'shish
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Holat</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, status: val || "" }))}
                >
                  <SelectTrigger className="h-11 rounded-xl border-border font-bold text-xs bg-card shadow-sm">
                    <SelectValue placeholder="Holatni tanlang" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border shadow-2xl bg-card">
                    <SelectItem value="DRAFT" className="rounded-xl text-xs font-bold py-2 focus:bg-blue-500/10 focus:text-blue-600 dark:focus:text-blue-400">Qoralama</SelectItem>
                    <SelectItem value="REVIEWED" className="rounded-xl text-xs font-bold py-2 focus:bg-blue-500/10 focus:text-blue-600 dark:focus:text-blue-400">Tekshirilgan</SelectItem>
                    <SelectItem value="OUTDATED" className="rounded-xl text-xs font-bold py-2 focus:bg-blue-500/10 focus:text-blue-600 dark:focus:text-blue-400">Eskirgan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Keywords (Kalit so'zlar)</Label>
                <Input 
                  placeholder="Masalan: auth, api, setup"
                  className="h-11 rounded-xl border-border font-medium text-sm bg-card shadow-sm"
                  value={keywordsInput}
                  onChange={e => setKeywordsInput(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground font-medium ml-1">Vergul bilan ajratib yozing.</p>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Kirish huquqlari</Label>
                <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {ALL_ROLES.map(role => (
                    <label 
                      key={role}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
                        formData.allowedRoles.includes(role) 
                          ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm" 
                          : "bg-card border-border text-muted-foreground hover:bg-muted hover:border-border"
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={formData.allowedRoles.includes(role)}
                        onChange={() => toggleRole(role)}
                      />
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all ${
                        formData.allowedRoles.includes(role) ? "bg-blue-600 border-blue-600" : "bg-card border-border"
                      }`}>
                        {formData.allowedRoles.includes(role) && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-black uppercase tracking-tighter">{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <Button 
                  type="submit" 
                  className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:bg-muted disabled:shadow-none disabled:text-muted-foreground" 
                  disabled={loading}
                >
                  {loading ? "Yaratilmoqda..." : "Hujjatni saqlash"}
                  <Save className="ml-3 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
