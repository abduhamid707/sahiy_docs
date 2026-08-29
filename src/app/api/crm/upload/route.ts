/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canUseCrm } from "@/lib/support/access";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

export async function POST(req: Request) {
  const session = await auth(); const user = session?.user as any;
  if (!canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  const form = await req.formData(); const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fayl topilmadi" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Fayl 10 MB dan katta bo'lmasligi kerak" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Bu fayl turiga ruxsat berilmagan" }, { status: 400 });
  const safeExtensions: Record<string, string> = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf", "text/plain": ".txt",
    "application/msword": ".doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  };
  const ext = safeExtensions[file.type] || path.extname(file.name).toLowerCase();
  const name = `${randomUUID()}${ext}`; const dir = path.join(process.cwd(), "public", "uploads", "crm");
  await mkdir(dir, { recursive: true }); await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/crm/${name}`, name: file.name, mimeType: file.type, size: file.size });
}
