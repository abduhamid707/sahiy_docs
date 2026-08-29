"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Copy, CheckCircle2, Unlink } from "lucide-react";

export default function TelegramLinkCard({ isLinked }: { isLinked: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);

  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/telegram/link-code", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Xatolik yuz berdi");
      const data = await res.json();
      setDeepLink(data.deepLink);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!deepLink) return;
    navigator.clipboard.writeText(deepLink);
    toast.success("Havola nusxalandi");
  };

  const handleUnlink = async () => {
    if (!confirm("Telegram ulanishini uzishga ishonchingiz komilmi?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/user/telegram", { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Xatolik yuz berdi");
      toast.success("Telegram uzildi");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-[2.5rem] border-border shadow-xl shadow-slate-900/5 dark:shadow-none overflow-hidden bg-card">
      <CardHeader className="bg-muted/50 border-b border-border px-8 py-6">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Telegram bildirishnomalari</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-8 py-6 sm:py-8">
        {isLinked ? (
          <>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="h-5 w-5" /> Telegram ulangan
            </div>
            <p className="text-sm text-muted-foreground">
              Ticket eslatmalari va yangi biriktirilgan tiketlar haqida xabarlar Telegramingizga keladi.
            </p>
            <Button
              variant="outline"
              onClick={handleUnlink}
              disabled={loading}
              className="rounded-2xl font-bold text-rose-600 hover:bg-rose-500/10 hover:text-rose-600"
            >
              <Unlink className="mr-2 h-4 w-4" /> Uzish
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Support ticketlaringiz bo'yicha eslatmalarni Telegram orqali olish uchun hisobingizni ulang.
            </p>
            {!deepLink ? (
              <Button
                onClick={handleGenerateLink}
                disabled={loading}
                className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20"
              >
                <Send className="mr-2 h-4 w-4" /> Telegramni ulash
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Quyidagi havolani bosing (yoki botga o'zingiz o'ting va havoladagi kodni yuboring). Havola 10 daqiqa amal qiladi.
                </p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={deepLink} className="h-11 rounded-xl border-border bg-muted/50 font-medium text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={handleCopy} className="h-11 w-11 rounded-xl shrink-0">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <a href={deepLink} target="_blank" rel="noopener noreferrer">
                  <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20">
                    <Send className="mr-2 h-4 w-4" /> Botni ochish
                  </Button>
                </a>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
