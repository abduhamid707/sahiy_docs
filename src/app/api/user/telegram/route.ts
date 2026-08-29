import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { auth } from "@/auth";

export async function DELETE() {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!session || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    await User.findByIdAndUpdate(user.id, {
      "telegram.chatId": null,
      "telegram.linkCode": null,
      "telegram.linkCodeExpiresAt": null,
    });

    return NextResponse.json({ message: "Telegram uzildi" });
  } catch (error: any) {
    console.error("Telegram unlink error:", error);
    return NextResponse.json({ error: "Uzishda xatolik yuz berdi" }, { status: 500 });
  }
}
