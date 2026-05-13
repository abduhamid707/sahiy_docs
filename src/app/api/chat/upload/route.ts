import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads
    const uploadDir = join(process.cwd(), "public", "uploads");
    
    // Ensure dir exists
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // Ignore if exists
    }

    const filename = `${Date.now()}-${file.name}`;
    const path = join(uploadDir, filename);
    
    await writeFile(path, buffer);
    console.log(`Uploaded file saved to ${path}`);

    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        name: file.name,
        type: file.type
      }
    });
  } catch (error: any) {
    console.error("Error in POST /api/chat/upload:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
