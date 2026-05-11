import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Document } from "@/models/Document";
import { Category } from "@/models/Category";
import { Project } from "@/models/Project";
import { recordLog } from "@/lib/logs";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ message: "Ruxsat berilmagan (Faqat adminlar uchun)" }, { status: 403 });
    }

    await dbConnect();

    const formData = await req.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ message: "Fayl topilmadi" }, { status: 400 });
    }

    const text = await file.text();
    const data = JSON.parse(text);

    if (!Array.isArray(data)) {
      return NextResponse.json({ message: "Noto'g'ri format. Massiv kutilmoqda." }, { status: 400 });
    }

    let importedCount = 0;

    for (const item of data) {
      const { title, content, status, allowedRoles, keywords, category, project } = item;

      if (!title || !content) continue;

      const projectName = project || "Default Project";
      const categoryName = category || "Uncategorized";

      // Find or create project
      let proj = await Project.findOne({ name: projectName });
      if (!proj) {
        proj = await Project.create({
          name: projectName,
          allowedRoles: allowedRoles || ["ADMIN", "SUPER_ADMIN"],
        });
      }

      // Find or create category
      let cat = await Category.findOne({ name: categoryName, projectId: proj._id });
      if (!cat) {
        cat = await Category.create({
          name: categoryName,
          projectId: proj._id,
          allowedRoles: allowedRoles || ["ADMIN", "SUPER_ADMIN"],
        });
      }

      const finalCategoryId = cat._id;

      // Create document
      await Document.create({
        title,
        content,
        status: status || "DRAFT",
        allowedRoles: allowedRoles || ["ADMIN", "SUPER_ADMIN"],
        keywords: keywords || [],
        categoryId: finalCategoryId,
        owner: (session?.user as any)?.id,
        lastUpdatedBy: (session?.user as any)?.id,
      });

      importedCount++;
    }

    await recordLog("IMPORT", "DOCUMENT", undefined, { count: importedCount });

    return NextResponse.json({ 
      message: `Muvaffaqiyatli import qilindi: ${importedCount} ta hujjat`,
      count: importedCount 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ message: "Import qilishda xatolik yuz berdi: " + error.message }, { status: 500 });
  }
}
