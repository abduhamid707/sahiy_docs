import { NextApiRequest, NextApiResponse } from "next";
import { Server as IOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { Socket as NetSocket } from "net";

interface SocketServer extends HTTPServer { io?: IOServer }
interface SocketWithIO extends NetSocket { server: SocketServer }
interface ResponseWithSocket extends NextApiResponse { socket: SocketWithIO }

export default function handler(_: NextApiRequest, res: ResponseWithSocket) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server, { pingTimeout: 20_000, pingInterval: 25_000 });
    res.socket.server.io = io;
    io.on("connection", (socket) => {
      socket.on("join-user", ({ userId }: { userId: string }) => {
        if (userId) socket.join(`user:${userId}`);
      });
      socket.on("join-conversation", ({ conversationId }: { conversationId: string }) => {
        if (conversationId) socket.join(conversationId);
      });
      socket.on("join-conversations", ({ conversationIds }: { conversationIds: string[] }) => {
        if (Array.isArray(conversationIds)) conversationIds.filter(Boolean).slice(0, 250).forEach((conversationId) => socket.join(conversationId));
      });
      socket.on("leave-conversations", ({ conversationIds }: { conversationIds: string[] }) => {
        if (Array.isArray(conversationIds)) conversationIds.filter(Boolean).slice(0, 250).forEach((conversationId) => socket.leave(conversationId));
      });
      socket.on("message-created", ({ conversationId, message }: { conversationId: string; message: unknown }) => {
        if (conversationId) socket.to(conversationId).emit("new-message", { conversationId, message });
      });
      socket.on("message-updated", ({ conversationId, message }: { conversationId: string; message: unknown }) => {
        if (conversationId) socket.to(conversationId).emit("message-updated", { conversationId, message });
      });
      socket.on("message-deleted", ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
        if (conversationId) socket.to(conversationId).emit("message-deleted", { conversationId, messageId });
      });
      socket.on("conversation-created", ({ participantIds, conversationId }: { participantIds: string[]; conversationId: string }) => {
        if (Array.isArray(participantIds)) participantIds.forEach((userId) => socket.to(`user:${userId}`).emit("conversation-created", { conversationId }));
      });
      socket.on("conversation-updated", ({ conversationId, conversation, participantIds }: { conversationId: string; conversation: unknown; participantIds?: string[] }) => {
        if (conversationId) socket.to(conversationId).emit("conversation-updated", { conversationId, conversation });
        if (Array.isArray(participantIds)) participantIds.forEach((userId) => socket.to(`user:${userId}`).emit("conversation-created", { conversationId }));
      });
      socket.on("conversation-deleted", ({ conversationId }: { conversationId: string }) => {
        if (conversationId) socket.to(conversationId).emit("conversation-deleted", { conversationId });
      });
      socket.on("typing", ({ conversationId, userId, name, typing }: { conversationId: string; userId: string; name: string; typing: boolean }) => {
        if (conversationId) socket.to(conversationId).emit("typing", { conversationId, userId, name, typing });
      });
      socket.on("messages-seen", ({ conversationId, userId }: { conversationId: string; userId: string }) => {
        if (conversationId) socket.to(conversationId).emit("messages-seen", { conversationId, userId });
      });
    });
  }
  res.end();
}
