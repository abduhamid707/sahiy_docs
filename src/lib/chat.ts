/* eslint-disable @typescript-eslint/no-explicit-any */
import { Conversation } from "@/models/Conversation";

export async function ensureGeneralConversation(userId?: string) {
  let conversation = await Conversation.findOne({ type: "GROUP", name: { $in: ["Sahiy Team", "Sahiy Chat"] } }).sort({ createdAt: 1 });
  if (!conversation) {
    conversation = await Conversation.create({ type: "GROUP", name: "Sahiy Team", description: "Sahiy jamoasining umumiy guruhi", participants: userId ? [userId] : [], isPublic: true, createdBy: userId, admins: userId ? [userId] : [] });
  } else {
    await Conversation.collection.updateOne(
      { _id: conversation._id },
      { $set: { name: "Sahiy Team", description: "Sahiy jamoasining umumiy guruhi", isPublic: true }, ...(userId ? { $addToSet: { participants: userId as any } } : {}) },
    );
    conversation = await Conversation.findById(conversation._id);
  }
  return conversation;
}

export function chatEntityId(value: any): string {
  const id = value?._id ?? value;
  return id?.toString?.() || "";
}

export function canAccessConversation(conversation: any, userId: string) {
  return conversation?.isPublic || conversation?.participants?.some((participant: any) => chatEntityId(participant) === userId);
}

export function chatTime(value?: string | Date) {
  if (!value) return "";
  return new Intl.DateTimeFormat("uz-UZ", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent" }).format(new Date(value));
}
