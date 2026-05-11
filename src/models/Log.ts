import mongoose, { Schema, model, models } from "mongoose";

const LogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true }, // CREATE, UPDATE, DELETE, IMPORT, EXPORT
    entityType: { type: String, required: true }, // DOCUMENT, PROJECT, CATEGORY
    entityId: { type: Schema.Types.ObjectId },
    details: { type: Schema.Types.Mixed }, // Any additional data (e.g., title, description)
  },
  { timestamps: true }
);

export const Log = models.Log || model("Log", LogSchema);
