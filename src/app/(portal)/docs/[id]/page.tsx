import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Document } from "@/models/Document";
import { Category } from "@/models/Category";
import { Project } from "@/models/Project";
import Link from "next/link";
import { ChevronRight, Calendar, User, Clock, AlertCircle, CheckCircle2, FileWarning, Edit } from "lucide-react";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { buttonVariants } from "@/components/ui/button";

const statusColors = {
  DRAFT: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
  REVIEWED: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  OUTDATED: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
};

const statusIcons = {
  DRAFT: <FileWarning className="h-3 w-3" />,
  REVIEWED: <CheckCircle2 className="h-3 w-3" />,
  OUTDATED: <AlertCircle className="h-3 w-3" />,
};

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const { id } = await params;

  // Validate ObjectId to prevent CastError
  const isValidId = /^[0-9a-fA-F]{24}$/.test(id);
  if (!isValidId) {
    notFound();
  }

  await dbConnect();
  
  const doc = await Document.findById(id).populate("owner").populate("lastUpdatedBy");
  
  if (!doc || !doc.allowedRoles.includes(userRole)) {
    notFound();
  }

  const category = await Category.findById(doc.categoryId);
  const project = await Project.findById(category.projectId);

  const statusNames = {
    DRAFT: "Qoralama",
    REVIEWED: "Tekshirilgan",
    OUTDATED: "Eskirgan",
  };

  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
  const canEdit = isAdmin || doc.allowedRoles.includes(userRole);

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section with breadcrumbs and actions */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-10">
        <div className="space-y-4 min-w-0">
          <nav className="flex items-center gap-2 text-sm font-bold text-muted-foreground mb-2 uppercase tracking-widest overflow-x-auto whitespace-nowrap pb-2 custom-scrollbar">
            <Link href="/projects" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0">Loyihalar</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
            <Link href={`/projects/${project._id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0">{project.name}</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
            <span className="text-foreground truncate">{doc.title}</span>
          </nav>
          <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight leading-tight break-words">{doc.title}</h1>
          
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm font-bold text-muted-foreground">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest shadow-sm ${statusColors[doc.status as keyof typeof statusColors]}`}>
              {statusIcons[doc.status as keyof typeof statusIcons]}
              {statusNames[doc.status as keyof typeof statusNames]}
            </div>
            <div className="h-4 w-[1px] bg-border hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500/50" />
              <span><span className="hidden sm:inline">Mas'ul: </span><span className="text-foreground">{doc.owner?.name || "Tayinlanmagan"}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500/50" />
              <span><span className="hidden sm:inline">Yangilandi: </span><span className="text-foreground">{new Date(doc.updatedAt).toLocaleDateString('uz-UZ')}</span></span>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-3 shrink-0">
            <Link 
              href={`/admin/docs/${doc._id}/edit`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 group w-full sm:w-auto"
            >
              <Edit className="h-4 w-4 transition-transform group-hover:rotate-12" />
              Tahrirlash
            </Link>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <article className="prose prose-blue dark:prose-invert prose-lg max-w-none bg-card p-6 sm:p-12 rounded-[2rem] sm:rounded-[2.5rem] border border-border shadow-2xl shadow-slate-200/10 dark:shadow-none selection:bg-blue-100 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-blue-100">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl sm:text-4xl font-black text-foreground mb-8 border-b border-border pb-4" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-12 mb-6" {...props} />,
                p: ({node, ...props}) => <p className="text-muted-foreground leading-relaxed mb-6 font-medium text-sm sm:text-base" {...props} />,
                code: ({node, ...props}) => <code className="bg-muted text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg font-bold text-xs sm:text-sm" {...props} />,
                pre: ({node, ...props}) => <pre className="bg-slate-900 text-slate-50 p-4 sm:p-6 rounded-2xl overflow-x-auto shadow-inner my-8 text-xs sm:text-sm" {...props} />,
              }}
            >
              {doc.content || "*Hozircha tarkib mavjud emas.*"}
            </ReactMarkdown>
          </article>
        </div>

        {/* Floating Outline / Info Sidebar */}
        <div className="lg:w-80 shrink-0">
          <div className="sticky top-28 space-y-8">
            <div className="bg-card/50 backdrop-blur-xl p-8 rounded-[2rem] border border-border">
              <h4 className="font-black text-foreground mb-8 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Hujjat tafsilotlari
              </h4>
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Bo'lim</label>
                  <p className="text-sm font-bold text-foreground bg-card px-4 py-2 rounded-xl border border-border shadow-sm">{category.name}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Oxirgi tahrirchi</label>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-[10px] font-black text-blue-700 dark:text-blue-300">
                      {(doc.lastUpdatedBy?.name || "S")[0]}
                    </div>
                    <p className="text-sm font-bold text-foreground">{doc.lastUpdatedBy?.name || "Tizim"}</p>
                  </div>
                </div>
                <div className="pt-8 border-t border-border">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-4">Kirish huquqi</label>
                  <div className="flex flex-wrap gap-2">
                    {doc.allowedRoles.map((role: string) => (
                      <span key={role} className="px-2 py-1 rounded-lg bg-card border border-border text-[9px] font-black text-muted-foreground uppercase tracking-tighter">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-6 border-t border-border mt-6">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-4">Kalit so'zlar</label>
                  <div className="flex flex-wrap gap-1.5">
                    {doc.keywords && doc.keywords.length > 0 ? (
                      doc.keywords.map((kw: string) => (
                        <span key={kw} className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-500/20">
                          {kw}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Mavjud emas</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
