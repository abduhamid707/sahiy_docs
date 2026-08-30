import mongoose, { Schema, model, models } from "mongoose";

const DocumentAttachmentSchema = new Schema(
  {
    fileId: { type: String, required: true },
    title: { type: String, required: true },
    fileName: { type: String, required: true },
    fileKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PassportFileSchema = new Schema(
  {
    fileId: { type: String, required: true },
    fileName: { type: String, required: true },
    fileKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AuditHistorySchema = new Schema(
  {
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
    performedByName: { type: String, default: "Tizim" },
    details: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const EmployeeSchema = new Schema(
  {
    // Auth reference (optional)
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false, index: true },

    // 1. Asosiy ma'lumotlar
    fullName: { type: String, required: true, trim: true, index: true },
    employeeId: { type: String, required: true, unique: true, trim: true, index: true }, // Tabel raqami, e.g. SH-001
    avatarUrl: { type: String, default: null },
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER"], default: null },
    birthDate: { type: Date, default: null },
    age: { type: Number, default: null },
    address: { type: String, default: null, trim: true },
    notes: { type: String, default: null, trim: true },

    // 2. Aloqa ma'lumotlari
    phone: { type: String, required: true, trim: true, index: true }, // Normalized +998...
    secondaryPhone: { type: String, default: null, trim: true },
    telegramUsername: { type: String, default: null, trim: true },
    telegramPhone: { type: String, default: null, trim: true },
    email: { type: String, default: null, trim: true, lowercase: true },
    emergencyContact: {
      name: { type: String, default: null, trim: true },
      relationship: { type: String, default: null, trim: true },
      phone: { type: String, default: null, trim: true },
    },

    // 3. Ish ma'lumotlari
    department: { type: String, required: true, trim: true, index: true },
    position: { type: String, required: true, trim: true, index: true },
    role: {
      type: String,
      enum: [
        "SUPER_ADMIN",
        "ADMIN",
        "RAHBAR",
        "HR",
        "PM",
        "FRONTEND",
        "BACKEND",
        "MOBILE",
        "DEVOPS",
        "QA",
        "DESIGNER",
        "SUPPORT",
        "VIEWER",
      ],
      default: "SUPPORT",
    },
    isLead: { type: Boolean, default: false },
    managerId: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    hiredAt: { type: Date, required: true, default: Date.now, index: true },
    employmentType: {
      type: String,
      enum: ["FULL_TIME", "PART_TIME", "PROBATION", "CONTRACT"],
      default: "FULL_TIME",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ON_LEAVE", "INACTIVE", "TERMINATED"],
      default: "ACTIVE",
      index: true,
    },
    workSchedule: { type: String, default: "09:00 - 18:00 (6/1)", trim: true },
    probationEndDate: { type: Date, default: null },
    termination: {
      terminatedAt: { type: Date, default: null },
      reason: { type: String, default: null, trim: true },
    },

    // 4. Maosh ma'lumotlari (Maxfiy)
    salary: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
      payDay: { type: Number, default: 5 }, // 1-31
      period: {
        type: String,
        enum: ["MONTHLY", "BIWEEKLY", "HOURLY"],
        default: "MONTHLY",
      },
      lastPaidAt: { type: Date, default: null },
      nextPayDate: { type: Date, default: null },
      notes: { type: String, default: null },
    },

    // 5. Pasport va hujjatlar (Maxfiy)
    passport: {
      seriesNumber: { type: String, default: null, trim: true }, // e.g. AA 1234567
      pinfl: { type: String, default: null, trim: true }, // 14 xonali JShShIR
      issuedBy: { type: String, default: null, trim: true },
      issuedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      frontFile: { type: PassportFileSchema, default: null },
      backFile: { type: PassportFileSchema, default: null },
    },
    documents: [DocumentAttachmentSchema],

    // 6. Kirish huquqi
    hasSystemAccess: { type: Boolean, default: false },
    forcePasswordChange: { type: Boolean, default: false },

    // 7. Audit tarixi
    history: [AuditHistorySchema],
  },
  { timestamps: true }
);

// Search text index
EmployeeSchema.index({
  fullName: "text",
  employeeId: "text",
  phone: "text",
  email: "text",
  department: "text",
  position: "text",
});

export const Employee = models.Employee || model("Employee", EmployeeSchema);
