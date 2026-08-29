import { Schema, model, models } from "mongoose";

const ConversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    type: { type: String, enum: ["PRIVATE", "GROUP"], default: "PRIVATE" },
    name: { type: String, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    avatar: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    admins: [{ type: Schema.Types.ObjectId, ref: "User" }],
    pinnedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isPublic: { type: Boolean, default: false, index: true },
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    lastMessageAt: { type: Date, index: true },
    docId: { type: Schema.Types.ObjectId, ref: "Document" }, // If bound to a specific document
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1, lastMessageAt: -1 });

export const Conversation = models.Conversation || model("Conversation", ConversationSchema);
