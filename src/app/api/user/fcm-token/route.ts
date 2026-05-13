import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ success: false, error: "Token is required" }, { status: 400 });
    }

    // Add token to user's fcmTokens array if it doesn't exist
    await User.findByIdAndUpdate(session.user.id, {
      $addToSet: { fcmTokens: token }
    });

    return NextResponse.json({ success: true, message: "Token saved successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
