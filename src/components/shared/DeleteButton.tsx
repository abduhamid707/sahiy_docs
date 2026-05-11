"use client";

import { useState } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeleteButtonProps {
  id: string;
  apiUrl: string;
  title: string;
  itemName: string;
  redirectTo?: string;
  className?: string;
}

export function DeleteButton({ 
  id, 
  apiUrl, 
  title, 
  itemName, 
  redirectTo,
  className 
}: DeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`${apiUrl}/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "O'chirishda xatolik yuz berdi");
      }

      toast.success(`${itemName} muvaffaqiyatli o'chirildi`);
      setOpen(false);
      
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Trigger: oddiy button, nested button xatosini oldini olish uchun DialogTrigger ishlatilmaydi */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || "h-10 w-10 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all inline-flex items-center justify-center"}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl p-8 max-w-md">
          <DialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                Bu amalni ortga qaytarib bo'lmaydi. Barcha bog'liq ma'lumotlar butunlay o'chib ketishi mumkin.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex sm:flex-col gap-2 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="h-12 rounded-2xl font-bold text-slate-500 hover:bg-slate-100"
              disabled={isDeleting}
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              className="h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xl shadow-rose-200"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-5 w-5 mr-2" />
              )}
              O'chirishni tasdiqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
