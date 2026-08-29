/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { canAccessConversation } from "@/lib/chat";
import { Conversation } from "@/models/Conversation";
import { Message } from "@/models/Message";
import { User } from "@/models/User";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("PIN"), pinned: z.boolean() }),
  z.object({ action: z.literal("UPDATE"), name: z.string().trim().min(2).max(120), description: z.string().trim().max(500).optional(), participantIds: z.array(z.string().min(1)).min(1).max(200) }),
]);

function canManage(conversation: any, userId: string, role?: string) {
  return role === "SUPER_ADMIN" || conversation.createdBy?.toString() === userId || conversation.admins?.some((id: any) => id.toString() === userId);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Ma’lumot noto‘g‘ri" }, { status: 400 });
    await dbConnect();
    const { id } = await params;
    const conversation = await Conversation.findById(id);
    if (!conversation) return NextResponse.json({ success: false, error: "Chat topilmadi" }, { status: 404 });
    if (!canAccessConversation(conversation, session.user.id)) return NextResponse.json({ success: false, error: "Bu chatga ruxsat yo‘q" }, { status: 403 });

    if (parsed.data.action === "PIN") {
      const userObjectId = new Types.ObjectId(session.user.id);
      const pinUpdate: any = parsed.data.pinned ? { $addToSet: { pinnedBy: userObjectId } } : { $pull: { pinnedBy: userObjectId } };
      await Conversation.collection.updateOne({ _id: conversation._id }, pinUpdate);
      return NextResponse.json({ success: true, data: { id, pinned: parsed.data.pinned } });
    }

    if (conversation.type !== "GROUP" || !canManage(conversation, session.user.id, (session.user as any).role)) return NextResponse.json({ success: false, error: "Guruhni boshqarishga ruxsat yo‘q" }, { status: 403 });
    const participantIds = [...new Set([session.user.id, ...parsed.data.participantIds])];
    const validUsers = await User.countDocuments({ _id: { $in: participantIds } });
    if (validUsers !== participantIds.length) return NextResponse.json({ success: false, error: "A’zolardan biri topilmadi" }, { status: 400 });
    conversation.name = parsed.data.name;
    conversation.description = parsed.data.description || "";
    conversation.participants = participantIds;
    await conversation.save();
    return NextResponse.json({ success: true, data: { id, name: conversation.name, description: conversation.description, participantIds, membersCount: participantIds.length } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Chat yangilanmadi" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    await dbConnect();
    const { id } = await params;
    const conversation = await Conversation.findById(id);
    if (!conversation) return NextResponse.json({ success: false, error: "Chat topilmadi" }, { status: 404 });
    if (conversation.isPublic) return NextResponse.json({ success: false, error: "Umumiy Sahiy Team guruhini o‘chirib bo‘lmaydi" }, { status: 400 });
    if (conversation.type !== "GROUP" || !canManage(conversation, session.user.id, (session.user as any).role)) return NextResponse.json({ success: false, error: "Guruhni o‘chirishga ruxsat yo‘q" }, { status: 403 });
    await Promise.all([Message.deleteMany({ conversationId: id }), Conversation.deleteOne({ _id: id })]);
    return NextResponse.json({ success: true, data: { id } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Chat o‘chirilmadi" }, { status: 500 });
  }
}
