import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Message } from "@/models/Message";
import { Conversation } from "@/models/Conversation";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    let conversationId = searchParams.get("conversationId") || "general";

    // Agar conversationId "general" bo'lsa, maxsus guruhni qidiramiz yoki yaratamiz
    if (conversationId === "general") {
      let conv = await Conversation.findOne({ name: "Sahiy Team", type: "GROUP" });
      if (!conv) {
        conv = await Conversation.create({
          name: "Sahiy Team",
          type: "GROUP",
          participants: [] // Hamma foydalanishi mumkin
        });
      }
      conversationId = conv._id.toString();
    }

    const session = await auth();
    let userId = null;
    if (session && session.user) {
      userId = (session.user as any).id;
      // Mark messages as read
      await Message.updateMany(
        { conversationId, sender: { $ne: userId }, seenBy: { $ne: userId } },
        { $addToSet: { seenBy: userId } }
      );
    }

    const messages = await Message.find({ conversationId })
      .populate("sender", "name") // Jo'natuvchi ismini olish
      .sort({ createdAt: 1 })
      .limit(50);

    return NextResponse.json({
      success: true,
      data: messages.map(msg => ({
        id: msg._id,
        sender: (msg.sender as any)?.name || "Anonymous",
        text: msg.text,
        isSelf: userId ? (msg.sender as any)?._id.toString() === userId : false,
        time: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
        senderId: (msg.sender as any)?._id
      }))
    });
  } catch (error: any) {
    console.error("Error in GET /api/chat/messages:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const data = await request.json();
    
    let conversationId = data.conversationId || "general";
    
    if (conversationId === "general") {
      let conv = await Conversation.findOne({ name: "Sahiy Team", type: "GROUP" });
      if (!conv) {
        conv = await Conversation.create({
          name: "Sahiy Team",
          type: "GROUP",
          participants: []
        });
      }
      conversationId = conv._id;
    }

    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const currentUserId = (session.user as any).id;

    const newMessage = await Message.create({
      conversationId: conversationId,
      sender: currentUserId,
      text: data.text,
      seenBy: [currentUserId], // Sender has seen it
      file: data.file
    });

    return NextResponse.json({ success: true, data: newMessage });
  } catch (error: any) {
    console.error("Error in POST /api/chat/messages:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
