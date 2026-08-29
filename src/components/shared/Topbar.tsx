"use client";

import { signOut } from "next-auth/react";
import { LogOut, Menu, Sun, Moon } from "lucide-react";
import Breadcrumbs from "./Breadcrumbs";
import SearchInput from "./SearchInput";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import HeaderNotifications from "./HeaderNotifications";

export default function Topbar({ onMenuClick, user }: { onMenuClick?: () => void; user: { role?: string; isLead?: boolean } }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 sm:px-6 lg:px-8 sticky top-0 z-20 border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-8 min-w-0">
        <button 
          onClick={onMenuClick}
          aria-label="Menyu"
          className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
        <div className="min-w-0 overflow-hidden">
          <Breadcrumbs />
        </div>
        <div className="hidden lg:block w-96">
          <SearchInput />
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Mavzuni almashtirish"
            className="rounded-xl p-2 sm:p-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-blue-600 transition-all group"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 transition-transform group-hover:scale-110" />
            ) : (
              <Moon className="h-5 w-5 transition-transform group-hover:scale-110" />
            )}
          </button>
        )}
        <HeaderNotifications enabled={user?.role === "SUPPORT" || user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || !!user?.isLead} />
        <div className="h-6 w-[1px] bg-gray-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
        <button
          onClick={() => signOut()}
          title="Chiqish"
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 p-2 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all group"
        >
          <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline">Chiqish</span>
        </button>
      </div>
    </header>
  );
}
