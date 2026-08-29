"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  onUploadSuccess: (url: string) => void;
  className?: string;
}

export function ImageUpload({ onUploadSuccess, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("Faqat rasm yuklash mumkin");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Rasm hajmi 5MB dan oshmasligi kerak");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Yuklashda xatolik");
      }

      const data = await res.json();
      onUploadSuccess(data.url);
      toast.success("Rasm muvaffaqiyatli yuklandi");
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      toast.error(error.message || "Rasm yuklashda xatolik yuz berdi");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className="gap-2 rounded-xl h-10 px-4 border-dashed border-2 hover:border-blue-500 hover:bg-blue-50/50 transition-all"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {uploading ? "Yuklanmoqda..." : "Rasm qo'shish"}
      </Button>
    </div>
  );
}
