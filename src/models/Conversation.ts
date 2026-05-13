import mongoose, { Schema, model, models } from "mongoose";

const ConversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    type: { type: String, enum: ["PRIVATE", "GROUP"], default: "PRIVATE" },
    name: { type: String }, // For group chats
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    docId: { type: Schema.Types.ObjectId, ref: "Document" }, // If bound to a specific document
  },
  { timestamps: true }
);

export const Conversation = models.Conversation || model("Conversation", ConversationSchema);
