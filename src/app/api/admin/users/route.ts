import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAuthUser } from "@/lib/auth-helper";
import { isExecutive, canManageUsers } from "@/lib/support/permissions";
import { normalizeUzPhone } from "@/lib/crm";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    const filter: any = {};
    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select("_id name email role isLead image phone telegramUsername lastActiveAt createdAt")
      .sort({ name: 1 })
      .lean();

    const formatted = users.map((u: any) => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      isLead: Boolean(u.isLead),
      image: u.image || null,
      phone: u.phone || null,
      telegramUsername: u.telegramUsername || null,
      lastActiveAt: u.lastActiveAt || u.updatedAt || null,
      createdAt: u.createdAt,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Users list error:", error);
    return NextResponse.json(
      { error: "Foydalanuvchilarni yuklashda xatolik" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getAuthUser(req);
    
    if (!sessionUser || isExecutive(sessionUser) || !canManageUsers(sessionUser)) {
      return NextResponse.json({ error: "Xodim qo'shishga ruxsat yo'q" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, isLead, phone, telegramUsername } = body;
    const isSuperAdmin = sessionUser.role === "SUPER_ADMIN";

    if (!isSuperAdmin) {
      if (!sessionUser.isLead) {
        return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
      }
      if (role !== sessionUser.role) {
        return NextResponse.json({ error: "Siz faqat o'z bo'limingiz xodimlarini qo'sha olasiz" }, { status: 403 });
      }
    }

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Barcha majburiy maydonlarni to'ldiring" }, { status: 400 });
    }

    await dbConnect();

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json({ error: "Ushbu email manzili allaqachon ro'yxatdan o'tgan" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const normalizedPhone = phone ? normalizeUzPhone(phone) : undefined;
    let normalizedTg = telegramUsername ? telegramUsername.trim() : undefined;
    if (normalizedTg && !normalizedTg.startsWith("@")) {
      normalizedTg = `@${normalizedTg}`;
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || "SUPPORT",
      isLead: Boolean(isLead),
      phone: normalizedPhone,
      telegramUsername: normalizedTg,
    });

    return NextResponse.json(
      {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isLead: newUser.isLead,
        phone: newUser.phone,
        telegramUsername: newUser.telegramUsername,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("User creation error:", error);
    return NextResponse.json({ error: "Foydalanuvchi yaratishda xatolik yuz berdi" }, { status: 500 });
  }
}
