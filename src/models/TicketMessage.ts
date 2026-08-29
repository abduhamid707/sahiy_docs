import { Schema, model, models } from "mongoose";

const TicketMessageSchema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true, index: true },
    mockBatch: { type: String, index: true },
    type: { type: String, enum: ["CUSTOMER_MESSAGE", "OPERATOR_RESPONSE", "INTERNAL_NOTE", "SYSTEM_EVENT"], required: true, index: true },
    body: { type: String, required: true, trim: true },
    author: { type: Schema.Types.ObjectId, ref: "User" },
    authorName: String,
    channel: { type: String, enum: ["MANUAL", "PHONE", "TELEGRAM", "INSTAGRAM", "SAHIY_APP", "OTHER"], default: "MANUAL" },
    attachments: [{ url: { type: String, required: true }, name: { type: String, required: true }, mimeType: String, size: Number }],
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

TicketMessageSchema.index({ ticketId: 1, createdAt: 1 });
export const TicketMessage = models.TicketMessage || model("TicketMessage", TicketMessageSchema);
