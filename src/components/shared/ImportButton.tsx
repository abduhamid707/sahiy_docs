"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function ImportButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        const res = await fetch("/api/projects/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(json),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Import failed");
        }

        alert("Loyiha muvaffaqiyatli import qilindi!");
        router.refresh();
      } catch (error: any) {
        alert("Xatolik: " + error.message);
      } finally {
        setLoading(false);
        // Reset file input
        e.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="relative">
      <input
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
        id="import-project-file"
        disabled={loading}
      />
      <label htmlFor="import-project-file">
        <Button
          variant="outline"
          className="h-12 px-6 rounded-2xl font-bold border-border bg-card hover:bg-muted transition-all active:scale-95 gap-2 cursor-pointer"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
          Import
        </Button>
      </label>
    </div>
  );
}
