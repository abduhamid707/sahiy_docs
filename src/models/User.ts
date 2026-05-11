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
        "FRONTEND",
        "BACKEND",
        "DEVOPS",
        "QA",
        "PM",
        "HR",
        "VIEWER",
        "MOBILE",
      ],
      default: "VIEWER",
    },
    image: { type: String },
  },
  { timestamps: true }
);

export const User = models.User || model("User", UserSchema);
