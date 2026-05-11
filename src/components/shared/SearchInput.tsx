"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, FileText, FolderKanban, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SearchInput() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const search = async () => {
      if (query.length < 2) {
        if (isMounted) setResults([]);
        return;
      }

      if (isMounted) setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (isMounted) {
          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timeout = setTimeout(search, 300);
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [query]);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(url);
  };

  return (
    <div className="relative w-full max-w-md" ref={dropdownRef}>
      <div className={cn(
        "flex items-center rounded-2xl bg-muted px-4 py-2.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-card focus-within:shadow-lg transition-all duration-300 border border-transparent focus-within:border-blue-200/50",
        isOpen && results.length > 0 ? "rounded-b-none" : ""
      )}>
        {loading ? (
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
        ) : (
          <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
        )}
        <input
          type="text"
          placeholder="Hujjatlarni qidirish..."
          className="ml-3 w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground text-foreground"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        {query && (
          <button 
            onClick={() => setQuery("")}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {isOpen && (results.length > 0 || (query.length >= 2 && !loading)) && (
        <div className="absolute top-full left-0 right-0 bg-card border border-t-0 border-border rounded-b-2xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto py-3 animate-in slide-in-from-top-2 duration-200">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((result: any) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result.url)}
                  className="w-full flex items-center gap-4 px-5 py-3 hover:bg-muted/50 transition-all text-left group"
                >
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-muted transition-colors">
                    {result.type === "project" ? (
                      <FolderKanban className="h-5 w-5 text-blue-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground group-hover:text-blue-600" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground group-hover:text-blue-600 transition-colors">{result.title}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                      {result.type === "project" ? "Loyiha" : "Hujjat"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground font-medium italic">"{query}" bo'yicha hech narsa topilmadi</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
