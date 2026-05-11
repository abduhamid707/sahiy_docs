import mongoose, { Schema, model, models } from "mongoose";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    allowedRoles: [{ type: String }],
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Category = models.Category || model("Category", CategorySchema);
