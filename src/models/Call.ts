import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    providerCallId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
      index: true,
    },
    operator: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      default: 0,
    },
    totalDuration: {
      type: Number,
      default: 0,
    },
    audioUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["answered", "missed", "handled"],
      default: "missed",
    },
    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      default: "inbound",
    }
  },
  { timestamps: true }
);

export default mongoose.models.Call || mongoose.model("Call", callSchema);
