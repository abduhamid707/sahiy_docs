import { Schema, model, models } from "mongoose";

const MessageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    mentions: {
      users: [{ type: Schema.Types.ObjectId, ref: "User" }],
      docs: [{ type: Schema.Types.ObjectId, ref: "Document" }],
    },
    repliesTo: { type: Schema.Types.ObjectId, ref: "Message" },
    seenBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    editedAt: { type: Date },
    file: {
      url: { type: String },
      fileType: { type: String }, // "IMAGE", "DOCUMENT"
      name: { type: String }
    },
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = models.Message || model("Message", MessageSchema);
