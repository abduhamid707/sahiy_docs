import mongoose, { Schema, model, models } from "mongoose";

const DocumentSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true }, // Markdown content
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    status: {
      type: String,
      enum: ["DRAFT", "REVIEWED", "OUTDATED"],
      default: "DRAFT",
    },
    owner: { type: Schema.Types.ObjectId, ref: "User" },
    allowedRoles: [{ type: String }],
    keywords: [{ type: String }],
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Document = models.Document || model("Document", DocumentSchema);
