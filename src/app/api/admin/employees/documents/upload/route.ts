import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { canManageEmployees } from "@/lib/employees/service";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    if (!canManageEmployees(user)) {
      return NextResponse.json({ error: "Hujjat yuklashga ruxsat yo'q" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fayl yuborilmadi" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Fayl hajmi 15MB dan oshmasligi kerak" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Faqat JPG, PNG, WEBP va PDF formatlariga ruxsat berilgan" },
        { status: 400 }
      );
    }

    const safeExtensions: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "application/pdf": ".pdf",
    };

    const ext = safeExtensions[file.type] || path.extname(file.name).toLowerCase() || ".dat";
    const fileId = randomUUID();
    const fileKey = `${fileId}${ext}`;

    const uploadDir = path.join(process.cwd(), "private_uploads", "employees");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileKey);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({
      fileId,
      fileName: file.name,
      fileKey,
      mimeType: file.type,
      size: file.size,
      url: `/api/admin/employees/documents/${fileKey}`,
    });
  } catch (error: any) {
    console.error("Document upload error:", error?.message || error);
    return NextResponse.json(
      { error: "Hujjatni yuklashda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
