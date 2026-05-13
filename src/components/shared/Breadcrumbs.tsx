"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Breadcrumbs() {
  const pathname = usePathname();
  const pathSegments = pathname ? pathname.split("/").filter((segment) => segment !== "") : [];

  return (
    <nav className="flex items-center text-sm text-muted-foreground">
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {pathSegments.map((segment, index) => {
        const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
        const isLast = index === pathSegments.length - 1;
        
        // Better naming for segments (Uzbek)
        let name = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
        if (segment === "admin") name = "Boshqaruv";
        if (segment === "docs") name = "Hujjatlar";
        if (segment === "projects") name = "Loyihalar";
        if (segment === "users") name = "Foydalanuvchilar";
        if (segment === "new") name = "Yangi";
        if (segment === "edit") name = "Tahrirlash";
        if (segment.match(/^[0-9a-fA-F]{24}$/)) name = "Batafsil"; // Handle IDs

        return (
          <div key={href} className="flex items-center">
            <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground/60" />
            <Link
              href={href}
              className={cn(
                "hover:text-foreground transition-colors",
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
