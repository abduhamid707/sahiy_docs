"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Settings,
  Users,
  X,
  MessageSquare,
  Headset,
  ChartNoAxesCombined
} from "lucide-react";

const navItems = [
  // Hozircha yashirilgan — keyin bosqichma-bosqich qaytaramiz:
  // { name: "Boshqaruv paneli", href: "/", icon: LayoutDashboard },
  // { name: "Barcha loyihalar", href: "/projects", icon: FolderKanban },
  { name: "Sahiy Chat", href: "/chat", icon: MessageSquare },
];

const supportItems = [
  { name: "CRM Inbox", href: "/crm", icon: Headset, managerOnly: false },
  { name: "CRM Analytics", href: "/crm/analytics", icon: ChartNoAxesCombined, managerOnly: true },
];

const adminItems = [
  // Hozircha yashirilgan — keyin bosqichma-bosqich qaytaramiz:
  // { name: "Admin paneli", href: "/admin", icon: LayoutDashboard },
  // { name: "Loyihalar boshqaruvi", href: "/admin/projects", icon: FolderKanban },
  // { name: "Kontent boshqaruvi", href: "/admin/docs", icon: FileText },
  { name: "Foydalanuvchilar", href: "/admin/users", icon: Users },
  // { name: "Tizim jurnali", href: "/admin/logs", icon: FileText },
];

import { ROLE_LABELS, UserRole } from "@/lib/constants";

type SidebarUser = {
  role?: UserRole;
  isLead?: boolean;
  name?: string | null;
  email?: string | null;
};

type SidebarProject = { _id: string; name: string };

export default function Sidebar({ user, isOpen, onClose }: { 
  user: SidebarUser, 
  projects?: SidebarProject[],
  isOpen?: boolean,
  onClose?: () => void 
}) {
  const pathname = usePathname() || "";
  const role = user?.role as UserRole;
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const isLead = user?.isLead;
  const canSeeSupport = isAdmin || isLead || role === "SUPPORT";

  const isSupportOnly = role === "SUPPORT" && !isAdmin && !isLead;

  const filteredNavItems = navItems.filter((item) => {
    if (isSupportOnly) {
      return item.href === "/chat";
    }
    return true;
  });

  const filteredAdminItems = adminItems.filter(() => isAdmin || isLead);

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
        "fixed inset-y-0 left-0 z-50 flex w-64 sm:w-56 flex-col border-r border-white/10 bg-[#0a2937] text-white shadow-xl transition-transform duration-300 lg:static lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="sticky top-0 z-10 flex h-20 items-center justify-center border-b border-white/10 bg-[#0a2937]/95 px-4 backdrop-blur-md">
          <Link href="/crm" className="group flex items-center" onClick={onClose} aria-label="Sahiy CRM">
            <div className="flex h-14 w-14 items-center justify-center transition-transform duration-200 group-hover:scale-105">
              {/* Public brand asset: direct loading avoids dev image-optimizer failures. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_sahiy.png" alt="Sahiy Logo" width={56} height={56} className="h-14 w-14 object-contain" />
            </div>
          </Link>
          <button 
            onClick={onClose}
            className="absolute right-3 rounded-lg bg-white/5 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      
      <div className="custom-scrollbar flex-1 space-y-7 overflow-y-auto px-3 py-5">
        {filteredNavItems.length > 0 && (
          <div>
            <h3 className="mb-2.5 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Asosiy Menu
            </h3>
            <nav className="space-y-1.5">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                    pathname === item.href
                      ? "border border-white/10 bg-white/10 text-white"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 transition-transform group-hover:scale-105", pathname === item.href ? "text-white" : "text-slate-500")} />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        )}
        
        {canSeeSupport && (
          <div>
            <h3 className="mb-2.5 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Call-Center
            </h3>
            <nav className="space-y-1.5">
              {supportItems.filter((item) => !item.managerOnly || isAdmin || isLead).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                    pathname === item.href || (item.href === "/crm" && pathname.startsWith("/crm/tickets"))
                      ? "border border-white/10 bg-white/10 text-white"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 transition-transform group-hover:scale-105", (pathname === item.href || (item.href === "/crm" && pathname.startsWith("/crm/tickets"))) ? "text-white" : "text-slate-500")} />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* Hozircha loyiha ro‘yxati yashirildi — keyin qayta yoqiladi.
        {!isSupportOnly && projects.length > 0 && (
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
                    pathname && pathname.includes(project._id)
                      ? "bg-slate-800 text-white border border-slate-700"
                      : "text-slate-400 hover:bg-slate-800/30 hover:text-white"
                  )}
                >
                  <FolderKanban className={cn("h-4 w-4 transition-colors", (pathname && pathname.includes(project._id)) ? "text-blue-400" : "text-slate-600")} />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        )} */}

        {(isAdmin || filteredAdminItems.length > 0) && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="mb-2.5 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-blue-500/70">
              Ma&apos;muriyat
            </h3>
            <nav className="space-y-1.5">
              {filteredAdminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                    pathname && pathname.startsWith(item.href)
                      ? "bg-slate-800/80 text-white border border-slate-700/50 shadow-inner"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 transition-transform group-hover:scale-105", (pathname && pathname.startsWith(item.href)) ? "text-blue-400" : "text-slate-600")} />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>

      <div className="mt-auto p-2.5 pb-5 sm:pb-2.5">
        <Link
          href="/profile"
          onClick={onClose}
          className="group/profile flex items-center gap-2.5 rounded-lg border border-slate-700/40 bg-slate-800/50 p-2.5 shadow-sm backdrop-blur-sm transition-all hover:bg-slate-800/80"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-md shadow-blue-600/20 ring-1 ring-slate-700">
            {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-semibold leading-tight text-white">{user?.name || "Foydalanuvchi"}</p>
            <p className="mt-0.5 truncate text-[9px] font-semibold leading-tight text-blue-400 opacity-90">{ROLE_LABELS[role] || role}</p>
          </div>
          <div className="flex items-center text-slate-500 group-hover/profile:text-slate-300 transition-colors shrink-0">
            <Settings className="h-4 w-4" />
          </div>
        </Link>
      </div>
    </div>
    </>
  );
}
