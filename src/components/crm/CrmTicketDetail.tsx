"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MessageCircle,
  Paperclip,
  Phone,
  Send,
  Shield,
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
import CrmTaskPanel from "@/components/crm/CrmTaskPanel";

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
  initialTasks,
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
  const overdue = isOverdue(ticket, nowIso);
  const publicId = ticketPublicId(ticket);
  const closed = ["RESOLVED", "CLOSED"].includes(ticket.status);
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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            nativeButton={false}
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl"
            render={<Link href="/crm" />}
          >
            <ArrowLeft />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold sm:text-2xl">{publicId}</h1>
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
            <p className="text-sm text-muted-foreground">
              {CRM_CATEGORY_LABELS[ticket.category || "OTHER"]}
            </p>
          </div>
        </div>
        <Button
          disabled={loading}
          onClick={() =>
            patch(
              { status: closed ? "IN_PROGRESS" : "RESOLVED" },
              closed ? "Ticket qayta ochildi" : "Ticket hal qilindi",
            )
          }
          className={cn(
            "h-10 rounded-xl",
            closed ? "" : "bg-emerald-600 text-white hover:bg-emerald-700",
          )}
        >
          {closed ? <MessageCircle /> : <CheckCircle2 />}
          {closed ? "Qayta ochish" : "Hal qilish"}
        </Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          <CrmTaskPanel ticketId={ticket._id} initialTasks={initialTasks} agents={agents} currentUser={currentUser} nowIso={nowIso} />
          <Card className="rounded-2xl">
            <CardHeader className="border-b py-4">
              <CardTitle className="text-base">Conversation va tarix</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[58vh] space-y-3 overflow-y-auto p-4 sm:p-5">
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Muammo mazmuni
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6">
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
                        "border p-3 shadow-sm",
                        (isOperator || isCustomer) &&
                          "max-w-[88%] sm:max-w-[76%]",
                        isOperator &&
                          "rounded-2xl rounded-br-md border-brand-blue bg-brand-blue text-white",
                        isCustomer &&
                          "rounded-2xl rounded-bl-md border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40",
                        message.type === "INTERNAL_NOTE" &&
                          "w-full rounded-xl border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
                        isSystem &&
                          "max-w-[92%] rounded-full bg-muted/60 px-4 py-2 shadow-none",
                      )}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold">
                          <Icon className="h-3.5 w-3.5" />
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
                            "shrink-0 text-[10px]",
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
                          "whitespace-pre-wrap text-sm leading-6",
                          isSystem && "text-xs text-muted-foreground",
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
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <div className="mb-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => setType("OPERATOR_RESPONSE")}
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs font-bold",
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
                      "rounded-lg px-3 py-2 text-xs font-bold",
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
                    "text-left text-[11px] font-semibold sm:text-right",
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
                className="min-h-24 rounded-xl"
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
              <div className="mt-3 flex justify-between">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted">
                  <Paperclip className="h-4 w-4" />
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
                  className="rounded-xl bg-brand-blue text-white hover:bg-brand-blue-hover"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Send />}
                  Qo‘shish
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader className="border-b py-4">
              <CardTitle className="text-base">Ticket ma’lumotlari</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <Info
                icon={UserRound}
                label="Mijoz"
                value={ticket.callerName || "Noma'lum"}
              />
              <Info
                icon={Phone}
                label="Telefon"
                value={formatUzPhone(ticket.callerPhone)}
              />
              <Info
                icon={ShoppingBag}
                label="Order"
                value={ticket.orderId || "Ko'rsatilmagan"}
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
                    <SelectTrigger className="h-9 rounded-lg text-xs">
                      <SelectValue>
                        {CRM_STATUS_LABELS[ticket.status]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "NEW",
                        "IN_PROGRESS",
                        "WAITING",
                        "RESOLVED",
                        "CLOSED",
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
                    <SelectTrigger className="h-9 rounded-lg text-xs">
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
                    <SelectTrigger className="h-10 rounded-lg text-xs">
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
                  "rounded-xl border p-3",
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
          <Card className="rounded-2xl">
            <CardHeader className="border-b py-4">
              <CardTitle className="text-base">Avvalgi ticketlar</CardTitle>
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

function Info({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
