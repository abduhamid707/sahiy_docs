import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/models/Project";
import { Document } from "@/models/Document";
import { Category } from "@/models/Category";
import { User } from "@/models/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FolderKanban, Activity, Users } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const isDeveloper = role === "MOBILE" || role === "FRONTEND" || role === "BACKEND";

  if (!isAdmin && !isDeveloper) redirect("/");

  await dbConnect();
  
  let projectQuery: any = {};
  let docQuery: any = {};
  
  if (!isAdmin) {
    // 1. Filter projects by role
    projectQuery = { allowedRoles: role };
    const allowedProjects = await Project.find(projectQuery).select("_id");
    const projectIds = allowedProjects.map(p => p._id);
    
    // 2. Find categories for these projects
    const allowedCategories = await Category.find({ projectId: { $in: projectIds } }).select("_id");
    const categoryIds = allowedCategories.map((c: any) => c._id);
    
    // 3. Filter docs by categories AND role
    docQuery = { 
      categoryId: { $in: categoryIds },
      allowedRoles: role 
    };
  }

  const [projectCount, docCount, userCount] = await Promise.all([
    Project.countDocuments(projectQuery),
    Document.countDocuments(docQuery),
    isAdmin ? User.countDocuments() : Promise.resolve(0),
  ]);

  const stats = [
    { title: "Loyihalar", value: projectCount.toString(), icon: FolderKanban, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
    { title: "Hujjatlar", value: docCount.toString(), icon: FileText, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    ...(isAdmin ? [{ title: "Foydalanuvchilar", value: userCount.toString(), icon: Users, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" }] : []),
    { title: "Real vaqtda", value: "Faol", icon: Activity, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black text-foreground tracking-tight">Admin paneli</h1>
        <p className="text-lg text-muted-foreground font-medium italic">Sahiy Docs platformasi faoliyati va tizim holati.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-card p-8 rounded-3xl border border-border shadow-xl shadow-slate-900/5 dark:shadow-none hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
              <div className={`h-12 w-12 rounded-2xl ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.title}</span>
            </div>
            <div className="text-4xl font-black text-foreground tracking-tighter">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-card rounded-[2.5rem] border border-border shadow-xl shadow-slate-900/5 dark:shadow-none overflow-hidden">
          <div className="p-8 border-b border-border flex items-center justify-between">
            <h3 className="text-xl font-black text-foreground tracking-tight">Oxirgi yangilanishlar</h3>
            <span className="px-4 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">Hamma hujjatlar</span>
          </div>
          <div className="p-8 space-y-6">
            {[
              { title: "API Documentation", author: "Doston", time: "2 soat oldin", role: "Backend" },
              { title: "UI Components Library", author: "Aziz", time: "5 soat oldin", role: "Frontend" },
              { title: "Database Schema V2", author: "Sardor", time: "1 kun oldin", role: "DevOps" },
              { title: "Security Protocols", author: "Jasur", time: "2 kun oldin", role: "QA" },
            ].map((update, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-card group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{update.title}</p>
                    <p className="text-xs text-muted-foreground font-medium">{update.author} tomonidan • {update.time}</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-card border border-border text-[9px] font-black text-muted-foreground uppercase tracking-tighter shadow-sm group-hover:bg-blue-500/10 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-500/20 transition-all">
                  {update.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-card p-8 rounded-[2.5rem] border border-transparent dark:border-border shadow-2xl shadow-blue-900/20 dark:shadow-none relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-black text-white tracking-tight mb-10 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              Tizim holati
            </h3>
            <div className="space-y-8">
              {[
                { name: "Ma'lumotlar bazasi", status: "Faol", color: "text-green-400" },
                { name: "Edge Runtime", status: "Yaxshi", color: "text-green-400" },
                { name: "Auth Service", status: "Faol", color: "text-green-400" },
                { name: "API Gateway", status: "Faol", color: "text-green-400" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <span className="text-sm font-bold text-slate-400 group-hover:text-slate-200 transition-colors">{item.name}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${item.color}`}>{item.status}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Server yuklamasi</p>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-[12%] bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              </div>
              <p className="text-right text-[10px] font-black text-blue-400 mt-2">12.4%</p>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute bottom-0 right-0 p-12 opacity-[0.03] scale-150 rotate-12 pointer-events-none text-white">
            <Activity size={200} />
          </div>
        </div>
      </div>
    </div>
  );
}
