import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/models/Project";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Edit2, Trash2, Shield, Download } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { ImportButton } from "@/components/shared/ImportButton";

export default async function AdminProjectsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    redirect("/");
  }

  await dbConnect();
  const projects = await Project.find({}).sort({ createdAt: -1 });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
            <Shield className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Tizim Nazorati</span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Loyihalar Boshqaruvi</h1>
          <p className="text-muted-foreground font-medium mt-1">Ichki loyihalar, bo'limlar va ularga kirish huquqlarini markaziy boshqarish.</p>
        </div>
        <div className="flex gap-2">
          <ImportButton />
          <Link 
            href="/admin/projects/new" 
            className={cn(
              buttonVariants({ variant: "default" }), 
              "h-12 px-6 rounded-2xl bg-slate-900 hover:bg-blue-600 text-white font-bold transition-all shadow-xl shadow-slate-200 dark:shadow-none active:scale-95 gap-2 group"
            )}
          >
            <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
            Yangi loyiha
          </Link>
        </div>
      </div>

      <div className="rounded-[2.5rem] border border-border bg-card shadow-xl shadow-slate-900/5 dark:shadow-none overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="h-16 px-8 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Loyiha nomi</TableHead>
              <TableHead className="h-16 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tavsif</TableHead>
              <TableHead className="h-16 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Ruxsatlar</TableHead>
              <TableHead className="h-16 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Yaratilgan sana</TableHead>
              <TableHead className="h-16 px-8 text-right text-[10px] font-black uppercase text-muted-foreground tracking-widest">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project: any) => (
              <TableRow key={project._id.toString()} className="hover:bg-muted/50 border-border group transition-colors">
                <TableCell className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground font-black group-hover:bg-blue-500/10 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all border border-border">
                      {project.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{project.name}</div>
                      <div className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-tighter">PROJECT_ID: {project._id.toString().slice(-6)}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-6">
                  <p className="text-sm text-muted-foreground font-medium max-w-xs truncate">
                    {project.description || "Tavsif mavjud emas"}
                  </p>
                </TableCell>
                <TableCell className="py-6">
                  <div className="flex flex-wrap gap-1.5">
                    {project.allowedRoles?.slice(0, 2).map((r: string) => (
                      <span key={r} className="inline-flex items-center rounded-lg bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {r}
                      </span>
                    ))}
                    {project.allowedRoles?.length > 2 && (
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter px-1">+{project.allowedRoles.length - 2} yana</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-6">
                  <div className="text-xs font-bold text-muted-foreground">
                    {new Date(project.createdAt).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </TableCell>
                <TableCell className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-1">
                    <a 
                      href={`/api/projects/${project._id}/export`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "h-10 w-10 rounded-xl text-muted-foreground hover:text-green-600 hover:bg-green-500/10 dark:hover:bg-green-500/10 transition-all"
                      )}
                      title="Eksport qilish"
                    >
                      <Download className="h-4.5 w-4.5" />
                    </a>
                    <Link 
                      href={`/admin/projects/${project._id}/edit`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "h-10 w-10 rounded-xl text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 transition-all"
                      )}
                    >
                      <Edit2 className="h-4.5 w-4.5" />
                    </Link>
                    <DeleteButton 
                      id={project._id.toString()}
                      apiUrl="/api/projects"
                      itemName="Loyiha"
                      title="Loyihani o'chirish"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-16 w-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground">
                      <Plus className="h-8 w-8" />
                    </div>
                    <div className="text-muted-foreground font-bold text-sm">Loyihalar hali yaratilmagan.</div>
                    <Link href="/admin/projects/new" className="text-blue-600 font-bold text-xs hover:underline">Birinchi loyihani yaratish</Link>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
