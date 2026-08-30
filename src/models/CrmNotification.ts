import { Schema, model, models } from "mongoose";

const CrmNotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", index: true },
    taskId: { type: Schema.Types.ObjectId, ref: "TicketTask", index: true },
    kind: {
      type: String,
      enum: [
        "TICKET_ASSIGNED",
        "TASK_ASSIGNED",
        "TASK_APPROVAL_REQUESTED",
        "TASK_APPROVED",
        "TASK_REJECTED",
        "ONE_HOUR_LEFT",
        "FIFTEEN_MINUTES_LEFT",
        "OVERDUE",
        "CRITICAL",
        "CRITICAL_TICKET",
        "EXECUTIVE_REPORT",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    link: { type: String, default: "/crm" },
    metadata: { type: Schema.Types.Mixed },
    readAt: Date,
    pushSentAt: Date,
  },
  { timestamps: true },
);

CrmNotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
CrmNotificationSchema.index(
  { taskId: 1, kind: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { taskId: { $exists: true, $type: "objectId" } },
  }
);

export const CrmNotification = models.CrmNotification || model("CrmNotification", CrmNotificationSchema);
