"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Send, Paperclip, Smile, MoreVertical, Plus, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import io from "socket.io-client";
import { useSession } from "next-auth/react";
import { messaging } from "@/lib/firebase";
import { getToken } from "firebase/messaging";

let socket: any;

export default function ChatPage() {
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState("general");
  const [users, setUsers] = useState<any[]>([]);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  useEffect(() => {
    if (session) {
      fetchConversations();
      requestNotificationPermission();
      fetchUsers();
    }
    socketInitializer();
    return () => {
      if (socket) socket.disconnect();
    };
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchMessages();
    }
  }, [activeConversation, session]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      const data = await res.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/chat/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const createConversation = async (userId: string) => {
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.success) {
        setIsNewChatOpen(false);
        fetchConversations();
        setActiveConversation(data.data.id);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          console.log("Notification permission granted.");
          if (messaging) {
            const VAPID_KEY = "BPjS0zYKJrgOTFpOeROEUHWAKoNRXWsuhyuV43Vn_oqU9tbNaN6CDVq0WnI6d69Iv7AL4x5E5_R2SViTbsWmlMI"; 
            
            try {
              // Service worker'ni qo'lda ro'yxatdan o'tkazish
              const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
              console.log("Service Worker ro'yxatdan o'tdi.");

              const token = await getToken(messaging, { 
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
              });
              console.log("FCM Token:", token);
              
              // Tokenni bazaga saqlash
              await fetch("/api/user/fcm-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token })
              });
            } catch (err) {
              console.log("FCM Token olishda xatolik:", err);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error getting FCM token:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${activeConversation}`);
      const data = await res.json();
      if (data.success) {
        const mappedMessages = data.data.map((msg: any) => ({
          ...msg,
          isSelf: msg.senderId === session?.user?.id
        }));
        setMessages(mappedMessages);
        fetchConversations(); // Yangi xabarlar o'qilgach, sidebar dagi sonlarni yangilaymiz
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const socketInitializer = async () => {
    await fetch("/api/socket");
    socket = io();

    socket.on("connect", () => {
      console.log("connected to socket");
      socket.emit("join-conversation", "general");
    });

    socket.on("new-message", (msg: any) => {
      setMessages((prev) => [
        ...prev, 
        { ...msg, isSelf: msg.senderId === session?.user?.id }
      ]);
    });
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const senderName = session?.user?.name || "Anonymous";
    const senderId = session?.user?.id || "64b5e1b5e1b5e1b5e1b5e1b5";

    const newMsg = {
      id: Math.random().toString(),
      sender: senderName,
      senderId: senderId,
      text: message,
      isSelf: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      conversationId: activeConversation
    };

    // Optimistic update
    setMessages((prev) => [...prev, newMsg]);
    setMessage("");

    try {
      // 1. Save to DB via API
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversation,
          senderId: senderId,
          text: message
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        newMsg.id = data.data._id;
      }

      // 2. Emit via socket for real-time
      if (socket) {
        socket.emit("send-message", newMsg);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const renderMessageText = (text: string) => {
    if (!text) return null;
    
    const parts = text.split(/(@\w+|#\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span key={index} className="text-blue-500 font-semibold cursor-pointer hover:underline">
            {part}
          </span>
        );
      } else if (part.startsWith("#")) {
        return (
          <span key={index} className="text-emerald-500 font-semibold cursor-pointer hover:underline">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        const newMsg = {
          id: Math.random().toString(),
          conversationId: activeConversation,
          text: `Fayl yuborildi: ${file.name}`,
          senderId: session?.user?.id,
          sender: session?.user?.name,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: true,
          file: {
            url: data.data.url,
            fileType: file.type.startsWith("image/") ? "IMAGE" : "DOCUMENT",
            name: file.name
          }
        };

        setMessages((prev) => [...prev, newMsg]);

        const saveRes = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeConversation,
            text: `Fayl yuborildi: ${file.name}`,
            file: newMsg.file
          })
        });
        const saveData = await saveRes.json();
        if (saveData.success) {
          newMsg.id = saveData.data._id;
        }

        if (socket) {
          socket.emit("send-message", newMsg);
        }
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const currentConversation = conversations.find(c => c.id === activeConversation);

  return (
    <div className="h-[calc(100vh-120px)] flex gap-4">
      {/* Sidebar - Conversations */}
      <div className={`w-80 bg-card rounded-[2rem] border border-border shadow-xl flex flex-col overflow-hidden ${isMobileChatOpen ? "hidden md:flex" : "flex w-full md:w-80"}`}>
        <div className="p-4 border-bottom border-border flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input className="pl-10 rounded-xl" placeholder="Qidirish..." />
          </div>
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => { fetchUsers(); setIsNewChatOpen(true); }}>
            <Plus className="w-4 h-4" />
          </Button>
          <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Yangi chat</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
                {users.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm">Foydalanuvchilar topilmadi</p>
                ) : (
                  users.map((user) => (
                    <div 
                      key={user.id}
                      className="flex items-center gap-3 p-3 hover:bg-accent rounded-xl cursor-pointer transition-colors"
                      onClick={() => createConversation(user.id)}
                    >
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                          {user.name ? user.name[0] : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <span className="text-xs bg-accent px-2 py-1 rounded-md">{user.role}</span>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => (
            <div 
              key={conv.id}
              className={`flex items-center gap-3 p-3 ${activeConversation === conv.id ? "bg-accent" : "hover:bg-accent/50"} rounded-2xl cursor-pointer transition-colors`}
              onClick={() => {
                setActiveConversation(conv.id);
                setIsMobileChatOpen(true);
              }}
            >
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {conv.name ? conv.name[0] : "C"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className="font-bold truncate">{conv.name}</p>
                  <span className="text-xs text-muted-foreground">Hozir</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
              </div>
              {conv.unreadCount > 0 && (
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] text-primary-foreground font-bold">
                  {conv.unreadCount}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 bg-card rounded-[2rem] border border-border shadow-xl flex-col overflow-hidden ${isMobileChatOpen ? "flex w-full" : "hidden md:flex"}`}>
        {/* Chat Header */}
        <div className="p-4 border-bottom border-border flex justify-between items-center bg-accent/20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileChatOpen(false)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {currentConversation?.name ? currentConversation.name[0] : "C"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold">{currentConversation?.name || "Sahiy Team"}</p>
              <p className="text-xs text-muted-foreground">
                {currentConversation?.name === "Sahiy Team" ? `${users.length} ta a'zo` : "Online"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex items-end gap-3 max-w-[70%] ${msg.isSelf ? "self-end" : "self-start"}`}
            >
              {!msg.isSelf && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback>{msg.sender ? msg.sender[0] : "A"}</AvatarFallback>
                </Avatar>
              )}
              <div className={`${msg.isSelf ? "bg-primary text-primary-foreground" : "bg-accent"} p-4 rounded-3xl ${msg.isSelf ? "rounded-br-none" : "rounded-bl-none"}`}>
                {!msg.isSelf && (
                  <p className="text-xs font-bold text-primary mb-1">{msg.sender}</p>
                )}
                <p className="text-sm">{renderMessageText(msg.text)}</p>
                {msg.file && (
                  <div className="mt-2 p-2 bg-background/50 rounded-lg flex flex-col gap-2">
                    {msg.file.fileType === "IMAGE" ? (
                      <img src={msg.file.url} alt={msg.file.name} className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90" onClick={() => window.open(msg.file.url, '_blank')} />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                        <a href={msg.file.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate max-w-[150px]">
                          {msg.file.name}
                        </a>
                      </div>
                    )}
                  </div>
                )}
                <span className={`text-[10px] block text-right mt-1 ${msg.isSelf ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {msg.time} {msg.isSelf && "· Ko'rildi"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 border-top border-border bg-accent/10">
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              onChange={handleFileUpload} 
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            </Button>
            <div className="flex-1 relative">
              <Input 
                className="rounded-2xl pr-12 h-11" 
                placeholder="Xabar yozing..." 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2 rounded-full h-9 w-9">
                <Smile className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>
            <Button 
              className="rounded-full h-11 w-11 p-0 flex items-center justify-center"
              onClick={handleSendMessage}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
