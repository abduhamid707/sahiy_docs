/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { chatEntityId, chatTime } from "@/lib/chat";
import { Conversation } from "@/models/Conversation";
import { Message } from "@/models/Message";

const updateSchema = z.object({ text: z.string().trim().min(1).max(10000) });

function isAdmin(conversation: any, userId: string, role?: string) {
  return role === "SUPER_ADMIN" || chatEntityId(conversation.createdBy) === userId || conversation.admins?.some((id: any) => chatEntityId(id) === userId);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: "Xabar matni noto‘g‘ri" }, { status: 400 });
    await dbConnect();
    const { id } = await params;
    const message = await Message.findById(id);
    if (!message) return NextResponse.json({ success: false, error: "Xabar topilmadi" }, { status: 404 });
    if (chatEntityId(message.sender) !== session.user.id) return NextResponse.json({ success: false, error: "Faqat o‘z xabaringizni tahrirlashingiz mumkin" }, { status: 403 });
    message.text = parsed.data.text;
    message.editedAt = new Date();
    await message.save();
    return NextResponse.json({ success: true, data: { id: message._id.toString(), conversationId: message.conversationId.toString(), text: message.text, editedAt: message.editedAt, time: chatTime(message.createdAt) } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Xabar tahrirlanmadi" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    const message = await Message.findById(id);
    if (!message) return NextResponse.json({ success: false, error: "Xabar topilmadi" }, { status: 404 });
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) return NextResponse.json({ success: false, error: "Chat topilmadi" }, { status: 404 });
    const ownMessage = chatEntityId(message.sender) === session.user.id;
    if (!ownMessage && !isAdmin(conversation, session.user.id, (session.user as any).role)) return NextResponse.json({ success: false, error: "Bu xabarni o‘chirishga ruxsat yo‘q" }, { status: 403 });
    const conversationId = message.conversationId.toString();
    await Message.deleteOne({ _id: message._id });
    const latest = await Message.findOne({ conversationId }).sort({ createdAt: -1 }).select("_id createdAt").lean();
    await Conversation.updateOne({ _id: conversationId }, latest ? { $set: { lastMessage: latest._id, lastMessageAt: latest.createdAt } } : { $unset: { lastMessage: 1 }, $set: { lastMessageAt: conversation.createdAt } });
    return NextResponse.json({ success: true, data: { id, conversationId } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Xabar o‘chirilmadi" }, { status: 500 });
  }
}
