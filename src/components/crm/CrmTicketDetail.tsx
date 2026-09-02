"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  Copy,
  FileText,
  Loader2,
  MessageCircle,
  Paperclip,
  Phone,
  RotateCcw,
  Send,
  Shield,
  ShieldCheck,
  ShoppingBag,
  StickyNote,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CRM_CATEGORY_LABELS,
  CRM_PRIORITY_LABELS,
  CRM_STATUS_LABELS,
  formatDuration,
  formatUzDateTime,
  formatUzPhone,
  isOverdue,
  ticketPublicId,
} from "@/lib/crm";
import { cn } from "@/lib/utils";

const typeMeta: Record<string, { label: string; icon: any; box: string }> = {
  CUSTOMER_MESSAGE: {
    label: "Mijoz",
    icon: MessageCircle,
    box: "border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/30",
  },
  OPERATOR_RESPONSE: {
    label: "Operator javobi",
    icon: Send,
    box: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30",
  },
  INTERNAL_NOTE: {
    label: "Ichki izoh",
    icon: StickyNote,
    box: "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30",
  },
  SYSTEM_EVENT: {
    label: "Tizim",
    icon: Shield,
    box: "border-border bg-muted/50",
  },
};

export default function CrmTicketDetail({
  ticket,
  messages,
  previousTickets,
  agents,
  currentUser,
  canManage,
  nowIso,
}: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [type, setType] = useState("OPERATOR_RESPONSE");
  const [attachment, setAttachment] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [smsText, setSmsText] = useState(ticket.resolutionSmsText || "");
  const [reviewComment, setReviewComment] = useState("");
  const overdue = isOverdue(ticket, nowIso);
  const publicId = ticketPublicId(ticket);
  const closed = ["RESOLVED", "CLOSED"].includes(ticket.status);
  const approvalStatus = ticket.resolutionApprovalStatus || "NONE";
  const canApprove = currentUser.role !== "RAHBAR" && (["SUPER_ADMIN", "ADMIN"].includes(currentUser.role) || currentUser.isLead);
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const assignedId = ticket.assignedTo?._id || ticket.assignedTo;
  const isAssignedOperator = currentUser.role === "SUPPORT" && assignedId === currentUser.id;
  const patch = async (data: any, success: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/tickets/${ticket._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(success);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "O'zgarish saqlanmadi");
    } finally {
      setLoading(false);
    }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch("/api/crm/upload", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setAttachment(json);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };
  const send = async () => {
    if (!body.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/tickets/${ticket._id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          body,
          attachment: attachment || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBody("");
      setAttachment(null);
      toast.success(
        type === "INTERNAL_NOTE"
          ? "Ichki izoh qo'shildi"
          : "Xabar tarixga qo'shildi",
      );
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };
  const submitResolutionAction = async (
    action: "SUBMIT" | "RESOLVE" | "APPROVE" | "RETURN",
  ) => {
    if (["SUBMIT", "RESOLVE"].includes(action) && smsText.trim().length < 3) {
      return toast.error("Mijozga yuborilgan SMS matnini yozing");
    }
    if (action === "RETURN" && reviewComment.trim().length < 3) {
      return toast.error("Operatorga qaytarish sababini yozing");
    }
    setLoading(true);
    try {
      const response = await fetch(
        `/api/crm/tickets/${ticket._id}/resolution-approval`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            ...(["SUBMIT", "RESOLVE"].includes(action) ? { smsText: smsText.trim() } : {}),
            ...(action === "RETURN" ? { comment: reviewComment.trim() } : {}),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(
        action === "SUBMIT"
          ? "SMS qayd qilindi va ticket adminga yuborildi"
          : action === "RESOLVE"
            ? "SMS qayd qilindi va ticket hal qilindi"
          : action === "APPROVE"
            ? "Yakuniy qaror tasdiqlandi va ticket yopildi"
            : "Ticket operatorga qaytarildi",
      );
      setApprovalOpen(false);
      setReviewComment("");
      window.dispatchEvent(new Event("crm-notifications-changed"));
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Amal bajarilmadi");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Button
            nativeButton={false}
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            render={<Link href="/crm" />}
          >
            <ArrowLeft />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">{publicId}</h1>
              {overdue && (
                <span className="rounded-lg bg-rose-500/15 px-2 py-1 text-[10px] font-bold text-rose-600">
                  KECHIKKAN
                </span>
              )}
              {ticket.priority === "CRITICAL" && (
                <span className="rounded-lg bg-red-500 px-2 py-1 text-[10px] font-bold text-white">
                  KRITIK
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {CRM_CATEGORY_LABELS[ticket.category || "OTHER"]}
            </p>
          </div>
        </div>
        {closed ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin tasdiqladi
          </span>
        ) : approvalStatus === "PENDING" ? (
          canApprove ? (
            <Button onClick={() => setApprovalOpen(true)} disabled={loading} size="sm" className="h-9 rounded-lg bg-blue-600 text-xs text-white hover:bg-blue-700">
              <ShieldCheck /> Ko‘rib chiqish
            </Button>
          ) : (
            <Button disabled size="sm" className="h-9 rounded-lg text-xs">
              <Clock3 /> Admin tasdig‘i kutilmoqda
            </Button>
          )
        ) : isSuperAdmin ? (
          <Button onClick={() => setApprovalOpen(true)} disabled={loading} size="sm" className="h-9 rounded-lg bg-emerald-600 text-xs text-white hover:bg-emerald-700">
            <ShieldCheck /> Hal qilish
          </Button>
        ) : isAssignedOperator ? (
          <Button onClick={() => setApprovalOpen(true)} disabled={loading} size="sm" className="h-9 rounded-lg bg-brand-blue text-xs text-white hover:bg-brand-blue-hover">
            <Send /> Adminga yuborish
          </Button>
        ) : null}
      </div>

      {approvalStatus === "RETURNED" && (
        <div className="rounded-xl border border-rose-300 bg-rose-500/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300"><RotateCcw className="h-4 w-4" /> Admin operatorga qaytardi</p>
          <p className="mt-1 whitespace-pre-wrap">{ticket.resolutionReviewComment}</p>
        </div>
      )}

      <Dialog open={approvalOpen} onOpenChange={(open) => !loading && setApprovalOpen(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {canApprove && approvalStatus === "PENDING"
                ? "Yakuniy qarorni ko‘rib chiqish"
                : isSuperAdmin
                  ? "Ticketni hal qilish"
                  : "Ticketni adminga yuborish"}
            </DialogTitle>
            <DialogDescription>
              {canApprove && approvalStatus === "PENDING"
                ? "Operator mijozga qo‘lda yuborgan SMS matnini tekshiring. Oxirgi qarorni admin beradi."
                : isSuperAdmin
                  ? "Mijozga yuborilgan SMS matnini yozing. Tasdiqlangach ticket darhol hal qilinadi."
                  : "Mijozga qo‘lda yuborgan SMS xabaringizni yozing. U tarixga saqlanib, admin tasdig‘iga yuboriladi."}
            </DialogDescription>
          </DialogHeader>

          {canApprove && approvalStatus === "PENDING" ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mijozga yuborilgan SMS</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{ticket.resolutionSmsText}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Qaytarish sababi</label>
                <Textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Faqat operatorga qaytarishda majburiy..." className="min-h-24" />
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="outline" onClick={() => submitResolutionAction("RETURN")} disabled={loading} className="border-rose-300 text-rose-700 hover:bg-rose-500/10"><RotateCcw /> Operatorga qaytarish</Button>
                <Button onClick={() => submitResolutionAction("APPROVE")} disabled={loading} className="bg-emerald-600 text-white hover:bg-emerald-700">{loading ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Tasdiqlash</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Mijozga yuborilgan SMS matni *</label>
                <Textarea autoFocus value={smsText} onChange={(event) => setSmsText(event.target.value)} placeholder="Masalan: Hurmatli mijoz, murojaatingiz ko‘rib chiqildi va muammo hal qilindi..." className="min-h-32" />
                <p className="text-xs text-muted-foreground">
                  Hozircha SMS tizim orqali jo‘natilmaydi. Bu yerga mijozga qo‘lda yuborilgan xabar qayd qilinadi.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApprovalOpen(false)} disabled={loading}>Bekor qilish</Button>
                <Button
                  onClick={() => submitResolutionAction(isSuperAdmin ? "RESOLVE" : "SUBMIT")}
                  disabled={loading || smsText.trim().length < 3}
                  className={isSuperAdmin ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-brand-blue text-white hover:bg-brand-blue-hover"}
                >
                  {loading ? <Loader2 className="animate-spin" /> : isSuperAdmin ? <ShieldCheck /> : <Send />}
                  {isSuperAdmin ? "Hal qilish" : "Adminga yuborish"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <div className="grid gap-3 xl:h-[calc(100dvh-9.75rem)] xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex h-[calc(100dvh-9.5rem)] min-h-[32rem] flex-col gap-2.5 xl:h-auto xl:min-h-0">
          {/* Task funksiyasi hozircha mahsulot oqimidan olib tashlangan. */}
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
            <CardHeader className="shrink-0 border-b px-4 py-2.5">
              <CardTitle className="text-sm font-semibold">Suhbat va tarix</CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              <div className="rounded-lg border bg-muted/25 px-3 py-2">
                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Muammo mazmuni
                </p>
                <p className="whitespace-pre-wrap text-xs leading-5">
                  {ticket.problem}
                </p>
              </div>
              {!messages.length && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Hozircha tarix mavjud emas.
                </div>
              )}
              {messages.map((message: any) => {
                const meta = typeMeta[message.type] || typeMeta.SYSTEM_EVENT;
                const Icon = meta.icon;
                const isOperator = message.type === "OPERATOR_RESPONSE";
                const isCustomer = message.type === "CUSTOMER_MESSAGE";
                const isSystem = message.type === "SYSTEM_EVENT";
                return (
                  <div
                    key={message._id}
                    className={cn(
                      "flex",
                      isOperator
                        ? "justify-end"
                        : isSystem
                          ? "justify-center"
                          : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "border px-3 py-2 shadow-sm",
                        (isOperator || isCustomer) &&
                          "max-w-[88%] sm:max-w-[76%]",
                        isOperator &&
                          "rounded-xl rounded-br-sm border-brand-blue bg-brand-blue text-white",
                        isCustomer &&
                          "rounded-xl rounded-bl-sm border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40",
                        message.type === "INTERNAL_NOTE" &&
                          "w-full rounded-lg border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
                        isSystem &&
                          "max-w-[92%] rounded-lg bg-muted/60 px-3 py-1.5 shadow-none",
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          <Icon className="h-3 w-3" />
                          {meta.label}
                          {message.author?.name || message.authorName ? (
                            <span
                              className={cn(
                                "font-normal",
                                isOperator
                                  ? "text-white/70"
                                  : "text-muted-foreground",
                              )}
                            >
                              · {message.author?.name || message.authorName}
                            </span>
                          ) : null}
                        </div>
                        <time
                          className={cn(
                            "shrink-0 text-[9px]",
                            isOperator
                              ? "text-white/65"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatUzDateTime(message.createdAt, true)}
                        </time>
                      </div>
                      <p
                        className={cn(
                          "whitespace-pre-wrap text-xs leading-5",
                          isSystem && "text-[11px] leading-4 text-muted-foreground",
                        )}
                      >
                        {message.body}
                      </p>
                      {message.attachments?.map((a: any) => (
                        <a
                          key={a.url}
                          href={a.url}
                          target="_blank"
                          className={cn(
                            "mt-2 flex items-center gap-2 rounded-lg border p-2 text-xs hover:underline",
                            isOperator
                              ? "border-white/20 bg-white/10 text-white"
                              : "bg-background/60 text-blue-600",
                          )}
                        >
                          <FileText className="h-4 w-4" />
                          {a.name}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card className="shrink-0 rounded-xl">
            <CardContent className="p-3">
              <div className="mb-2 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setType("OPERATOR_RESPONSE")}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-[11px] font-bold",
                      type === "OPERATOR_RESPONSE"
                        ? "bg-brand-blue text-white"
                        : "bg-muted",
                    )}
                  >
                    Javob
                  </button>
                  <button
                    onClick={() => setType("INTERNAL_NOTE")}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-[11px] font-bold",
                      type === "INTERNAL_NOTE"
                        ? "bg-amber-500 text-black"
                        : "bg-muted",
                    )}
                  >
                    Ichki izoh
                  </button>
                </div>
                <button
                  onClick={() => setType("CUSTOMER_MESSAGE")}
                  className={cn(
                    "text-left text-[10px] font-semibold sm:text-right",
                    type === "CUSTOMER_MESSAGE"
                      ? "text-blue-600 underline"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Qo‘ng‘iroqdagi mijoz xabarini qayd etish
                </button>
              </div>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  type === "INTERNAL_NOTE"
                    ? "Faqat jamoa ko'radigan izoh..."
                    : type === "CUSTOMER_MESSAGE"
                      ? "Mijoz qo‘ng‘iroqda aytgan xabarni kiriting..."
                      : "Mijozga javob yoki yangilanish yozing..."
                }
                className="min-h-16 resize-none rounded-lg text-xs leading-5"
              />
              {attachment && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
                  <span className="truncate">{attachment.name}</span>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => setAttachment(null)}
                  >
                    <X />
                  </Button>
                </div>
              )}
              <div className="mt-2 flex justify-between">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted">
                  <Paperclip className="h-3.5 w-3.5" />
                  {uploading ? "Yuklanmoqda" : "Fayl"}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    disabled={uploading}
                    onChange={(e) => upload(e.target.files?.[0])}
                  />
                </label>
                <Button
                  onClick={send}
                  disabled={loading || uploading || !body.trim()}
                  size="sm"
                  className="h-8 rounded-lg bg-brand-blue px-3 text-xs text-white hover:bg-brand-blue-hover"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Send />}
                  Qo‘shish
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-3 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
          <Card className="rounded-xl">
            <CardHeader className="border-b px-4 py-2.5">
              <CardTitle className="text-sm font-semibold">Ticket ma’lumotlari</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3.5">
              <Info
                icon={UserRound}
                label="Mijoz"
                value={ticket.callerName || "Noma'lum"}
              />
              <Info
                icon={Phone}
                label="Telefon"
                value={formatUzPhone(ticket.callerPhone)}
                copyValue={ticket.callerPhone}
              />
              <Info
                icon={ShoppingBag}
                label="Order"
                value={ticket.orderId || "Ko'rsatilmagan"}
                copyValue={ticket.orderId}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
                    Status
                  </p>
                  <Select
                    value={ticket.status === "OPEN" ? "NEW" : ticket.status}
                    onValueChange={(v) =>
                      v && patch({ status: v }, "Status yangilandi")
                    }
                    disabled={loading}
                  >
                    <SelectTrigger className="h-8 rounded-md text-[11px]">
                      <SelectValue>
                        {CRM_STATUS_LABELS[ticket.status]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "NEW",
                        "IN_PROGRESS",
                        "WAITING",
                      ].map((k) => (
                        <SelectItem key={k} value={k}>
                          {CRM_STATUS_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
                    Muhimlik
                  </p>
                  <Select
                    value={ticket.priority || "NORMAL"}
                    onValueChange={(v) =>
                      v && patch({ priority: v }, "Muhimlik yangilandi")
                    }
                    disabled={loading}
                  >
                    <SelectTrigger className="h-8 rounded-md text-[11px]">
                      <SelectValue>
                        {CRM_PRIORITY_LABELS[ticket.priority || "NORMAL"]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {["LOW", "NORMAL", "HIGH", "CRITICAL"].map((k) => (
                        <SelectItem key={k} value={k}>
                          {CRM_PRIORITY_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {canManage ? (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
                    Mas’ul operator
                  </p>
                  <Select
                    value={ticket.assignedTo?._id || "UNASSIGNED"}
                    onValueChange={(v) =>
                      patch(
                        { assignedTo: v === "UNASSIGNED" ? null : v },
                        "Operator yangilandi",
                      )
                    }
                    disabled={loading}
                  >
                    <SelectTrigger className="h-8 rounded-md text-[11px]">
                      <SelectValue>
                        {ticket.assignedTo?.name || "Navbatda"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNASSIGNED">Navbatda</SelectItem>
                      {agents.map((a: any) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                !ticket.assignedTo && (
                  <Button
                    className="w-full rounded-xl"
                    onClick={() =>
                      patch(
                        { assignedTo: currentUser.id },
                        "Ticket sizga biriktirildi",
                      )
                    }
                  >
                    O‘zimga olish
                  </Button>
                )
              )}
              <div
                className={cn(
                  "rounded-lg border p-2.5",
                  overdue ? "border-rose-300 bg-rose-500/10" : "bg-muted/40",
                )}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Clock3 className="h-4 w-4" />
                  {overdue ? "SLA muddati o'tgan" : "SLA nazorati"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Muddat:{" "}
                  {ticket.deadlineAt
                    ? formatUzDateTime(ticket.deadlineAt, true)
                    : "Belgilanmagan"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Ochiq vaqt</p>
                  <p className="mt-1 font-bold">
                    {formatDuration(
                      ticket.createdAt,
                      ticket.resolvedAt || nowIso,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Oxirgi aloqa</p>
                  <p className="mt-1 font-bold">
                    {formatDuration(
                      ticket.lastInteractionAt || ticket.createdAt,
                      nowIso,
                    )}{" "}
                    oldin
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardHeader className="border-b px-4 py-2.5">
              <CardTitle className="text-sm font-semibold">Avvalgi ticketlar</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {!previousTickets.length ? (
                <p className="p-3 text-sm text-muted-foreground">
                  Bu raqam bo‘yicha boshqa ticket yo‘q.
                </p>
              ) : (
                previousTickets.map((t: any) => (
                  <Link
                    key={t._id}
                    href={`/crm/tickets/${t._id}`}
                    className="block rounded-xl p-3 hover:bg-muted"
                  >
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-blue-600">
                        {ticketPublicId(t)}
                      </span>
                      <span className="text-muted-foreground">
                        {CRM_STATUS_LABELS[t.status]}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs">{t.problem}</p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value, copyValue }: any) {
  const copy = async () => {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(String(copyValue));
      toast.success(`${label} nusxalandi`);
    } catch {
      toast.error("Nusxalab bo‘lmadi");
    }
  };
  return (
    <div className="group flex items-center gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-xs font-semibold">{value}</p>
      </div>
      {copyValue ? (
        <button type="button" onClick={copy} title={`${label}ni nusxalash`} aria-label={`${label}ni nusxalash`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:opacity-100">
          <Copy className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
