"use client";

import { signOut } from "next-auth/react";
import { LogOut, Bell, Menu, Sun, Moon } from "lucide-react";
import Breadcrumbs from "./Breadcrumbs";
import SearchInput from "./SearchInput";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 lg:px-8 sticky top-0 z-20 border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-4 lg:gap-8">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Breadcrumbs />
        <div className="hidden lg:block w-96">
          <SearchInput />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xl p-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-blue-600 transition-all group"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 transition-transform group-hover:scale-110" />
            ) : (
              <Moon className="h-5 w-5 transition-transform group-hover:scale-110" />
            )}
          </button>
        )}
        <button className="rounded-xl p-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-blue-600 transition-all relative group">
          <Bell className="h-5 w-5 transition-transform group-hover:scale-110" />
          <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
        </button>
        <div className="h-8 w-[1px] bg-gray-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all group"
        >
          <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Chiqish
        </button>
      </div>
    </header>
  );
}
