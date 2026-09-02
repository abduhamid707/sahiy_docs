/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canUseCrm } from "@/lib/support/access";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif",
  "application/pdf", "text/plain", "text/csv",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip", "application/x-zip-compressed", "audio/mpeg", "audio/ogg",
]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif", ".pdf", ".txt", ".csv", ".doc", ".docx", ".xls", ".xlsx", ".zip", ".mp3", ".ogg"]);

export async function POST(req: Request) {
  const session = await auth(); const user = session?.user as any;
  if (!canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  const form = await req.formData(); const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fayl topilmadi" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Fayl 5 MB dan katta bo'lmasligi kerak" }, { status: 400 });
  const originalExtension = path.extname(file.name).toLowerCase();
  if (!ALLOWED.has(file.type) && !ALLOWED_EXTENSIONS.has(originalExtension)) return NextResponse.json({ error: "Bu fayl turiga ruxsat berilmagan" }, { status: 400 });
  const safeExtensions: Record<string, string> = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "image/heic": ".heic", "image/heif": ".heif",
    "application/pdf": ".pdf", "text/plain": ".txt", "text/csv": ".csv",
    "application/msword": ".doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/zip": ".zip", "application/x-zip-compressed": ".zip", "audio/mpeg": ".mp3", "audio/ogg": ".ogg",
  };
  const ext = safeExtensions[file.type] || originalExtension;
  const name = `${randomUUID()}${ext}`; const dir = path.join(process.cwd(), "public", "uploads", "crm");
  await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/crm/${name}`, name: file.name, mimeType: file.type, size: file.size });
}
