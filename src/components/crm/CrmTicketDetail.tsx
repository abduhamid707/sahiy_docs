"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
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
import { formatPhone, formatCallDuration, cn } from "@/lib/utils";
import CrmAudioPlayer from "./CrmAudioPlayer";
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

type CrmAttachment = {
  url: string;
  name: string;
  mimeType?: string;
  size?: number;
};

const MAX_ATTACHMENT_COUNT = 10;
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

function isImageAttachment(attachment: Partial<CrmAttachment>) {
  return (
    attachment.mimeType?.startsWith("image/") ||
    /\.(avif|gif|heic|heif|jpe?g|png|webp)$/i.test(attachment.name || attachment.url || "")
  );
}

function formatAttachmentSize(size?: number) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function copyText(value: string) {
  if (!value) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Some browsers deny navigator.clipboard despite a user click. Fall back below.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}


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
  calls,
  recentCalls,
  currentUser,
  canManage,
  nowIso,
}: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const initialAssignedId = ticket.assignedTo?._id || ticket.assignedTo;
  const initialCollaboratorIds = (ticket.collaborators || []).map((collaborator: any) => String(collaborator?._id || collaborator));
  const initialIsSolver = String(initialAssignedId || "") === currentUser.id || initialCollaboratorIds.includes(currentUser.id);
  const [type, setType] = useState(initialIsSolver || canManage ? "OPERATOR_RESPONSE" : "INTERNAL_NOTE");
  const [attachments, setAttachments] = useState<CrmAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInProgressRef = useRef(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [smsText, setSmsText] = useState(ticket.resolutionSmsText || "");
  const [reviewComment, setReviewComment] = useState("");
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [consultationOperator, setConsultationOperator] = useState("");
  const [consultationQuestion, setConsultationQuestion] = useState("");
  const [consultationReply, setConsultationReply] = useState("");
  const [replyingTo, setReplyingTo] = useState("");
  const overdue = isOverdue(ticket, nowIso);
  const publicId = ticketPublicId(ticket);
  const closed = ["RESOLVED", "CLOSED"].includes(ticket.status);
  const approvalStatus = ticket.resolutionApprovalStatus || "NONE";
  const canApprove = currentUser.role !== "RAHBAR" && (["SUPER_ADMIN", "ADMIN"].includes(currentUser.role) || currentUser.isLead);
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const assignedId = ticket.assignedTo?._id || ticket.assignedTo;
  const collaboratorIds = (ticket.collaborators || []).map((collaborator: any) => String(collaborator?._id || collaborator));
  const isAssignedOperator = currentUser.role === "SUPPORT" && (String(assignedId || "") === currentUser.id || collaboratorIds.includes(currentUser.id));
  const canWriteCustomerReply = isAssignedOperator || canManage;
  const createdById = String(ticket.createdBy?._id || ticket.createdBy || "");
  const canReopen = currentUser.role !== "RAHBAR" && (canManage || isAssignedOperator || createdById === currentUser.id);

  const timeline = [
    ...(messages || []),
    ...(calls || []).map((c: any) => ({ ...c, _isCall: true }))
  ].sort((a, b) => new Date(a.createdAt || a.startedAt).getTime() - new Date(b.createdAt || b.startedAt).getTime());

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
  const uploadFiles = async (incomingFiles: File[]) => {
    if (closed) {
      toast.error("Ticket yopilgan. Fayl yuborish uchun avval qayta oching");
      return;
    }
    if (!incomingFiles.length || uploadInProgressRef.current) return;

    const remainingSlots = Math.max(0, MAX_ATTACHMENT_COUNT - attachments.length);
    if (!remainingSlots) {
      toast.error(`Ko‘pi bilan ${MAX_ATTACHMENT_COUNT} ta fayl biriktirish mumkin`);
      return;
    }

    const selectedFiles = incomingFiles.slice(0, remainingSlots);
    if (incomingFiles.length > remainingSlots) {
      toast.warning(`Faqat ${remainingSlots} ta fayl qo‘shildi`);
    }

    uploadInProgressRef.current = true;
    setUploading(true);
    const uploadedFiles: CrmAttachment[] = [];
    try {
      for (const file of selectedFiles) {
        if (file.size > MAX_ATTACHMENT_SIZE) {
          toast.error(`${file.name || "Fayl"} 5 MB dan katta`);
          continue;
        }

        const data = new FormData();
        data.append("file", file);
        const res = await fetch("/api/crm/upload", {
          method: "POST",
          body: data,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          toast.error(json?.error || `${file.name || "Fayl"} yuklanmadi`);
          continue;
        }
        uploadedFiles.push({
          url: json.url,
          name: json.name || file.name,
          mimeType: json.mimeType || file.type,
          size: json.size || file.size,
        });
      }

      if (uploadedFiles.length) {
        setAttachments((current) => [...current, ...uploadedFiles].slice(0, MAX_ATTACHMENT_COUNT));
        toast.success(`${uploadedFiles.length} ta fayl biriktirildi`);
      }
    } catch (e: any) {
      toast.error(e.message || "Fayl yuklanmadi");
    } finally {
      uploadInProgressRef.current = false;
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  const reopenTicket = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/crm/tickets/${ticket._id}/reopen`, { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Ticketni qayta ochib bo‘lmadi");
      toast.success("Ticket qayta ochildi va avvalgi tarix saqlandi");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Ticketni qayta ochib bo‘lmadi");
    } finally {
      setLoading(false);
    }
  };

  const handleComposerPaste = (event: any) => {
    if (closed) return;
    const clipboard = event.clipboardData;
    const directFiles = Array.from(clipboard?.files || []) as File[];
    const itemFiles = Array.from(clipboard?.items || [])
      .filter((item: any) => item.kind === "file")
      .map((item: any) => item.getAsFile())
      .filter(Boolean) as File[];
    const pastedFiles = directFiles.length ? directFiles : itemFiles;
    if (!pastedFiles.length) return;

    event.preventDefault();
    void uploadFiles(pastedFiles);
  };

  const handleComposerDrop = (event: any) => {
    if (closed) {
      event.preventDefault();
      return;
    }
    const droppedFiles = Array.from(event.dataTransfer?.files || []) as File[];
    if (!droppedFiles.length) return;
    event.preventDefault();
    setIsDraggingFiles(false);
    void uploadFiles(droppedFiles);
  };
  const send = async () => {
    if (closed) return toast.error("Ticket yopilgan. Xabar yuborish uchun avval qayta oching");
    if (!body.trim() && !attachments.length) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/tickets/${ticket._id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          body,
          attachments: attachments.length ? attachments : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBody("");
      setAttachments([]);
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
  const requestConsultation = async () => {
    if (!consultationOperator) return toast.error("Operatorni tanlang");
    if (consultationQuestion.trim().length < 3) return toast.error("Savolni yozing");
    setLoading(true);
    try {
      const response = await fetch(`/api/crm/tickets/${ticket._id}/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REQUEST", operatorId: consultationOperator, question: consultationQuestion.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setConsultationOpen(false);
      setConsultationOperator("");
      setConsultationQuestion("");
      toast.success("Maslahat so‘rovi yuborildi");
      window.dispatchEvent(new Event("crm-notifications-changed"));
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Maslahat so‘rovi yuborilmadi");
    } finally {
      setLoading(false);
    }
  };
  const respondConsultation = async (requestId: string) => {
    if (consultationReply.trim().length < 2) return toast.error("Javobni yozing");
    setLoading(true);
    try {
      const response = await fetch(`/api/crm/tickets/${ticket._id}/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESPOND", requestId, response: consultationReply.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setReplyingTo("");
      setConsultationReply("");
      toast.success("Maslahat javobi yuborildi");
      window.dispatchEvent(new Event("crm-notifications-changed"));
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Javob yuborilmadi");
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
        <div className="flex flex-wrap items-center justify-end gap-2">
        {!closed && isAssignedOperator && (
          <Button onClick={() => setConsultationOpen(true)} disabled={loading} size="sm" variant="outline" className="h-9 rounded-lg text-xs">
            <MessageCircle /> Maslahat so‘rash
          </Button>
        )}
        {closed ? (
          <>
            <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin tasdiqladi
            </span>
            {canReopen && (
              <Button onClick={reopenTicket} disabled={loading} size="sm" variant="outline" className="h-9 rounded-lg text-xs">
                <RotateCcw /> Qayta ochish
              </Button>
            )}
          </>
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
      <Dialog open={consultationOpen} onOpenChange={(open) => !loading && setConsultationOpen(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Boshqa operatordan maslahat so‘rash</DialogTitle>
            <DialogDescription>Ticket sizda qoladi. Tanlangan operator savolga ichki javob beradi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Operator</label>
              <Select value={consultationOperator} onValueChange={(value) => value && setConsultationOperator(value)}>
                <SelectTrigger><SelectValue>{agents.find((agent: any) => agent._id === consultationOperator)?.name || "Operatorni tanlang"}</SelectValue></SelectTrigger>
                <SelectContent>
                  {agents.filter((agent: any) => agent._id !== currentUser.id).map((agent: any) => <SelectItem key={agent._id} value={agent._id}>{agent.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Savol *</label>
              <Textarea autoFocus value={consultationQuestion} onChange={(event) => setConsultationQuestion(event.target.value)} placeholder="Masalan: Bu buyurtmaning Xitoy omboridagi holatini tekshirib bering..." className="min-h-28" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConsultationOpen(false)} disabled={loading}>Bekor qilish</Button>
            <Button onClick={requestConsultation} disabled={loading || !consultationOperator || consultationQuestion.trim().length < 3} className="bg-brand-blue text-white hover:bg-brand-blue-hover">
              {loading ? <Loader2 className="animate-spin" /> : <Send />} Yuborish
            </Button>
          </DialogFooter>
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
                {timeline.length === 0 && (
                  <div className="py-8 text-center text-sm text-slate-500">
                    Hozircha tarix mavjud emas.
                  </div>
                )}
                {timeline.map((item: any) => {
                  if (item._isCall) {
                    return (
                      <div key={item._id} className="flex justify-center my-4">
                        <div className="flex w-full max-w-md items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-900/20">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                            <Phone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
                                📞 Kiruvchi qo‘ng‘iroq
                              </span>
                              <span className="text-[11px] font-medium text-indigo-600/70 dark:text-indigo-400/70">
                                {(() => {
                                  const d = new Date(item.startedAt);
                                  const pad = (n: number) => n.toString().padStart(2, '0');
                                  const months = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];
                                  return `${pad(d.getDate())} ${months[d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                })()}
                              </span>
                            </div>
                            <div className="text-xs text-indigo-800 dark:text-indigo-200 space-y-1">
                              <div className="font-medium">{formatPhone(item.phone) || item.phone}</div>
                              {item.operator && <div className="opacity-80">Operator: {item.operator}</div>}
                              <div className="opacity-80">Gaplashildi: {formatCallDuration(item.duration)} (Jami: {formatCallDuration(item.totalDuration)})</div>
                            </div>
                            {item.audioUrl && (
                              <CrmAudioPlayer 
                                src={`/api/telephony/audio?url=${encodeURIComponent(item.audioUrl)}`} 
                                className="mt-1 bg-white/60 dark:bg-black/20"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const message = item;
                  const meta = typeMeta[message.type] || typeMeta.SYSTEM_EVENT;
                const Icon = meta.icon;
                const isOperator = message.type === "OPERATOR_RESPONSE";
                const isCustomer = message.type === "CUSTOMER_MESSAGE";
                const isSystem = message.type === "SYSTEM_EVENT";
                const isConsultation = message.metadata?.kind === "CONSULTATION";
                const canAnswerConsultation = isConsultation && message.metadata?.status === "PENDING" && String(message.metadata?.requestedTo) === currentUser.id;
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
                      {isConsultation && (
                        <div className="mt-2 space-y-2 border-t border-amber-300/70 pt-2 text-xs">
                          <p className="font-semibold">Maslahat: {message.metadata.requestedByName} → {message.metadata.requestedToName}</p>
                          {message.metadata.status === "ANSWERED" ? (
                            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-2 dark:border-emerald-900 dark:bg-emerald-950/30">
                              <p className="mb-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">{message.metadata.respondedByName} javobi</p>
                              <p className="whitespace-pre-wrap leading-5">{message.metadata.response}</p>
                            </div>
                          ) : canAnswerConsultation ? (
                            replyingTo === message._id ? (
                              <div className="space-y-2">
                                <Textarea value={consultationReply} onChange={(event) => setConsultationReply(event.target.value)} placeholder="Ichki javobingizni yozing..." className="min-h-20 bg-background" />
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => { setReplyingTo(""); setConsultationReply(""); }}>Bekor qilish</Button>
                                  <Button size="sm" onClick={() => respondConsultation(message._id)} disabled={loading || consultationReply.trim().length < 2}>{loading ? <Loader2 className="animate-spin" /> : <Send />} Javob berish</Button>
                                </div>
                              </div>
                            ) : (
                              <Button size="sm" onClick={() => setReplyingTo(message._id)}>Javob berish</Button>
                            )
                          ) : (
                            <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">Javob kutilmoqda</p>
                          )}
                        </div>
                      )}
                      {message.attachments?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {message.attachments.map((attachment: CrmAttachment) =>
                            isImageAttachment(attachment) ? (
                              <a
                                key={attachment.url}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                title={`${attachment.name} — ochish`}
                                className={cn(
                                  "group relative block overflow-hidden rounded-lg border transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
                                  isOperator
                                    ? "border-white/20 bg-white/10"
                                    : "border-border bg-background/60",
                                )}
                              >
                                <img
                                  src={attachment.url}
                                  alt={attachment.name}
                                  loading="lazy"
                                  className="h-28 w-36 object-cover sm:h-32 sm:w-44"
                                />
                                <span
                                  className={cn(
                                    "absolute inset-x-0 bottom-0 truncate px-2 py-1 text-[10px] font-semibold backdrop-blur-sm",
                                    isOperator ? "bg-slate-950/60 text-white" : "bg-background/85 text-foreground",
                                  )}
                                >
                                  {attachment.name}
                                </span>
                              </a>
                            ) : (
                              <a
                                key={attachment.url}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                  "flex max-w-full items-center gap-2 rounded-lg border p-2 text-xs hover:underline",
                                  isOperator
                                    ? "border-white/20 bg-white/10 text-white"
                                    : "bg-background/60 text-blue-600",
                                )}
                              >
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="truncate">{attachment.name}</span>
                              </a>
                            ),
                          )}
                        </div>
                      ) : null}
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
                  {canWriteCustomerReply && <button
                    onClick={() => setType("OPERATOR_RESPONSE")}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-[11px] font-bold",
                      type === "OPERATOR_RESPONSE"
                        ? "bg-brand-blue text-white"
                        : "bg-muted",
                    )}
                  >
                    Javob
                  </button>}
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
                {canWriteCustomerReply && <button
                  onClick={() => setType("CUSTOMER_MESSAGE")}
                  className={cn(
                    "text-left text-[10px] font-semibold sm:text-right",
                    type === "CUSTOMER_MESSAGE"
                      ? "text-blue-600 underline"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Qo‘ng‘iroqdagi mijoz xabarini qayd etish
                </button>}
              </div>
              <div
                className={cn(
                  "relative rounded-xl transition",
                  isDraggingFiles && "bg-brand-blue/5 ring-2 ring-brand-blue/50 ring-offset-2",
                )}
                onDragEnter={(event: any) => {
                  if (closed) return;
                  if (!Array.from(event.dataTransfer?.types || []).includes("Files")) return;
                  event.preventDefault();
                  setIsDraggingFiles(true);
                }}
                onDragOver={(event: any) => {
                  if (closed) return;
                  if (!Array.from(event.dataTransfer?.types || []).includes("Files")) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                  setIsDraggingFiles(true);
                }}
                onDragLeave={(event: any) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setIsDraggingFiles(false);
                  }
                }}
                onDrop={handleComposerDrop}
              >
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onPaste={handleComposerPaste}
                  disabled={closed}
                  placeholder={
                    closed
                      ? "Ticket yopilgan. Davom etish uchun qayta oching."
                      : type === "INTERNAL_NOTE"
                      ? "Faqat jamoa ko'radigan izoh..."
                      : type === "CUSTOMER_MESSAGE"
                        ? "Mijoz qo‘ng‘iroqda aytgan xabarni kiriting..."
                        : "Mijozga javob yoki yangilanish yozing..."
                  }
                  className="min-h-16 resize-none rounded-lg text-xs leading-5"
                />
                {isDraggingFiles && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-brand-blue bg-background/85 px-4 text-center text-xs font-bold text-brand-blue backdrop-blur-[1px]">
                    Fayl yoki rasmni shu yerga tashlang
                  </div>
                )}
              </div>

              {attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2" aria-label="Biriktirilgan fayllar">
                  {attachments.map((attachment, index) => (
                    <div
                      key={`${attachment.url}-${index}`}
                      className="flex max-w-full items-center gap-2 rounded-lg border bg-muted/50 p-1.5 pr-1 text-xs shadow-sm"
                    >
                      {isImageAttachment(attachment) ? (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 overflow-hidden rounded-md border bg-background"
                          title={`${attachment.name} — ochish`}
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="h-10 w-10 object-cover"
                          />
                        </a>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background text-blue-600">
                          <FileText className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0 pr-1">
                        <p className="max-w-40 truncate font-semibold" title={attachment.name}>{attachment.name}</p>
                        {attachment.size ? <p className="text-[10px] text-muted-foreground">{formatAttachmentSize(attachment.size)}</p> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        aria-label={`${attachment.name} faylini olib tashlash`}
                        title="Olib tashlash"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted">
                    <Paperclip className="h-3.5 w-3.5" />
                    {uploading ? "Yuklanmoqda" : "Fayl qo‘shish"}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.zip,.mp3,.ogg"
                      disabled={uploading || closed}
                      onChange={(event) => void uploadFiles(Array.from(event.target.files || []))}
                    />
                  </label>
                  <p className="mt-0.5 truncate px-2 text-[10px] text-muted-foreground">
                    Sudrab tashlang yoki Ctrl+V bosing · 5 MB · {attachments.length}/{MAX_ATTACHMENT_COUNT}
                  </p>
                </div>
                <Button
                  onClick={send}
                  disabled={closed || loading || uploading || (!body.trim() && !attachments.length)}
                  size="sm"
                  className="h-8 shrink-0 rounded-lg bg-brand-blue px-3 text-xs text-white hover:bg-brand-blue-hover"
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
              {ticket.callerId && (
                <Info
                  icon={UserRound}
                  label="User ID"
                  value={ticket.callerId}
                  copyValue={ticket.callerId}
                />
              )}
                <Info
                  icon={UserRound}
                  label="Mijoz"
                  value={ticket.callerName || "Noma'lum"}
                >
                  {(() => {
                    if (!recentCalls) return null;
                    const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
                    const recentCount = recentCalls.filter((c: any) => new Date(c.startedAt) > oneDayAgo).length;
                    if (recentCount >= 3) {
                      return (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          Tez-tez murojaat qilmoqda ({recentCount} ta)
                        </span>
                      );
                    }
                    return null;
                  })()}
                </Info>
              <Info
                icon={Phone}
                label="Telefon"
                value={formatUzPhone(ticket.callerPhone)}
                copyValue={ticket.callerPhone}
              />
              {ticket.orderIssues?.length ? (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">DG buyurtmalar</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ticket.orderIssues.map((issue: any, index: number) => (
                      <DgCopyChip
                        key={`${issue.orderId}-${index}`}
                        orderId={issue.orderId}
                        category={issue.category}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <Info
                  icon={ShoppingBag}
                  label="Order"
                  value={ticket.orderId || "Ko'rsatilmagan"}
                  copyValue={ticket.orderId}
                />
              )}
              {ticket.category === "REPLACEMENT" && (
                <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-2.5 dark:border-blue-900/50 dark:bg-blue-950/20">
                  <Info
                    icon={ShoppingBag}
                    label="Qaytayotgan mahsulot"
                    value={ticket.replacementOldValue || "Kiritilmagan"}
                    copyValue={ticket.replacementOldValue}
                  />
                  <Info
                    icon={ShoppingBag}
                    label="O'rniga kiritilgan zakaz"
                    value={ticket.replacementNewValue || "Kiritilmagan"}
                    copyValue={ticket.replacementNewValue}
                  />
                </div>
              )}
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
                    disabled={closed || loading || !canWriteCustomerReply}
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
                    disabled={closed || loading || !canWriteCustomerReply}
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
              {canManage || isAssignedOperator ? (
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
                    disabled={closed || loading}
                  >
                    <SelectTrigger className="h-8 rounded-md text-[11px]">
                      <SelectValue>
                        {ticket.assignedTo?.name || "Navbatda"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {canManage && <SelectItem value="UNASSIGNED">Navbatda</SelectItem>}
                      {agents.map((a: any) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                !closed && !ticket.assignedTo && (
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
              {ticket.collaborators?.length ? (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Jalb qilinganlar</p>
                  <div className="flex flex-wrap gap-1">
                    {ticket.collaborators.map((collaborator: any) => (
                      <span key={collaborator._id || collaborator} className="rounded-md border bg-muted/30 px-1.5 py-1 text-[10px] font-semibold">
                        {collaborator.name || "Operator"}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
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
              <CardTitle className="text-sm font-semibold">Aloqalar tarixi</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Qo‘ng‘iroqlar</span>
                <span className="font-semibold">{calls?.length || 0} ta</span>
              </div>
              {calls && calls.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Oxirgisi</span>
                  <span className="font-semibold">{(() => {
                    const lastCall = calls[calls.length - 1];
                    const diffMins = Math.floor((new Date().getTime() - new Date(lastCall.startedAt).getTime()) / 60000);
                    if (diffMins < 60) return `${diffMins} daq. oldin`;
                    return `${Math.floor(diffMins / 60)} soat oldin`;
                  })()}</span>
                </div>
              )}
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

function DgCopyChip({ orderId, category }: { orderId: string; category?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!(await copyText(String(orderId || "")))) {
      toast.error("DG nusxalab bo‘lmadi");
      return;
    }
    setCopied(true);
    toast.success("DG nusxalandi");
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={`${orderId} ni nusxalash`}
      className="inline-flex max-w-full items-center gap-1 rounded-md border bg-muted/35 px-2 py-1 text-left transition hover:border-brand-blue/50 hover:bg-brand-blue/5"
    >
      {copied ? <Check className="size-3 shrink-0 text-emerald-600" /> : <Copy className="size-3 shrink-0 text-muted-foreground" />}
      <span className="truncate text-[11px] font-semibold">{orderId}</span>
      {category ? <span className="truncate text-[9px] text-muted-foreground">· {CRM_CATEGORY_LABELS[category] || category}</span> : null}
    </button>
  );
}

function Info({ icon: Icon, label, value, copyValue, children }: any) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!copyValue) return;
    if (await copyText(String(copyValue))) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast.success(`${label} nusxalandi`);
    } else {
      toast.error("Nusxalab bo'lmadi");
    }
  };
  return (
    <div className="group flex items-start gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted mt-0.5">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase text-muted-foreground">
          {label}
        </p>
        {copyValue ? (
          <button
            type="button"
            onClick={copy}
            className={cn(
              "block w-full cursor-pointer truncate text-left text-xs font-semibold hover:text-blue-600 hover:underline",
              copied && "text-emerald-600 dark:text-emerald-400",
            )}
            title={copied ? "Nusxalandi" : `${label}ni nusxalash (Bosish orqali)`}
          >
            {value}
          </button>
        ) : (
          <p className="truncate text-xs font-semibold">{value}</p>
        )}
        {children && <div className="mt-1">{children}</div>}
      </div>
      {copyValue ? (
        <button type="button" onClick={copy} title={copied ? "Nusxalandi" : `${label}ni nusxalash`} aria-label={copied ? `${label} nusxalandi` : `${label}ni nusxalash`} className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:opacity-100", copied && "text-emerald-600 opacity-100 dark:text-emerald-400")}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      ) : null}
    </div>
  );
}
