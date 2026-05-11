import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/models/Project";
import Link from "next/link";
import { FolderKanban, ArrowRight, Tag } from "lucide-react";

export default async function ProjectsPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  await dbConnect();
  
  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
  const query = isAdmin ? {} : { allowedRoles: userRole };
  
  const projects = await Project.find(query).sort({ name: 1 });

  return (
    <div className="space-y-8 sm:space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">Loyihalar</h1>
        <p className="text-lg sm:text-xl text-muted-foreground font-medium">Loyiha yoki bo'limlar bo'yicha hujjatlarni ko'zdan kechiring.</p>
      </div>
 
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
        {projects.length > 0 ? (
          projects.map((project: any) => (
            <div key={project._id.toString()} className="group bg-card rounded-3xl border border-border shadow-xl shadow-slate-900/5 dark:shadow-none hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col relative overflow-hidden">
              <div className="p-6 sm:p-8 flex-1 relative z-10">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center mb-6 sm:mb-8 group-hover:bg-blue-500 group-hover:shadow-lg group-hover:shadow-blue-500/40 transition-all duration-300">
                  <FolderKanban className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors" />
                </div>
                <h2 className="text-2xl font-black text-foreground mb-3 tracking-tight group-hover:text-blue-600 transition-colors">{project.name}</h2>
                <p className="text-muted-foreground text-sm mb-8 line-clamp-3 font-medium leading-relaxed">
                  {project.description || "Ushbu loyiha uchun tavsif berilmagan."}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.techStack?.slice(0, 3).map((tech: string) => (
                    <span key={tech} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-wider border border-border">
                      <Tag className="h-3 w-3" />
                      {tech}
                    </span>
                  ))}
                  {project.techStack?.length > 3 && (
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pt-1.5 pl-1">
                      +{project.techStack.length - 3} yana
                    </span>
                  )}
                </div>
              </div>
              
              <div className="px-6 sm:px-8 py-4 sm:py-6 border-t border-border bg-muted/30 rounded-b-3xl">
                <Link 
                  href={`/projects/${project._id.toString()}`}
                  className="flex items-center justify-between text-sm font-black text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors uppercase tracking-[0.1em]"
                >
                  Hujjatlarni ko'rish
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
                </Link>
              </div>
              
              {/* Subtle background decoration */}
              <div className="absolute -bottom-10 -right-10 opacity-[0.02] dark:opacity-[0.05] group-hover:opacity-[0.05] dark:group-hover:opacity-[0.1] transition-opacity pointer-events-none text-foreground">
                <FolderKanban size={180} />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-32 text-center bg-card rounded-[3rem] border-2 border-dashed border-border">
            <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-8">
              <FolderKanban className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-3xl font-black text-foreground mb-3 tracking-tight">Loyihalar topilmadi</h3>
            <p className="text-muted-foreground max-w-sm mx-auto font-medium leading-relaxed">
              Hozircha sizda biron bir loyihaga kirish huquqi yo'q yoki loyihalar hali yaratilmagan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
