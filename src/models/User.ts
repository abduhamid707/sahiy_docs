import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed
    role: {
      type: String,
      enum: [
        "SUPER_ADMIN",
        "ADMIN",
        "RAHBAR",
        "FRONTEND",
        "BACKEND",
        "DEVOPS",
        "QA",
        "PM",
        "HR",
        "VIEWER",
        "MOBILE",
        "DESIGNER",
        "SUPPORT",
      ],
      default: "VIEWER",
    },
    isLead: { type: Boolean, default: false },
    phone: { type: String },
    telegramUsername: { type: String },
    fcmTokens: [String],
    image: { type: String },
    lastActiveAt: { type: Date },
    telegram: {
      chatId: { type: String },
      linkCode: { type: String },
      linkCodeExpiresAt: { type: Date },
    },
  },
  { timestamps: true }
);

export const User = models.User || model("User", UserSchema);
