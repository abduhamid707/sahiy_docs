"use strict";
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ImportExportButtons() {
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    try {
      const res = await fetch("/api/admin/docs/export");
      if (!res.ok) throw new Error("Eksport qilishda xatolik yuz berdi");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sahiy_docs_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("Hujjatlar muvaffaqiyatli eksport qilindi");
    } catch (error) {
      console.error(error);
      toast.error("Eksport qilishda xatolik yuz berdi");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/docs/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Import qilishda xatolik yuz berdi");
      }

      toast.success("Hujjatlar muvaffaqiyatli import qilindi");
      // Reload page to see new data
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Import qilishda xatolik yuz berdi");
    } finally {
      setImporting(false);
      // Reset input
      e.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        className="h-12 px-6 rounded-2xl border-border font-bold transition-all shadow-sm active:scale-95 gap-2 group hover:bg-muted"
        onClick={handleExport}
      >
        <Download className="h-5 w-5" />
        Eksport
      </Button>
      
      <div className="relative">
        <input
          type="file"
          accept=".json"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleImport}
          disabled={importing}
        />
        <Button
          variant="outline"
          className="h-12 px-6 rounded-2xl border-border font-bold transition-all shadow-sm active:scale-95 gap-2 group hover:bg-muted"
          disabled={importing}
        >
          {importing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          Import
        </Button>
      </div>
    </div>
  );
}
