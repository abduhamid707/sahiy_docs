import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/models/Project";
import { Category } from "@/models/Category";
import { Document } from "@/models/Document";
import Link from "next/link";
import { ChevronRight, FileText, Layout, Info, FolderKanban } from "lucide-react";
import { notFound } from "next/navigation";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const { id } = await params;

  // Validate ObjectId to prevent CastError
  const isValidId = /^[0-9a-fA-F]{24}$/.test(id);
  if (!isValidId) {
    notFound();
  }

  await dbConnect();
  
  const project = await Project.findById(id);
  
  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
  
  if (!project || (!isAdmin && !project.allowedRoles.includes(userRole))) {
    notFound();
  }

  const categoriesQuery = isAdmin ? { projectId: id } : { projectId: id, allowedRoles: userRole };
  const categories = await Category.find(categoriesQuery).sort({ order: 1 });
  
  // Get documents for these categories
  const documentsQuery = isAdmin 
    ? { categoryId: { $in: categories.map(c => c._id) } }
    : { categoryId: { $in: categories.map(c => c._id) }, allowedRoles: userRole };
    
  const documents = await Document.find(documentsQuery).sort({ title: 1 });

  return (
    <div className="space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Project Header */}
      <div className="bg-card p-6 sm:p-10 rounded-3xl border border-border shadow-xl shadow-slate-900/5 dark:shadow-none relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 mb-4 sm:mb-6 uppercase tracking-widest overflow-x-auto whitespace-nowrap pb-2 sm:pb-0">
            <Link href="/projects" className="hover:text-blue-700 dark:hover:text-blue-300 transition-colors">Loyihalar</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{project.name}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-foreground mb-4 sm:mb-6 tracking-tight">{project.name}</h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-3xl leading-relaxed font-medium">
            {project.description || project.name + " loyihasi uchun barcha texnik va funktsional hujjatlar."}
          </p>
        </div>
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] dark:opacity-[0.05] scale-100 sm:scale-150 pointer-events-none hidden sm:block text-foreground">
          <FolderKanban size={240} />
        </div>
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 sm:gap-10">
        {/* Categories Grid */}
        <div className="lg:col-span-3 space-y-12">
          {categories.length > 0 ? (
            categories.map((category: any) => {
              const categoryDocs = documents.filter(doc => doc.categoryId.toString() === category._id.toString());
              
              return (
                <section key={category._id.toString()} className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Layout className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">{category.name}</h2>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest">{categoryDocs.length} ta hujjat</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {categoryDocs.length > 0 ? (
                      categoryDocs.map((doc: any) => (
                        <Link 
                          key={doc._id.toString()}
                          href={`/docs/${doc._id.toString()}`}
                          className="group p-4 sm:p-5 bg-card rounded-2xl border border-border hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex items-center gap-4 sm:gap-5"
                        >
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-blue-500/10 transition-colors shadow-inner shrink-0">
                            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-base sm:text-lg mb-0.5 truncate">{doc.title}</h3>
                            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-tighter">Yangilandi: {new Date(doc.updatedAt).toLocaleDateString('uz-UZ')}</p>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="col-span-full py-10 px-6 bg-muted/30 rounded-2xl border border-dashed border-border text-center">
                        <p className="text-sm text-muted-foreground font-medium italic">Ushbu bo'limda hali hujjatlar mavjud emas.</p>
                      </div>
                    )}
                  </div>
                </section>
              );
            })
          ) : (
            <div className="text-center py-24 bg-card rounded-3xl border border-dashed border-border shadow-sm">
              <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Info className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2 tracking-tight">Tuzilma aniqlanmagan</h3>
              <p className="text-muted-foreground max-w-sm mx-auto font-medium leading-relaxed">
                Ushbu loyiha uchun hali kategoriyalar yoki hujjatlar yaratilmagan. Iltimos, keyinroq tekshirib ko'ring.
              </p>
            </div>
          )}
        </div>

        {/* Project Sidebar Info */}
        <div className="space-y-8">
          <div className="bg-card p-8 rounded-3xl border border-border shadow-xl shadow-slate-900/5 dark:shadow-none sticky top-24">
            <h3 className="font-bold text-foreground mb-8 flex items-center gap-3 text-lg tracking-tight">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              Loyiha haqida
            </h3>
            <div className="space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] block">Texnologiyalar</label>
                <div className="flex flex-wrap gap-2">
                  {project.techStack?.length > 0 ? project.techStack.map((tech: string) => (
                    <span key={tech} className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-bold border border-border hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-default">
                      {tech}
                    </span>
                  )) : <span className="text-xs text-muted-foreground italic">Ko'rsatilmadi</span>}
                </div>
              </div>
              
              {project.repoLinks?.length > 0 && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] block">Repozitoriyalar</label>
                  <ul className="space-y-2">
                    {project.repoLinks.map((link: any, i: number) => (
                      <li key={i}>
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted text-sm font-bold text-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-all group border border-transparent hover:border-border"
                        >
                          <div className="h-6 w-6 rounded bg-muted flex items-center justify-center group-hover:bg-card transition-colors">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                          </div>
                          {link.platform || "Manba kodi"}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-6 border-t border-border">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground uppercase tracking-wider">Holati</span>
                  <span className="px-2 py-1 rounded bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 uppercase tracking-widest text-[10px]">Faol</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
