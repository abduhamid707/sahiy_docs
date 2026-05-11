import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  // =====================================================
  // XAVFSIZLIK: Faqat SEED_SECRET kalit bilan ishlaydi
  // Production'da bu endpoint himoyalangan
  // Misol: GET /api/seed?secret=your_secret_key
  // =====================================================
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json(
      { error: "Forbidden: Invalid seed secret" },
      { status: 403 }
    );
  }

  try {
    await dbConnect();

    const admins = [
      {
        name: process.env.SEED_ADMIN_NAME || "Super Admin",
        email: process.env.SEED_ADMIN_EMAIL || "",
        password: process.env.SEED_ADMIN_PASSWORD || "",
        role: "SUPER_ADMIN",
      },
    ];

    if (!admins[0].email || !admins[0].password) {
      return NextResponse.json(
        { error: "SEED_ADMIN_EMAIL va SEED_ADMIN_PASSWORD .env da ko'rsatilmagan" },
        { status: 400 }
      );
    }

    const results = [];

    for (const admin of admins) {
      const existing = await User.findOne({ email: admin.email });

      if (existing) {
        results.push({ email: admin.email, status: "already exists" });
        continue;
      }

      const hashedPassword = await bcrypt.hash(admin.password, 12);
      await User.create({
        name: admin.name,
        email: admin.email,
        password: hashedPassword,
        role: admin.role,
      });

      results.push({ email: admin.email, status: "created", role: admin.role });
    }

    return NextResponse.json({
      message: "Seed completed",
      results,
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
