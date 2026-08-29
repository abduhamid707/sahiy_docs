"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Copy, X } from "lucide-react";

export default function TelegramReminderBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);

  if (dismissed) return null;

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

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 px-5 py-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Send className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Telegram ulanmagan</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Muddat yaqinlashganda va yangi ticket biriktirilganda eslatma olish uchun Telegramingizni ulang.
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!deepLink ? (
        <Button
          onClick={handleGenerateLink}
          disabled={loading}
          size="sm"
          className="self-start h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4"
        >
          <Send className="mr-2 h-3.5 w-3.5" /> Hoziroq ulash
        </Button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Input readOnly value={deepLink} className="h-9 rounded-xl border-border bg-card font-medium text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={handleCopy} className="h-9 w-9 rounded-xl shrink-0">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <a href={deepLink} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 w-full sm:w-auto">
              Botni ochish
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}
