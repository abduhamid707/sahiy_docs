import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Xavfsizlik sozlamalari
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Fayl topilmadi" }, { status: 400 });
    }

    // 1. Hajmni tekshirish
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: "Fayl juda katta", 
        message: "Maksimal hajm 5MB" 
      }, { status: 400 });
    }

    // 2. Turni tekshirish
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: "Ruxsat etilmagan fayl turi", 
        message: "Faqat rasm (JPG, PNG, WEBP, GIF) yuklash mumkin" 
      }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 3. Xavfsiz nom yaratish (Original nomni butunlay o'chirib tashlaymiz)
    const ext = path.extname(file.name).toLowerCase() || ".jpg";
    // Faqat rasm kengaytmalariga ruxsat (qo'shimcha tekshiruv)
    if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
       return NextResponse.json({ error: "Xavfsiz bo'lmagan kengaytma" }, { status: 400 });
    }
    
    const fileName = `${uuidv4()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Muvaffaqiyatli yuklandi
    const url = `/uploads/${fileName}`;

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Upload error details:", error);
    return NextResponse.json({ 
      error: "Upload failed", 
      message: "Serverda xatolik yuz berdi" 
    }, { status: 500 });
  }
}
