import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Log } from "@/models/Log";
import "@/models/User"; // Ensure User model is registered for populate

export async function GET(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only Super Admins can access logs" }, { status: 403 });
    }

    await dbConnect();

    const logs = await Log.find({})
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .limit(100); // Limit to recent 100 logs

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
