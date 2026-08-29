/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminMessaging } from "@/lib/firebase-admin";
import { User } from "@/models/User";

export async function sendChatPush(input: { participantIds: string[]; isPublic?: boolean; senderId: string; senderName: string; conversationId: string; conversationName: string; text: string }) {
  if (!adminMessaging) return;
  const filter = input.isPublic
    ? { _id: { $ne: input.senderId }, fcmTokens: { $exists: true, $not: { $size: 0 } } }
    : { _id: { $in: input.participantIds.filter((id) => id !== input.senderId) }, fcmTokens: { $exists: true, $not: { $size: 0 } } };
  const users = await User.find(filter).select("fcmTokens").lean();
  const tokens = [...new Set(users.flatMap((user: any) => user.fcmTokens || []))] as string[];
  if (!tokens.length) return;
  const result = await adminMessaging.sendEachForMulticast({
    tokens,
    notification: { title: `${input.conversationName} · ${input.senderName}`, body: input.text.slice(0, 180) },
    data: { link: `/chat?conversation=${input.conversationId}`, conversationId: input.conversationId, kind: "CHAT_MESSAGE" },
    webpush: { fcmOptions: { link: `/chat?conversation=${input.conversationId}` } },
  });
  const invalid = result.responses.flatMap((response, index) => {
    const code = response.error?.code || "";
    return !response.success && (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) ? [tokens[index]] : [];
  });
  if (invalid.length) await User.updateMany({ fcmTokens: { $in: invalid } }, { $pull: { fcmTokens: { $in: invalid } } });
}
