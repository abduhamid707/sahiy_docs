import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { getAuthUser } from "@/lib/auth-helper";
import { canUseCrm } from "@/lib/support/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_DIRECTORY = path.join(process.cwd(), "public", "uploads", "crm");

// CRM uploader always writes a UUID plus one of these extensions. Keeping this
// strict prevents both traversal attempts and arbitrary files from being read.
const CRM_UPLOAD_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpe?g|png|webp|gif|heic|heif|pdf|txt|csv|docx?|xlsx?|zip|mp3|ogg)$/i;

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });
  }
  if (!canUseCrm(user)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const { filename } = await params;
  if (!CRM_UPLOAD_FILE.test(filename)) {
    return new NextResponse(null, { status: 404 });
  }

  const filePath = path.resolve(UPLOAD_DIRECTORY, filename);
  if (!filePath.startsWith(`${UPLOAD_DIRECTORY}${path.sep}`)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) {
      return new NextResponse(null, { status: 404 });
    }

    const extension = path.extname(filename).toLowerCase();
    const contents = await readFile(filePath);

    return new NextResponse(contents, {
      headers: {
        "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
        "Content-Length": String(fileInfo.size),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=300",
        "Last-Modified": fileInfo.mtime.toUTCString(),
        "Vary": "Cookie, Authorization",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return new NextResponse(null, { status: 404 });
    }
    console.error("CRM upload read error:", error);
    return NextResponse.json({ error: "Faylni o'qib bo'lmadi" }, { status: 500 });
  }
}
