import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Document } from "@/models/Document";
import { Project } from "@/models/Project";
import { Category } from "@/models/Category";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  FileText
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { ImportExportButtons } from "@/components/shared/ImportExportButtons";

export default async function AdminDocsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const isDeveloper = role === "MOBILE" || role === "FRONTEND";

  if (!isAdmin && !isDeveloper) {
    redirect("/");
  }

  await dbConnect();
  
  let query: any = {};
  
  if (!isAdmin) {
    // 1. Find all projects allowed for this role
    const allowedProjects = await Project.find({ allowedRoles: role }).select("_id");
    const projectIds = allowedProjects.map(p => p._id);
    
    // 2. Find all categories belonging to these projects
    const allowedCategories = await Category.find({ projectId: { $in: projectIds } }).select("_id");
    const categoryIds = allowedCategories.map(c => c._id);
    
    // 3. Query documents: (belongs to allowed categories AND has role) OR (is the owner)
    query = { 
      $or: [
        { 
          categoryId: { $in: categoryIds },
          allowedRoles: role 
        },
        { owner: (session?.user as any)?.id }
      ]
    };
  }
  
  // Fetch docs and populate related fields
  const docs = await Document.find(query)
    .populate({
      path: 'categoryId',
      model: Category,
      populate: {
        path: 'projectId',
        model: Project
      }
    })
    .populate('owner')
    .sort({ updatedAt: -1 });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "REVIEWED": return { label: "Tekshirilgan", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
      case "DRAFT": return { label: "Qoralama", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
      case "OUTDATED": return { label: "Eskirgan", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" };
      default: return { label: status, color: "bg-muted text-muted-foreground border-border" };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
            <FileText className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Hujjatlar Ombori</span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Kontent Menejeri</h1>
          <p className="text-muted-foreground font-medium mt-1">Hujjatlar sahifalarini tahrirlash, yangilash yoki arxivlash tizimi.</p>
        </div>

        <div className="flex items-center gap-3">
          <ImportExportButtons />
          <Link 
            href="/admin/docs/new" 
            className={cn(
              buttonVariants({ variant: "default" }), 
              "h-12 px-6 rounded-2xl bg-slate-900 hover:bg-blue-600 text-white font-bold transition-all shadow-xl shadow-slate-200 dark:shadow-none active:scale-95 gap-2 group"
            )}
          >
            <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" /> 
            Hujjat yaratish
          </Link>
        </div>
      </div>

      <div className="rounded-[2.5rem] border border-border bg-card shadow-2xl dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="h-16 px-8 text-[10px] font-black uppercase text-muted-foreground tracking-widest min-w-[300px]">Hujjat sarlavhasi</TableHead>
                <TableHead className="h-16 text-[10px] font-black uppercase text-muted-foreground tracking-widest min-w-[200px]">Loyiha / Kategoriya</TableHead>
                <TableHead className="h-16 text-[10px] font-black uppercase text-muted-foreground tracking-widest min-w-[120px]">Holat</TableHead>
                <TableHead className="h-16 text-[10px] font-black uppercase text-muted-foreground tracking-widest min-w-[150px]">Muallif</TableHead>
                <TableHead className="h-16 px-8 text-right text-[10px] font-black uppercase text-muted-foreground tracking-widest min-w-[150px]">Amallar</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {docs.map((doc: any) => {
              const status = getStatusInfo(doc.status);
              return (
                <TableRow key={doc._id.toString()} className="hover:bg-muted/50 border-border group transition-colors">
                  <TableCell className="px-8 py-6 font-medium">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground font-black group-hover:bg-blue-500/10 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all border border-border">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{doc.title}</div>
                        <div className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-tighter">DOC_ID: {doc._id.toString().slice(-6)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">{doc.categoryId?.projectId?.name || "Noma'lum"}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-xs font-medium text-muted-foreground">{doc.categoryId?.name || "Noma'lum"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <span className={cn(
                      "rounded-lg px-3 py-1 text-[10px] font-black tracking-widest uppercase border",
                      status.color
                    )}>
                      {status.label}
                    </span>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md inline-block">
                      {doc.owner?.name || "Tayinlanmagan"}
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-1">
                      <Link 
                        href={`/docs/${doc._id}`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" }),
                          "h-10 w-10 rounded-xl text-muted-foreground hover:text-indigo-600 hover:bg-indigo-500/10 transition-all"
                        )}
                      >
                        <Eye className="h-4.5 w-4.5" />
                      </Link>
                      <Link 
                        href={`/admin/docs/${doc._id}/edit`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" }),
                          "h-10 w-10 rounded-xl text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 transition-all"
                        )}
                      >
                        <Edit className="h-4.5 w-4.5" />
                      </Link>
                      <DeleteButton 
                        id={doc._id.toString()}
                        apiUrl="/api/docs"
                        itemName="Hujjat"
                        title="Hujjatni o'chirish"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {docs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-16 w-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground">
                      <FileText className="h-8 w-8" />
                    </div>
                    <div className="text-muted-foreground font-bold text-sm">Hujjatlar hali yaratilmagan.</div>
                    <Link href="/admin/docs/new" className="text-blue-600 font-bold text-xs hover:underline">Birinchi hujjatni yaratish</Link>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
