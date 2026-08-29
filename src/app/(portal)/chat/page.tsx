"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { getToken, onMessage } from "firebase/messaging";
import io, { Socket } from "socket.io-client";
import { ArrowLeft, Bell, BellOff, Check, CheckCheck, Copy, FileText, Info, Loader2, MessageSquarePlus, MoreVertical, Paperclip, Pencil, Pin, PinOff, RefreshCw, Save, Search, Send, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { messaging } from "@/lib/firebase";
import { cn } from "@/lib/utils";

type Conversation = { id: string; name: string; type: "PRIVATE" | "GROUP"; avatar?: string; description?: string; membersCount?: number; participantIds?: string[]; lastMessage?: string; lastSender?: string; lastMessageAt?: string; unreadCount: number; isPublic?: boolean; pinned?: boolean; canManage?: boolean };
type ChatMessage = { id: string; sender: string; senderId: string; senderImage?: string; text: string; isSelf: boolean; time: string; createdAt: string; editedAt?: string; seenCount?: number; file?: { url: string; fileType: "IMAGE" | "DOCUMENT"; name: string } };
type ChatUser = { id: string; name: string; email: string; role: string; image?: string };

function initials(name?: string) { return (name || "U").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function listTime(value?: string) {
  if (!value) return "";
  const date = new Date(value); const today = new Date();
  if (date.toDateString() === today.toDateString()) return new Intl.DateTimeFormat("uz-UZ", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent" }).format(date);
  return new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit", timeZone: "Asia/Tashkent" }).format(date);
}

export default function ChatPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || "";
  const socketRef = useRef<Socket | null>(null);
  const activeIdRef = useRef("");
  const conversationIdsRef = useRef<string[]>([]);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"GROUP" | "PRIVATE">("GROUP");
  const [group, setGroup] = useState({ name: "", description: "", participantIds: [] as string[] });
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [pushLoading, setPushLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editingText, setEditingText] = useState("");
  const [messageActionLoading, setMessageActionLoading] = useState("");
  const [chatControlLoading, setChatControlLoading] = useState(false);
  const [chatSettings, setChatSettings] = useState({ name: "", description: "", participantIds: [] as string[] });
  const activeConversation = conversations.find((conversation) => conversation.id === activeId);

  const fetchConversations = useCallback(async () => {
    const response = await fetch("/api/chat/conversations", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "Chatlar yuklanmadi");
    const nextConversationIds = result.data.map((conversation: Conversation) => conversation.id);
    const removedConversationIds = conversationIdsRef.current.filter((id) => !nextConversationIds.includes(id));
    if (removedConversationIds.length) socketRef.current?.emit("leave-conversations", { conversationIds: removedConversationIds });
    conversationIdsRef.current = nextConversationIds;
    socketRef.current?.emit("join-conversations", { conversationIds: nextConversationIds });
    setConversations(result.data);
    setActiveId((current) => {
      if (nextConversationIds.includes(current)) return current;
      const requested = new URLSearchParams(window.location.search).get("conversation") || "";
      return nextConversationIds.includes(requested) ? requested : result.data[0]?.id || "";
    });
  }, []);

  const fetchUsers = useCallback(async () => {
    const response = await fetch("/api/chat/users", { cache: "no-store" });
    const result = await response.json();
    if (result.success) setUsers(result.data);
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/chat/messages?conversationId=${encodeURIComponent(conversationId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Xabarlar yuklanmadi");
      setMessages(result.data);
      setConversations((items) => items.map((item) => item.id === conversationId ? { ...item, unreadCount: 0 } : item));
      socketRef.current?.emit("messages-seen", { conversationId, userId: currentUserId });
    } catch (error: any) { toast.error(error.message); }
    finally { setLoadingMessages(false); }
  }, [currentUserId]);

  useEffect(() => {
    if (!session) return;
    Promise.all([fetchConversations(), fetchUsers()]).catch((error) => toast.error(error.message));
    fetch("/api/socket").then(() => {
      const socket = io({ transports: ["websocket", "polling"] });
      socketRef.current = socket;
      socket.on("connect", () => {
        if (currentUserId) socket.emit("join-user", { userId: currentUserId });
        socket.emit("join-conversations", { conversationIds: conversationIdsRef.current });
        if (activeIdRef.current) socket.emit("join-conversation", { conversationId: activeIdRef.current });
      });
      socket.on("new-message", ({ conversationId, message: incoming }) => {
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
          new Notification(`${incoming.sender} · Sahiy Chat`, { body: incoming.text, icon: "/favicon.ico" });
        }
        setConversations((items) => items.map((item) => item.id === conversationId ? { ...item, lastMessage: incoming.file?.name ? `📎 ${incoming.file.name}` : incoming.text, lastSender: incoming.sender, lastMessageAt: incoming.createdAt, unreadCount: conversationId === activeIdRef.current ? 0 : item.unreadCount + 1 } : item));
        if (conversationId === activeIdRef.current) { setMessages((items) => items.some((item) => item.id === incoming.id) ? items : [...items, { ...incoming, isSelf: incoming.senderId === currentUserId }]); socket.emit("messages-seen", { conversationId, userId: currentUserId }); }
      });
      socket.on("message-updated", ({ conversationId, message: updated }) => {
        if (conversationId === activeIdRef.current) setMessages((items) => items.map((item) => item.id === updated.id ? { ...item, text: updated.text, editedAt: updated.editedAt } : item));
        fetchConversations().catch(() => undefined);
      });
      socket.on("message-deleted", ({ conversationId, messageId }) => {
        if (conversationId === activeIdRef.current) setMessages((items) => items.filter((item) => item.id !== messageId));
        fetchConversations().catch(() => undefined);
      });
      socket.on("conversation-updated", ({ conversationId, conversation: updated }) => {
        setConversations((items) => items.map((item) => item.id === conversationId ? { ...item, ...updated } : item));
        fetchConversations().catch(() => undefined);
      });
      socket.on("conversation-created", () => fetchConversations().catch(() => undefined));
      socket.on("conversation-deleted", ({ conversationId }) => {
        setConversations((items) => items.filter((item) => item.id !== conversationId));
        if (activeIdRef.current === conversationId) { setActiveId(""); setMobileOpen(false); }
        toast.info("Guruh admin tomonidan o‘chirildi");
      });
      socket.on("typing", ({ conversationId, userId, name, typing }) => setTypingUsers((items) => { const next = { ...items }; const key = `${conversationId}:${userId}`; if (typing) next[key] = name; else delete next[key]; return next; }));
      socket.on("messages-seen", ({ conversationId }) => { if (conversationId === activeIdRef.current) setMessages((items) => items.map((item) => item.isSelf ? { ...item, seenCount: Math.max(item.seenCount || 1, 2) } : item)); });
    });
    const unsubscribe = messaging ? onMessage(messaging, (payload) => { toast(payload.notification?.title || "Sahiy Chat", { description: payload.notification?.body }); fetchConversations().catch(() => undefined); }) : undefined;
    return () => { unsubscribe?.(); socketRef.current?.disconnect(); socketRef.current = null; };
  }, [session, currentUserId, fetchConversations, fetchUsers]);

  useEffect(() => {
    if (!activeId) return;
    activeIdRef.current = activeId;
    socketRef.current?.emit("join-conversation", { conversationId: activeId });
    fetchMessages(activeId);
    setTypingUsers({});
  }, [activeId, fetchMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typingUsers]);

  useEffect(() => {
    setPushEnabled("Notification" in window && localStorage.getItem("sahiy_chat_push_enabled") === "true" && Notification.permission === "granted");
  }, []);

  const filteredConversations = useMemo(() => conversations.filter((conversation) => `${conversation.name} ${conversation.lastMessage || ""}`.toLowerCase().includes(search.toLowerCase())), [conversations, search]);
  const activeTyping = Object.entries(typingUsers).filter(([key]) => key.startsWith(`${activeId}:`)).map(([, name]) => name);

  const selectConversation = (id: string) => { setActiveId(id); setMobileOpen(true); window.history.replaceState(null, "", `/chat?conversation=${id}`); };

  const sendMessage = async (file?: ChatMessage["file"], fileText?: string) => {
    const text = (fileText || message).trim();
    if (!activeId || !text || sending) return;
    setSending(true); setMessage("");
    socketRef.current?.emit("typing", { conversationId: activeId, userId: currentUserId, name: session?.user?.name || "", typing: false });
    try {
      const response = await fetch("/api/chat/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: activeId, text, file }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Xabar yuborilmadi");
      setMessages((items) => [...items, result.data]);
      setConversations((items) => items.map((item) => item.id === activeId ? { ...item, lastMessage: file ? `📎 ${file.name}` : text, lastSender: session?.user?.name || "", lastMessageAt: result.data.createdAt } : item));
      socketRef.current?.emit("message-created", { conversationId: activeId, message: result.data });
    } catch (error: any) { setMessage(text); toast.error(error.message); }
    finally { setSending(false); }
  };

  const onTyping = (value: string) => {
    setMessage(value);
    if (!activeId) return;
    socketRef.current?.emit("typing", { conversationId: activeId, userId: currentUserId, name: session?.user?.name || "", typing: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socketRef.current?.emit("typing", { conversationId: activeId, userId: currentUserId, name: session?.user?.name || "", typing: false }), 1200);
  };

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const body = new FormData(); body.append("file", file);
    try {
      const response = await fetch("/api/chat/upload", { method: "POST", body }); const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Fayl yuklanmadi");
      await sendMessage({ url: result.data.url, fileType: file.type.startsWith("image/") ? "IMAGE" : "DOCUMENT", name: file.name }, `Fayl: ${file.name}`);
    } catch (error: any) { toast.error(error.message); }
    finally { event.target.value = ""; }
  };

  const createPrivate = async (user: ChatUser) => {
    const response = await fetch("/api/chat/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "PRIVATE", userId: user.id }) });
    const result = await response.json(); if (!response.ok || !result.success) return toast.error(result.error || "Chat yaratilmadi");
    socketRef.current?.emit("conversation-created", { participantIds: [currentUserId, user.id], conversationId: result.data.id });
    setDialogOpen(false); await fetchConversations(); selectConversation(result.data.id);
  };

  const createGroup = async () => {
    if (group.name.trim().length < 2 || !group.participantIds.length) return toast.error("Guruh nomi va kamida bitta a’zo kerak");
    const response = await fetch("/api/chat/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "GROUP", ...group }) });
    const result = await response.json(); if (!response.ok || !result.success) return toast.error(result.error || "Guruh yaratilmadi");
    socketRef.current?.emit("conversation-created", { participantIds: [currentUserId, ...group.participantIds], conversationId: result.data.id });
    setConversations((items) => [result.data, ...items]); setGroup({ name: "", description: "", participantIds: [] }); setDialogOpen(false); selectConversation(result.data.id); toast.success("Guruh yaratildi");
  };

  const enablePush = async () => {
    if (!messaging || !("Notification" in window) || !("serviceWorker" in navigator)) return toast.error("Bu brauzer push’ni qo‘llamaydi");
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission(); if (permission !== "granted") throw new Error("Notification ruxsati berilmadi");
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      const token = await getToken(messaging, { serviceWorkerRegistration: registration, ...(vapidKey ? { vapidKey } : {}) });
      const response = await fetch("/api/user/fcm-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      if (!response.ok) throw new Error("Push token saqlanmadi");
      localStorage.setItem("sahiy_chat_fcm_token", token);
      localStorage.setItem("sahiy_chat_push_enabled", "true");
      setPushEnabled(true);
      toast.success("Chat bildirishnomalari yoqildi");
    } catch (error: any) { toast.error(error.message || "Push yoqilmadi"); }
    finally { setPushLoading(false); }
  };

  const togglePush = async () => {
    if (!pushEnabled) return enablePush();
    setPushLoading(true);
    try {
      const token = localStorage.getItem("sahiy_chat_fcm_token");
      if (token) {
        const response = await fetch("/api/user/fcm-token", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
        if (!response.ok) throw new Error("Bildirishnomani o‘chirib bo‘lmadi");
      }
      localStorage.removeItem("sahiy_chat_fcm_token");
      localStorage.removeItem("sahiy_chat_push_enabled");
      setPushEnabled(false);
      toast.success("Chat bildirishnomalari o‘chirildi");
    } catch (error: any) { toast.error(error.message || "Bildirishnoma o‘chirilmadi"); }
    finally { setPushLoading(false); }
  };

  const refreshActiveChat = async () => {
    setChatMenuOpen(false);
    await Promise.all([fetchConversations(), fetchMessages(activeId)]);
    toast.success("Chat yangilandi");
  };

  const copyChatLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/chat?conversation=${activeId}`);
    setChatMenuOpen(false);
    toast.success("Chat havolasi nusxalandi");
  };

  const togglePin = async (conversation: Conversation) => {
    const pinned = !conversation.pinned;
    try {
      const response = await fetch(`/api/chat/conversations/${conversation.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "PIN", pinned }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Pin holati saqlanmadi");
      setConversations((items) => items.map((item) => item.id === conversation.id ? { ...item, pinned } : item).sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()));
      toast.success(pinned ? "Chat tepaga mahkamlandi" : "Chat pin’dan olindi");
    } catch (error: any) { toast.error(error.message); }
  };

  const editMessage = async (item: ChatMessage) => {
    const text = editingText.trim();
    if (!text || text === item.text) { setEditingMessageId(""); return; }
    setMessageActionLoading(item.id);
    try {
      const response = await fetch(`/api/chat/messages/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Xabar tahrirlanmadi");
      setMessages((items) => items.map((messageItem) => messageItem.id === item.id ? { ...messageItem, text: result.data.text, editedAt: result.data.editedAt } : messageItem));
      socketRef.current?.emit("message-updated", { conversationId: activeId, message: result.data });
      setEditingMessageId("");
      fetchConversations().catch(() => undefined);
      toast.success("Xabar tahrirlandi");
    } catch (error: any) { toast.error(error.message); }
    finally { setMessageActionLoading(""); }
  };

  const deleteMessage = async (item: ChatMessage) => {
    if (!window.confirm("Xabarni o‘chirasizmi? Bu amalni qaytarib bo‘lmaydi.")) return;
    setMessageActionLoading(item.id);
    try {
      const response = await fetch(`/api/chat/messages/${item.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Xabar o‘chirilmadi");
      setMessages((items) => items.filter((messageItem) => messageItem.id !== item.id));
      socketRef.current?.emit("message-deleted", { conversationId: activeId, messageId: item.id });
      fetchConversations().catch(() => undefined);
      toast.success("Xabar o‘chirildi");
    } catch (error: any) { toast.error(error.message); }
    finally { setMessageActionLoading(""); }
  };

  const openChatInfo = () => {
    if (!activeConversation) return;
    setChatSettings({ name: activeConversation.name, description: activeConversation.description || "", participantIds: activeConversation.participantIds || [] });
    setChatMenuOpen(false);
    setInfoOpen(true);
    fetchUsers();
  };

  const saveChatSettings = async () => {
    if (!activeConversation) return;
    setChatControlLoading(true);
    try {
      const response = await fetch(`/api/chat/conversations/${activeConversation.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "UPDATE", ...chatSettings }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Guruh yangilanmadi");
      setConversations((items) => items.map((item) => item.id === activeConversation.id ? { ...item, ...result.data } : item));
      socketRef.current?.emit("conversation-updated", { conversationId: activeConversation.id, conversation: result.data, participantIds: result.data.participantIds });
      setInfoOpen(false);
      toast.success("Guruh sozlamalari saqlandi");
    } catch (error: any) { toast.error(error.message); }
    finally { setChatControlLoading(false); }
  };

  const deleteChat = async () => {
    if (!activeConversation || !window.confirm(`“${activeConversation.name}” guruhini barcha xabarlari bilan o‘chirasizmi?`)) return;
    setChatControlLoading(true);
    try {
      const response = await fetch(`/api/chat/conversations/${activeConversation.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Guruh o‘chirilmadi");
      socketRef.current?.emit("conversation-deleted", { conversationId: activeConversation.id });
      setConversations((items) => items.filter((item) => item.id !== activeConversation.id));
      setInfoOpen(false); setActiveId(""); setMobileOpen(false);
      toast.success("Guruh o‘chirildi");
    } catch (error: any) { toast.error(error.message); }
    finally { setChatControlLoading(false); }
  };

  return <div className="-m-4 flex h-[calc(100vh-4rem)] overflow-hidden border-y bg-background lg:-m-8 lg:h-[calc(100vh-4rem)]">
    <aside className={cn("w-full shrink-0 border-r bg-card md:flex md:w-[360px] md:flex-col", mobileOpen ? "hidden" : "flex flex-col")}>
      <div className="flex h-16 items-center gap-2 border-b px-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Chatlardan qidirish" className="h-10 rounded-md bg-muted/60 pl-9"/></div><Button size="icon" variant="ghost" className="rounded-md" onClick={() => { setDialogOpen(true); fetchUsers(); }} aria-label="Yangi chat"><MessageSquarePlus/></Button></div>
      <div className="flex-1 overflow-y-auto">{filteredConversations.map((conversation) => <div key={conversation.id} className={cn("group flex items-center border-b border-border/60 transition hover:bg-muted/60", activeId === conversation.id && "bg-blue-500/10")}><button onClick={() => selectConversation(conversation.id)} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left"><Avatar className="h-12 w-12 shrink-0"><AvatarImage src={conversation.avatar}/><AvatarFallback className={cn("font-bold", conversation.type === "GROUP" ? "bg-blue-600 text-white" : "bg-muted")}>{conversation.type === "GROUP" ? <Users className="h-5 w-5"/> : initials(conversation.name)}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-bold">{conversation.pinned && <Pin className="h-3 w-3 shrink-0 fill-current text-blue-600"/>}<span className="truncate">{conversation.name}</span></span><span className="shrink-0 text-[10px] text-muted-foreground">{listTime(conversation.lastMessageAt)}</span></span><span className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-xs text-muted-foreground">{conversation.lastSender ? `${conversation.lastSender}: ` : ""}{conversation.lastMessage}</span>{conversation.unreadCount > 0 && <span className="flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{conversation.unreadCount}</span>}</span></span></button><button onClick={() => togglePin(conversation)} className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground opacity-100 hover:bg-muted hover:text-blue-600 md:opacity-0 md:group-hover:opacity-100" aria-label={conversation.pinned ? "Pin’dan olish" : "Tepaga mahkamlash"} title={conversation.pinned ? "Pin’dan olish" : "Tepaga mahkamlash"}>{conversation.pinned ? <PinOff className="h-4 w-4"/> : <Pin className="h-4 w-4"/>}</button></div>)}</div>
    </aside>

    <section className={cn("min-w-0 flex-1 flex-col bg-muted/20 md:flex", mobileOpen ? "flex" : "hidden")}>
      {activeConversation ? <><header className="flex h-16 items-center justify-between border-b bg-card px-3 sm:px-4"><div className="flex min-w-0 items-center gap-3"><Button size="icon" variant="ghost" className="rounded-md md:hidden" onClick={() => setMobileOpen(false)}><ArrowLeft/></Button><Avatar className="h-10 w-10"><AvatarImage src={activeConversation.avatar}/><AvatarFallback className="bg-blue-600 font-bold text-white">{activeConversation.type === "GROUP" ? <Users className="h-4 w-4"/> : initials(activeConversation.name)}</AvatarFallback></Avatar><div className="min-w-0"><p className="flex items-center gap-1.5 truncate text-sm font-bold">{activeConversation.pinned && <Pin className="h-3 w-3 fill-current text-blue-600"/>}{activeConversation.name}</p><p className={cn("truncate text-xs", activeTyping.length ? "text-blue-500" : "text-muted-foreground")}>{activeTyping.length ? `${activeTyping.join(", ")} yozmoqda...` : activeConversation.type === "GROUP" ? `${activeConversation.membersCount || 0} ta a’zo` : "Shaxsiy chat"}</p></div></div><div className="relative flex items-center gap-1"><Button size="icon" variant="ghost" className={cn("rounded-md", pushEnabled && "text-blue-600")} onClick={togglePush} disabled={pushLoading} aria-label={pushEnabled ? "Chat bildirishnomalarini o‘chirish" : "Chat bildirishnomalarini yoqish"} title={pushEnabled ? "Bildirishnomalar yoqilgan" : "Bildirishnomalarni yoqish"}>{pushLoading ? <Loader2 className="animate-spin"/> : pushEnabled ? <Bell className="fill-blue-600/20"/> : <BellOff/>}</Button><Button size="icon" variant="ghost" className="rounded-md" onClick={() => setChatMenuOpen((open) => !open)} aria-label="Chat menyusi" aria-expanded={chatMenuOpen}><MoreVertical/></Button>{chatMenuOpen && <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden border bg-popover py-1 shadow-xl"><button onClick={openChatInfo} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted"><Info className="h-4 w-4"/>{activeConversation.canManage ? "Guruhni boshqarish" : "Chat ma’lumoti"}</button><button onClick={() => { togglePin(activeConversation); setChatMenuOpen(false); }} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted">{activeConversation.pinned ? <PinOff className="h-4 w-4"/> : <Pin className="h-4 w-4"/>}{activeConversation.pinned ? "Pin’dan olish" : "Tepaga mahkamlash"}</button><button onClick={refreshActiveChat} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted"><RefreshCw className="h-4 w-4"/>Chatni yangilash</button><button onClick={copyChatLink} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted"><Copy className="h-4 w-4"/>Havolani nusxalash</button><button onClick={() => setChatMenuOpen(false)} className="flex w-full items-center gap-3 border-t px-3 py-2.5 text-left text-sm hover:bg-muted"><X className="h-4 w-4"/>Yopish</button></div>}</div></header>
        <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-6">{loadingMessages ? <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div> : <div className="mx-auto flex max-w-4xl flex-col gap-1.5">{messages.map((item) => <div key={item.id} className={cn("group flex max-w-[88%] items-end gap-2 sm:max-w-[72%]", item.isSelf ? "self-end" : "self-start")}>
          {!item.isSelf && <Avatar className="mb-0.5 h-7 w-7 shrink-0"><AvatarImage src={item.senderImage}/><AvatarFallback className="text-[10px]">{initials(item.sender)}</AvatarFallback></Avatar>}
          {(item.isSelf || activeConversation.canManage) && editingMessageId !== item.id && <div className="mb-1 flex shrink-0 items-center border bg-card opacity-100 shadow-sm md:opacity-0 md:group-hover:opacity-100">{item.isSelf && <button onClick={() => { setEditingMessageId(item.id); setEditingText(item.text); }} className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Xabarni tahrirlash" title="Tahrirlash"><Pencil className="h-3.5 w-3.5"/></button>}<button onClick={() => deleteMessage(item)} disabled={messageActionLoading === item.id} className="p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" aria-label="Xabarni o‘chirish" title="O‘chirish">{messageActionLoading === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Trash2 className="h-3.5 w-3.5"/>}</button></div>}
          <div className={cn("min-w-0 border px-3 py-2 shadow-sm", item.isSelf ? "rounded-md rounded-br-none border-blue-600 bg-blue-600 text-white" : "rounded-md rounded-bl-none bg-card")}>
            {!item.isSelf && activeConversation.type === "GROUP" && <p className="mb-0.5 text-[11px] font-bold text-blue-500">{item.sender}</p>}
            {item.file?.fileType === "IMAGE" && <a href={item.file.url} target="_blank" rel="noreferrer"><img src={item.file.url} alt={item.file.name} className="mb-2 max-h-72 max-w-full rounded-sm object-cover"/></a>}
            {item.file?.fileType === "DOCUMENT" && <a href={item.file.url} target="_blank" rel="noreferrer" className={cn("mb-1 flex items-center gap-2 border p-2 text-xs", item.isSelf ? "border-white/20" : "border-border")}><FileText className="h-5 w-5"/><span className="truncate">{item.file.name}</span></a>}
            {editingMessageId === item.id ? <div className="min-w-[220px]"><Textarea autoFocus value={editingText} onChange={(event) => setEditingText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); editMessage(item); } if (event.key === "Escape") setEditingMessageId(""); }} className="min-h-20 resize-none rounded-sm bg-background text-foreground"/><div className="mt-2 flex justify-end gap-1"><button onClick={() => setEditingMessageId("")} className="px-2 py-1 text-xs text-white/80 hover:text-white">Bekor</button><button onClick={() => editMessage(item)} disabled={messageActionLoading === item.id || !editingText.trim()} className="flex items-center gap-1 bg-white px-2 py-1 text-xs font-bold text-blue-700"><Save className="h-3 w-3"/>Saqlash</button></div></div> : <p className="whitespace-pre-wrap break-words text-sm leading-5">{item.text}</p>}<div className={cn("mt-1 flex items-center justify-end gap-1 text-[9px]", item.isSelf ? "text-white/70" : "text-muted-foreground")}>{item.editedAt && <span>tahrirlangan ·</span>}<span>{item.time}</span>{item.isSelf && (item.seenCount && item.seenCount > 1 ? <CheckCheck className="h-3 w-3"/> : <Check className="h-3 w-3"/>)}</div>
          </div></div>)}{activeTyping.length > 0 && <div className="mt-1 self-start rounded-md border bg-card px-3 py-2 text-xs text-blue-500">••• {activeTyping.join(", ")} yozmoqda</div>}<div ref={bottomRef}/></div>}</div>
        <footer className="border-t bg-card p-2 sm:p-3"><div className="mx-auto flex max-w-4xl items-end gap-2"><label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><Paperclip className="h-5 w-5"/><input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.zip" onChange={uploadFile}/></label><Textarea value={message} onChange={(event) => onTyping(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="Xabar yozing..." className="max-h-32 min-h-10 resize-none rounded-md bg-muted/40 py-2.5"/><Button size="icon" onClick={() => sendMessage()} disabled={!message.trim() || sending} className="h-10 w-10 shrink-0 rounded-md bg-blue-600 text-white hover:bg-blue-700">{sending ? <Loader2 className="animate-spin"/> : <Send/>}</Button></div></footer></> : <div className="flex h-full flex-col items-center justify-center text-center"><MessageSquarePlus className="h-12 w-12 text-muted-foreground/30"/><p className="mt-4 font-bold">Chatni tanlang</p><p className="mt-1 text-sm text-muted-foreground">Yoki yangi guruh yarating</p></div>}
    </section>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[85vh] overflow-hidden rounded-lg sm:max-w-lg"><DialogHeader><DialogTitle>Yangi chat</DialogTitle></DialogHeader><div className="grid grid-cols-2 border"><button onClick={() => setDialogMode("GROUP")} className={cn("px-3 py-2.5 text-sm font-semibold", dialogMode === "GROUP" ? "bg-blue-600 text-white" : "bg-muted")}>Guruh yaratish</button><button onClick={() => setDialogMode("PRIVATE")} className={cn("px-3 py-2.5 text-sm font-semibold", dialogMode === "PRIVATE" ? "bg-blue-600 text-white" : "bg-muted")}>Shaxsiy chat</button></div>
      {dialogMode === "GROUP" ? <div className="space-y-4 overflow-hidden"><div className="space-y-1.5"><Label>Guruh nomi *</Label><Input value={group.name} onChange={(event) => setGroup({ ...group, name: event.target.value })} placeholder="Masalan: Muammoli tovarlar" className="rounded-md"/></div><div className="space-y-1.5"><Label>Qisqa tavsif</Label><Input value={group.description} onChange={(event) => setGroup({ ...group, description: event.target.value })} placeholder="Guruh maqsadi..." className="rounded-md"/></div><div><div className="mb-2 flex justify-between"><Label>A’zolar *</Label><span className="text-xs text-muted-foreground">{group.participantIds.length} tanlandi</span></div><div className="max-h-72 overflow-y-auto border">{users.map((user) => { const selected = group.participantIds.includes(user.id); return <button key={user.id} onClick={() => setGroup({ ...group, participantIds: selected ? group.participantIds.filter((id) => id !== user.id) : [...group.participantIds, user.id] })} className={cn("flex w-full items-center gap-3 border-b px-3 py-2.5 text-left hover:bg-muted", selected && "bg-blue-500/10")}><span className={cn("flex h-5 w-5 items-center justify-center border", selected && "border-blue-600 bg-blue-600 text-white")}>{selected && <Check className="h-3.5 w-3.5"/>}</span><Avatar className="h-8 w-8"><AvatarImage src={user.image}/><AvatarFallback className="text-[10px]">{initials(user.name)}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{user.name}</span><span className="block truncate text-[10px] text-muted-foreground">{user.role} · {user.email}</span></span></button>; })}</div></div><Button onClick={createGroup} className="w-full rounded-md bg-blue-600 text-white hover:bg-blue-700"><Users/>Guruh yaratish</Button></div>
      : <div className="max-h-[60vh] overflow-y-auto border">{users.map((user) => <button key={user.id} onClick={() => createPrivate(user)} className="flex w-full items-center gap-3 border-b px-3 py-3 text-left hover:bg-muted"><Avatar className="h-10 w-10"><AvatarImage src={user.image}/><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{user.name}</span><span className="block truncate text-xs text-muted-foreground">{user.email}</span></span><span className="text-[10px] text-muted-foreground">{user.role}</span></button>)}</div>}
    </DialogContent></Dialog>
    <Dialog open={infoOpen} onOpenChange={setInfoOpen}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-lg sm:max-w-lg"><DialogHeader><DialogTitle>{activeConversation?.canManage ? "Guruhni boshqarish" : "Chat ma’lumoti"}</DialogTitle></DialogHeader>{activeConversation && <div className="space-y-4"><div className="flex items-center gap-3 border-b pb-4"><Avatar className="h-14 w-14"><AvatarImage src={activeConversation.avatar}/><AvatarFallback className="bg-blue-600 font-bold text-white">{activeConversation.type === "GROUP" ? <Users/> : initials(activeConversation.name)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate font-bold">{activeConversation.name}</p><p className="text-xs text-muted-foreground">{activeConversation.type === "GROUP" ? `${activeConversation.membersCount || 0} ta a’zo` : "Shaxsiy chat"}</p></div></div>{activeConversation.canManage ? <><div className="space-y-1.5"><Label>Guruh nomi</Label><Input value={chatSettings.name} onChange={(event) => setChatSettings((value) => ({ ...value, name: event.target.value }))} className="rounded-md"/></div><div className="space-y-1.5"><Label>Tavsif</Label><Textarea value={chatSettings.description} onChange={(event) => setChatSettings((value) => ({ ...value, description: event.target.value }))} className="min-h-20 rounded-md"/></div><div><div className="mb-2 flex items-center justify-between"><Label>A’zolarni boshqarish</Label><span className="text-xs text-muted-foreground">{chatSettings.participantIds.length} tanlangan</span></div><div className="max-h-56 overflow-y-auto border">{users.map((user) => { const selected = chatSettings.participantIds.includes(user.id); return <button key={user.id} onClick={() => setChatSettings((value) => ({ ...value, participantIds: selected ? value.participantIds.filter((id) => id !== user.id) : [...value.participantIds, user.id] }))} className={cn("flex w-full items-center gap-3 border-b px-3 py-2 text-left hover:bg-muted", selected && "bg-blue-500/10")}><span className={cn("flex h-5 w-5 items-center justify-center border", selected && "border-blue-600 bg-blue-600 text-white")}>{selected && <Check className="h-3.5 w-3.5"/>}</span><Avatar className="h-8 w-8"><AvatarImage src={user.image}/><AvatarFallback className="text-[10px]">{initials(user.name)}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{user.name}</span><span className="block truncate text-[10px] text-muted-foreground">{user.role} · {user.email}</span></span></button>; })}</div></div><div className="flex flex-col gap-2 border-t pt-4 sm:flex-row"><Button onClick={saveChatSettings} disabled={chatControlLoading || chatSettings.name.trim().length < 2} className="flex-1 rounded-md bg-blue-600 text-white hover:bg-blue-700">{chatControlLoading ? <Loader2 className="animate-spin"/> : <Save/>}Saqlash</Button>{!activeConversation.isPublic && <Button variant="outline" onClick={deleteChat} disabled={chatControlLoading} className="rounded-md border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"><Trash2/>Guruhni o‘chirish</Button>}</div></> : <>{activeConversation.description && <div><p className="text-xs font-semibold text-muted-foreground">Tavsif</p><p className="mt-1 text-sm">{activeConversation.description}</p></div>}<div><p className="text-xs font-semibold text-muted-foreground">Bildirishnoma</p><p className="mt-1 flex items-center gap-2 text-sm">{pushEnabled ? <><Bell className="h-4 w-4 text-blue-600"/>Yoqilgan</> : <><BellOff className="h-4 w-4"/>O‘chirilgan</>}</p></div></>}</div>}</DialogContent></Dialog>
  </div>;
}
