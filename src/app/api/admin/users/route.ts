import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || (session?.user as any)?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 401 });
    }

    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Barcha maydonlarni to'ldiring" }, { status: 400 });
    }

    await dbConnect();

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "Ushbu email manzili allaqachon ro'yxatdan o'tgan" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "VIEWER",
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error("User creation error:", error);
    return NextResponse.json({ error: "Foydalanuvchi yaratishda xatolik yuz berdi" }, { status: 500 });
  }
}
