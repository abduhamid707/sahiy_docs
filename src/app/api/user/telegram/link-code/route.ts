import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { auth } from "@/auth";
import { getTelegramDeepLink } from "@/lib/telegram";
import crypto from "crypto";

export async function POST() {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!session || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const code = crypto.randomBytes(4).toString("hex"); // 8 belgili kod
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 daqiqa

    await User.findByIdAndUpdate(user.id, {
      "telegram.linkCode": code,
      "telegram.linkCodeExpiresAt": expiresAt,
    });

    const deepLink = getTelegramDeepLink(code);

    return NextResponse.json({ code, deepLink, expiresAt });
  } catch (error: any) {
    console.error("Telegram link-code error:", error);
    return NextResponse.json({ error: "Kod yaratishda xatolik yuz berdi" }, { status: 500 });
  }
}
