import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB is not ready");
    }

    return NextResponse.json({
      status: "ok",
      service: "sahiy-crm",
      database: "connected",
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "error", service: "sahiy-crm", database: "disconnected" },
      { status: 503 },
    );
  }
}
