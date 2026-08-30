import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { signMobileToken } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email va parol kiritilishi shart" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return NextResponse.json({ error: "Email yoki parol noto'g'ri" }, { status: 401 });
    }

    let isMatch = false;
    if (user.password && user.password.startsWith("$2")) {
      try {
        isMatch = await bcrypt.compare(password, user.password);
      } catch (e) {
        isMatch = false;
      }
    }
    if (!isMatch && user.password === password) {
      isMatch = true;
    }

    if (!isMatch) {
      return NextResponse.json({ error: "Email yoki parol noto'g'ri" }, { status: 401 });
    }

    // Faqat rahbarlik huquqi bor foydalanuvchilar kira oladi
    if (user.role !== "RAHBAR") {
      return NextResponse.json(
        { error: "Kechirasiz, ushbu ilova faqat rahbar uchun mo‘ljallangan." },
        { status: 403 }
      );
    }

    const token = signMobileToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isLead: Boolean(user.isLead),
      name: user.name,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isLead: Boolean(user.isLead),
        image: user.image || null,
      },
    });
  } catch (error: any) {
    console.error("Mobile login error:", error);
    return NextResponse.json({ error: "Serverda kutilmagan xatolik yuz berdi" }, { status: 500 });
  }
}
