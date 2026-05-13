import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Conversation } from "@/models/Conversation";
import { Message } from "@/models/Message";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Foydalanuvchi qatnashgan barcha chatlar va ochiq guruhlar
    let conversations = await Conversation.find({
      $or: [
        { type: "GROUP", name: "Sahiy Team" }, // Public group
        { participants: userId } // User participated
      ]
    }).populate("lastMessage").populate("participants", "name email image");

    // Agar conversations bo'sh bo'lsa, "Sahiy Team" ni yaratib qaytaramiz
    if (conversations.length === 0) {
      const conv = await Conversation.findOneAndUpdate(
        { name: "Sahiy Team", type: "GROUP" },
        { $setOnInsert: { participants: [] } },
        { upsert: true, new: true }
      );
      conversations = [conv];
    }

    const data = await Promise.all(conversations.map(async (conv) => {
      let name = conv.name;
      if (conv.type === "PRIVATE") {
        const otherParticipant = conv.participants.find((p: any) => p._id.toString() !== userId);
        name = otherParticipant ? otherParticipant.name : "Shaxsiy chat";
      }

      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        sender: { $ne: userId },
        seenBy: { $ne: userId }
      });

      const lastMsg = await Message.findOne({ conversationId: conv._id }).sort({ createdAt: -1 });

      return {
        id: conv._id,
        name: name || "Unknown",
        type: conv.type,
        lastMessage: lastMsg ? (lastMsg.file ? `📁 Fayl: ${lastMsg.file.name}` : lastMsg.text) : "Xabar yo'q",
        unreadCount: unreadCount
      };
    }));

    return NextResponse.json({
      success: true,
      data: data
    });
  } catch (error: any) {
    console.error("Error in GET /api/chat/conversations:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
    }

    // Mavjud shaxsiy chatni tekshiramiz
    let conversation = await Conversation.findOne({
      type: "PRIVATE",
      participants: { $all: [currentUserId, userId] }
    });

    // Agar yo'q bo'lsa, yangi yaratamiz
    if (!conversation) {
      conversation = await Conversation.create({
        type: "PRIVATE",
        participants: [currentUserId, userId]
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: conversation._id,
        type: conversation.type,
        name: "Shaxsiy chat", // UI da boshqa foydalanuvchi nomi ko'rsatiladi
        unreadCount: 0
      }
    });
  } catch (error: any) {
    console.error("Error in POST /api/chat/conversations:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
