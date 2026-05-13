import { NextApiRequest, NextApiResponse } from "next";
import { Server as IOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { Socket as NetSocket } from "net";
import dbConnect from "../../lib/mongodb";
import { Message } from "../../models/Message";
import { Conversation } from "../../models/Conversation";
import { User } from "../../models/User";
import { adminMessaging } from "../../lib/firebase-admin";

interface SocketServer extends HTTPServer {
  io?: IOServer;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface ResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

export default async function handler(req: NextApiRequest, res: ResponseWithSocket) {
  await dbConnect();

  if (res.socket.server.io) {
    console.log("Socket is already running");
  } else {
    console.log("Socket is initializing");
    const io = new IOServer(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("New client connected", socket.id);

      socket.on("join-conversation", (conversationId) => {
        socket.join(conversationId);
        console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
      });

      socket.on("send-message", async (data) => {
        try {
          let conversationId = data.conversationId;
          
          // Agar conversationId "general" bo'lsa, maxsus guruhni qidiramiz yoki yaratamiz
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

          console.log("Message received via socket:", data.text);

          // Emit to room (including the sender, or sender updates locally)
          socket.to(data.conversationId).emit("new-message", {
            id: Math.random().toString(), // Or pass the real ID from POST if we sync them
            sender: data.sender || "Anonymous",
            text: data.text,
            isSelf: false,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            conversationId: data.conversationId
          });

          // --- PUSH NOTIFICATION LOGIC ---
          try {
            // Get all users with FCM tokens except the sender
            const users = await User.find({ 
              fcmTokens: { $exists: true, $not: { $size: 0 } },
              _id: { $ne: data.senderId } 
            });

            const tokens: string[] = [];
            users.forEach(u => {
              if (u.fcmTokens) {
                tokens.push(...u.fcmTokens);
              }
            });

            if (tokens.length > 0) {
              const payload = {
                notification: {
                  title: `Yangi xabar: ${data.sender}`,
                  body: data.text,
                },
                data: {
                  conversationId: data.conversationId,
                  click_action: "/chat",
                },
                tokens: tokens,
              };

              const response = await adminMessaging.sendEachForMulticast(payload);
              console.log("FCM Success count:", response.successCount);
            }
          } catch (fcmError) {
            console.error("Error sending FCM messages:", fcmError);
          }
          // ---------------------------------

        } catch (error) {
          console.error("Error handling send-message:", error);
        }
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected", socket.id);
      });
    });
  }
  res.end();
}
