import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;

  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "HR")) {
    return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fayl yuborilmadi" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Rasm hajmi 10 MB dan oshmasligi kerak" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "Faqat JPG, PNG yoki WEBP formatdagi rasmlar qabul qilinadi" },
        { status: 400 }
      );
    }

    const safeExts: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };

    const ext = safeExts[file.type] || ".jpg";
    const filename = `avatar_${randomUUID()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");

    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    const publicUrl = `/uploads/avatars/${filename}`;

    return NextResponse.json({
      url: publicUrl,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Rasm yuklashda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
