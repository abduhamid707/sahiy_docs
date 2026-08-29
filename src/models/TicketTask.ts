import { Schema, model, models } from "mongoose";

const TicketTaskSchema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    description: { type: String, trim: true, maxlength: 3000 },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deadlineAt: { type: Date, required: true, index: true },
    priority: { type: String, enum: ["LOW", "NORMAL", "HIGH", "CRITICAL"], default: "NORMAL", index: true },
    status: { type: String, enum: ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"], default: "TODO", index: true },
    reminderMinutes: { type: [Number], default: [60, 15] },
    sentEvents: { type: [String], default: [] },
    completedAt: Date,
  },
  { timestamps: true },
);

TicketTaskSchema.index({ assignedTo: 1, status: 1, deadlineAt: 1 });
TicketTaskSchema.index({ ticketId: 1, deadlineAt: 1 });

export const TicketTask = models.TicketTask || model("TicketTask", TicketTaskSchema);
