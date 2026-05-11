"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Book, 
  LayoutDashboard, 
  Settings, 
  FileText, 
  Users, 
  FolderKanban,
  ChevronRight,
  X
} from "lucide-react";

const navItems = [
  { name: "Boshqaruv paneli", href: "/", icon: LayoutDashboard },
  { name: "Barcha loyihalar", href: "/projects", icon: FolderKanban },
];

const adminItems = [
  { name: "Admin paneli", href: "/admin", icon: LayoutDashboard },
  { name: "Loyihalar boshqaruvi", href: "/admin/projects", icon: FolderKanban },
  { name: "Kontent boshqaruvi", href: "/admin/docs", icon: FileText },
  { name: "Foydalanuvchilar", href: "/admin/users", icon: Users },
];

import { ROLE_LABELS, UserRole } from "@/lib/constants";

export default function Sidebar({ user, projects = [], isOpen, onClose }: { 
  user: any, 
  projects?: any[],
  isOpen?: boolean,
  onClose?: () => void 
}) {
  const pathname = usePathname();
  const role = user?.role as UserRole;
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const canManageDocs = isAdmin || role === "MOBILE" || role === "FRONTEND" || role === "BACKEND";

  const filteredAdminItems = adminItems.filter(item => {
    if (isAdmin) return true;
    if (canManageDocs && item.href === "/admin/docs") return true;
    return false;
  });

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-blue dark:bg-slate-950 text-white border-r border-slate-800 dark:border-slate-800/50 shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-20 items-center justify-between px-8 border-b border-slate-800/50 bg-brand-blue/50 dark:bg-slate-950/50 backdrop-blur-md sticky top-0 z-10">
          <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="h-10 w-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <img src="/logo_sahiy.png" alt="Sahiy Logo" className="h-10 w-10 object-contain" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Sahiy Docs
            </span>
          </Link>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl bg-slate-800/50 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-10 custom-scrollbar">
        <div>
          <h3 className="mb-4 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Asosiy Menu
          </h3>
          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 group",
                  pathname === item.href
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                )}
              >
                <item.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", pathname === item.href ? "text-white" : "text-slate-500")} />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        
        {projects.length > 0 && (
          <div>
            <h3 className="mb-4 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Mening Loyihalarim
            </h3>
            <nav className="space-y-1.5">
              {projects.map((project) => (
                <Link
                  key={project._id}
                  href={`/projects/${project._id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 group",
                    pathname.includes(project._id)
                      ? "bg-slate-800 text-white border border-slate-700"
                      : "text-slate-400 hover:bg-slate-800/30 hover:text-white"
                  )}
                >
                  <FolderKanban className={cn("h-4 w-4 transition-colors", pathname.includes(project._id) ? "text-blue-400" : "text-slate-600")} />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}

        {(isAdmin || filteredAdminItems.length > 0) && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="mb-4 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500/70">
              Ma'muriyat
            </h3>
            <nav className="space-y-1.5">
              {filteredAdminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 group",
                    pathname.startsWith(item.href)
                      ? "bg-slate-800/80 text-white border border-slate-700/50 shadow-inner"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", pathname.startsWith(item.href) ? "text-blue-400" : "text-slate-600")} />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>

      <div className="p-4 mt-auto">
        <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20 ring-2 ring-slate-700/50">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user?.name || "Foydalanuvchi"}</p>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter opacity-80">{ROLE_LABELS[role] || role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
