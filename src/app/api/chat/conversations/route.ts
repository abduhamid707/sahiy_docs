/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { ensureGeneralConversation } from "@/lib/chat";
import { Conversation } from "@/models/Conversation";
import { Message } from "@/models/Message";
import { User } from "@/models/User";

const createSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PRIVATE"), userId: z.string().min(1) }),
  z.object({ type: z.literal("GROUP"), name: z.string().trim().min(2).max(120), description: z.string().trim().max(500).optional(), participantIds: z.array(z.string().min(1)).min(1).max(200) }),
]);

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    await dbConnect();
    await ensureGeneralConversation(userId);
    const conversations = await Conversation.find({ $or: [{ participants: userId }, { isPublic: true }] })
      .populate("participants", "name email image role")
      .populate({ path: "lastMessage", populate: { path: "sender", select: "name" } })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    const data = await Promise.all(conversations.map(async (conversation: any) => {
      const other = conversation.type === "PRIVATE" ? conversation.participants.find((participant: any) => participant._id.toString() !== userId) : null;
      const last = conversation.lastMessage || await Message.findOne({ conversationId: conversation._id }).populate("sender", "name").sort({ createdAt: -1 }).lean();
      const unreadCount = await Message.countDocuments({ conversationId: conversation._id, sender: { $ne: userId }, seenBy: { $ne: userId } });
      const fileName = last?.file?.url ? last.file.name : null;
      const isAdmin = conversation.admins?.some((id: any) => id.toString() === userId) || conversation.createdBy?.toString() === userId || (session.user as any).role === "SUPER_ADMIN";
      return {
        id: conversation._id.toString(), name: conversation.type === "PRIVATE" ? other?.name || "Shaxsiy chat" : conversation.name || "Guruh", type: conversation.type,
        avatar: conversation.type === "PRIVATE" ? other?.image : conversation.avatar, description: conversation.description || "",
        membersCount: conversation.isPublic ? await User.countDocuments({}) : conversation.participants.length,
        participantIds: conversation.participants.map((participant: any) => participant._id.toString()),
        lastMessage: last ? (fileName ? `📎 ${fileName}` : last.text) : "Hali xabar yo‘q", lastSender: last?.sender?.name || "",
        lastMessageAt: last?.createdAt || conversation.lastMessageAt || conversation.createdAt, unreadCount, isPublic: !!conversation.isPublic,
        pinned: conversation.pinnedBy?.some((id: any) => id.toString() === userId) || false,
        canManage: conversation.type === "GROUP" && isAdmin,
      };
    }));
    data.sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET chat conversations:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const currentUserId = (session.user as any).id;
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Ma’lumot noto‘g‘ri" }, { status: 400 });
    await dbConnect();

    if (parsed.data.type === "PRIVATE") {
      const target = await User.findById(parsed.data.userId).select("name image").lean();
      if (!target) return NextResponse.json({ success: false, error: "Foydalanuvchi topilmadi" }, { status: 404 });
      let conversation = await Conversation.findOne({ type: "PRIVATE", participants: { $all: [currentUserId, parsed.data.userId] }, $expr: { $eq: [{ $size: "$participants" }, 2] } });
      if (!conversation) conversation = await Conversation.create({ type: "PRIVATE", participants: [currentUserId, parsed.data.userId], createdBy: currentUserId, lastMessageAt: new Date() });
      return NextResponse.json({ success: true, data: { id: conversation._id.toString(), type: "PRIVATE", name: (target as any).name, avatar: (target as any).image, unreadCount: 0 } });
    }

    const participantIds = [...new Set([currentUserId, ...parsed.data.participantIds])];
    const validUsers = await User.find({ _id: { $in: participantIds } }).select("_id").lean();
    if (validUsers.length !== participantIds.length) return NextResponse.json({ success: false, error: "A’zolardan biri topilmadi" }, { status: 400 });
    const conversation = await Conversation.create({ type: "GROUP", name: parsed.data.name, description: parsed.data.description, participants: participantIds, createdBy: currentUserId, admins: [currentUserId], isPublic: false, lastMessageAt: new Date() });
    return NextResponse.json({ success: true, data: { id: conversation._id.toString(), type: "GROUP", name: conversation.name, description: conversation.description || "", membersCount: participantIds.length, participantIds, unreadCount: 0, lastMessage: "Guruh yaratildi", lastMessageAt: conversation.createdAt } }, { status: 201 });
  } catch (error: any) {
    console.error("POST chat conversations:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
