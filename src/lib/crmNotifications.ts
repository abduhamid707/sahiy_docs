/* eslint-disable @typescript-eslint/no-explicit-any */
import { CrmNotification } from "@/models/CrmNotification";
import { User } from "@/models/User";
import { adminMessaging } from "@/lib/firebase-admin";

type NotificationKind = "TICKET_ASSIGNED" | "TASK_ASSIGNED" | "TASK_APPROVAL_REQUESTED" | "TASK_APPROVED" | "TASK_REJECTED" | "ONE_HOUR_LEFT" | "FIFTEEN_MINUTES_LEFT" | "OVERDUE" | "CRITICAL" | "EXECUTIVE_REPORT" | "TICKET_APPROVAL_REQUESTED" | "TICKET_APPROVED" | "TICKET_RETURNED";

export async function createCrmNotification(input: {
  userId: string;
  ticketId?: string;
  taskId?: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
  replaceExisting?: boolean;
}) {
  let notification;
  try {
    const { replaceExisting, ...notificationInput } = input;
    if (replaceExisting && input.taskId) {
      await CrmNotification.deleteMany({
        taskId: input.taskId,
        kind: input.kind,
        userId: input.userId,
      });
    }
    notification = await CrmNotification.create({ ...notificationInput, link: input.link || "/crm" });
  } catch (error: any) {
    if (error?.code === 11000) return null;
    throw error;
  }

  try {
    const user = await User.findById(input.userId).select("fcmTokens").lean();
    const tokens = [...new Set((user as any)?.fcmTokens || [])] as string[];
    if (tokens.length && adminMessaging) {
      const result = await adminMessaging.sendEachForMulticast({
        tokens,
        notification: { title: input.title, body: input.body },
        data: { link: input.link || "/crm", kind: input.kind, taskId: input.taskId || "", ticketId: input.ticketId || "" },
        webpush: { fcmOptions: { link: input.link || "/crm" } },
      });
      if (result.successCount > 0) {
        notification.pushSentAt = new Date();
        await notification.save();
      }
      const invalidTokens = result.responses.flatMap((response, index) => {
        const code = response.error?.code || "";
        return !response.success && (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) ? [tokens[index]] : [];
      });
      if (invalidTokens.length) await User.updateOne({ _id: input.userId }, { $pull: { fcmTokens: { $in: invalidTokens } } });
    }
  } catch (error) {
    console.error("CRM FCM push yuborilmadi:", error);
  }

  return notification;
}
