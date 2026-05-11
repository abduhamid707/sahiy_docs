import mongoose, { Schema, model, models } from "mongoose";

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    techStack: [{ type: String }],
    repoLinks: [{ platform: String, url: String }],
    owner: { type: Schema.Types.ObjectId, ref: "User" },
    allowedRoles: [{ type: String }], // Array of roles that can see this project
  },
  { timestamps: true }
);

export const Project = models.Project || model("Project", ProjectSchema);
