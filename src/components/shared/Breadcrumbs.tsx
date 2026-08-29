"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Breadcrumbs() {
  const pathname = usePathname();
  const pathSegments = pathname ? pathname.split("/").filter((segment) => segment !== "") : [];

  return (
    <nav className="flex items-center text-xs sm:text-sm text-muted-foreground overflow-hidden whitespace-nowrap">
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
      >
        <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Link>

      {pathSegments.map((segment, index) => {
        const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
        const isLast = index === pathSegments.length - 1;
        const isMiddle = index > 0 && index < pathSegments.length - 1;
        
        // Better naming for segments (Uzbek)
        let name = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
        if (segment === "admin") name = "Boshqaruv";
        if (segment === "docs") name = "Hujjatlar";
        if (segment === "projects") name = "Loyihalar";
        if (segment === "users") name = "Foydalanuvchilar";
        if (segment === "logs") name = "Logs";
        if (segment === "crm") name = "CRM";
        if (segment === "analytics") name = "Analytics";
        if (segment === "new") name = "Yangi";
        if (segment === "edit") name = "Tahrirlash";
        if (segment.match(/^[0-9a-fA-F]{24}$/)) name = "Batafsil"; // Handle IDs

        return (
          <div key={href} className={cn("flex items-center min-w-0", isMiddle && pathSegments.length > 2 ? "hidden sm:flex" : "flex")}>
            <ChevronRight className="mx-1 sm:mx-2 h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <Link
              href={href}
              className={cn(
                "hover:text-foreground transition-colors truncate max-w-[85px] sm:max-w-[150px]",
                isLast ? "font-semibold text-foreground pointer-events-none" : ""
              )}
            >
              {name}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
