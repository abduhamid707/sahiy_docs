import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { canViewPassport } from "@/lib/employees/service";
import { readFile, stat } from "fs/promises";
import path from "path";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fileKey: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    if (!canViewPassport(user)) {
      return NextResponse.json({ error: "Ushbu hujjatni ko'rishga ruxsat yo'q" }, { status: 403 });
    }

    const { fileKey } = await params;
    const safeKey = path.basename(fileKey);
    const filePath = path.join(process.cwd(), "private_uploads", "employees", safeKey);

    try {
      await stat(filePath);
    } catch {
      return NextResponse.json({ error: "Hujjat topilmadi" }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const ext = path.extname(safeKey).toLowerCase();

    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${safeKey}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Serve document error:", error?.message || error);
    return NextResponse.json(
      { error: "Hujjatni yuklab olishda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
