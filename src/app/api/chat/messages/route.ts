/* eslint-disable @typescript-eslint/no-explicit-any */
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { canAccessConversation, chatTime, ensureGeneralConversation } from "@/lib/chat";
import { sendChatPush } from "@/lib/chatNotifications";
import { Conversation } from "@/models/Conversation";
import { Message } from "@/models/Message";

const messageSchema = z.object({
  conversationId: z.string().min(1),
  text: z.string().trim().min(1).max(10000),
  repliesTo: z.string().optional(),
  file: z.object({ url: z.string().min(1), fileType: z.enum(["IMAGE", "DOCUMENT"]), name: z.string().min(1) }).optional(),
});

function serializeMessage(message: any, userId: string) {
  const sender = message.sender;
  return {
    id: message._id.toString(), sender: sender?.name || "Foydalanuvchi", senderId: (sender?._id || sender).toString(), senderImage: sender?.image,
    text: message.text, file: message.file?.url ? message.file : undefined, repliesTo: message.repliesTo,
    createdAt: message.createdAt, time: chatTime(message.createdAt), isSelf: (sender?._id || sender).toString() === userId,
    seenCount: message.seenBy?.length || 0, editedAt: message.editedAt,
  };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    await dbConnect();
    const requested = new URL(request.url).searchParams.get("conversationId") || "general";
    const conversation = requested === "general" ? await ensureGeneralConversation(userId) : await Conversation.findById(requested);
    if (!conversation) return NextResponse.json({ success: false, error: "Chat topilmadi" }, { status: 404 });
    if (!canAccessConversation(conversation, userId)) return NextResponse.json({ success: false, error: "Bu chatga ruxsat yo‘q" }, { status: 403 });
    if (conversation.isPublic && !conversation.participants.some((id: any) => id.toString() === userId)) await Conversation.updateOne({ _id: conversation._id }, { $addToSet: { participants: userId } });
    await Message.updateMany({ conversationId: conversation._id, sender: { $ne: userId }, seenBy: { $ne: userId } }, { $addToSet: { seenBy: userId } });
    const latest = await Message.find({ conversationId: conversation._id }).populate("sender", "name image").sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json({ success: true, conversationId: conversation._id.toString(), data: latest.reverse().map((message) => serializeMessage(message, userId)) });
  } catch (error: any) {
    console.error("GET chat messages:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const parsed = messageSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Xabar noto‘g‘ri" }, { status: 400 });
    await dbConnect();
    const conversation = parsed.data.conversationId === "general" ? await ensureGeneralConversation(userId) : await Conversation.findById(parsed.data.conversationId);
    if (!conversation) return NextResponse.json({ success: false, error: "Chat topilmadi" }, { status: 404 });
    if (!canAccessConversation(conversation, userId)) return NextResponse.json({ success: false, error: "Bu chatga ruxsat yo‘q" }, { status: 403 });
    const message = await Message.create({ conversationId: conversation._id, sender: userId, text: parsed.data.text, seenBy: [userId], file: parsed.data.file, repliesTo: parsed.data.repliesTo });
    await Conversation.updateOne({ _id: conversation._id }, { $set: { lastMessage: message._id, lastMessageAt: message.createdAt }, $addToSet: { participants: userId } });
    const populated = await Message.findById(message._id).populate("sender", "name image").lean();
    const serialized = serializeMessage(populated, userId);
    const participantIds = conversation.participants.map((id: any) => id.toString());
    after(() => sendChatPush({ participantIds, isPublic: conversation.isPublic, senderId: userId, senderName: session.user?.name || "Sahiy", conversationId: conversation._id.toString(), conversationName: conversation.type === "GROUP" ? conversation.name || "Sahiy Team" : session.user?.name || "Yangi xabar", text: parsed.data.file ? `📎 ${parsed.data.file.name}` : parsed.data.text }).catch((error) => console.error("Chat push error:", error)));
    return NextResponse.json({ success: true, data: serialized }, { status: 201 });
  } catch (error: any) {
    console.error("POST chat messages:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
