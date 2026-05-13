import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Hozirgi foydalanuvchidan tashqari barcha foydalanuvchilarni olamiz
    const users = await User.find({ _id: { $ne: userId } })
      .select("name email role image")
      .sort({ name: 1 });

    return NextResponse.json({
      success: true,
      data: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image
      }))
    });
  } catch (error: any) {
    console.error("Error in GET /api/chat/users:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
