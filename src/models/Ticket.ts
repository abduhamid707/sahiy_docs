import { Schema, model, models } from "mongoose";

const AttachmentSchema = new Schema({ url: { type: String, required: true }, name: { type: String, required: true }, mimeType: String, size: Number }, { _id: false });

const TicketSchema = new Schema(
  {
    ticketNumber: { type: String, index: true, unique: true, sparse: true },
    mockBatch: { type: String, index: true },
    callerId: { type: String, trim: true, index: true },
    callerName: { type: String, trim: true },
    callerPhone: { type: String, trim: true, index: true },
    orderId: { type: String, trim: true, index: true },
    problem: { type: String, required: true, trim: true },
    notes: String,
    category: { type: String, enum: ["DELIVERY", "DELIVERY_DELAY", "TRACKING", "NOT_RECEIVED", "WRONG_OR_MISSING", "REFUND_PAYMENT", "CARGO_PAYMENT", "CHINA_WAREHOUSE", "OTHER"], default: "OTHER", index: true },
    priority: { type: String, enum: ["LOW", "NORMAL", "HIGH", "CRITICAL"], default: "NORMAL", index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
    collaborators: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    // OPEN eski call-center ticketlari uchun legacy qiymat.
    status: { type: String, enum: ["OPEN", "NEW", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"], default: "NEW", index: true },
    channel: { type: String, enum: ["MANUAL", "PHONE", "TELEGRAM", "INSTAGRAM", "SAHIY_APP", "OTHER"], default: "MANUAL" },
    deadlineAt: { type: Date, index: true },
    firstResponseAt: Date,
    lastInteractionAt: { type: Date, default: Date.now, index: true },
    resolvedAt: Date,
    closedAt: Date,
    resolutionNote: String,
    resolutionApprovalStatus: {
      type: String,
      enum: ["NONE", "PENDING", "RETURNED", "APPROVED"],
      default: "NONE",
      index: true,
    },
    resolutionSmsText: { type: String, trim: true },
    resolutionReviewComment: { type: String, trim: true },
    resolutionSubmittedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolutionSubmittedAt: Date,
    resolutionReviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolutionReviewedAt: Date,
    attachments: [AttachmentSchema],
    lastReminderLevel: { type: String, enum: ["NONE", "WARNING", "OVERDUE"], default: "NONE" },
    lastReminderAt: Date,
    externalCallId: { type: String, index: true },
    recording: { url: String, source: { type: String, enum: ["WEBHOOK", "MANUAL"] }, addedAt: Date },
    callStartedAt: Date,
    callEndedAt: Date,
    origin: { type: String, enum: ["MANUAL", "PBX_WEBHOOK"], default: "MANUAL" },
  },
  { timestamps: true }
);

TicketSchema.index({ assignedTo: 1, status: 1 });
TicketSchema.index({ collaborators: 1, status: 1 });
TicketSchema.index({ priority: 1, deadlineAt: 1 });
TicketSchema.index({ callerId: "text", callerName: "text", callerPhone: "text", orderId: "text", ticketNumber: "text", problem: "text" });

export const Ticket = models.Ticket || model("Ticket", TicketSchema);
