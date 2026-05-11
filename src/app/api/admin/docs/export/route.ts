import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Document } from "@/models/Document";
import { Category } from "@/models/Category";
import { Project } from "@/models/Project";

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
    const isDeveloper = role === "MOBILE" || role === "FRONTEND";

    if (!isAdmin && !isDeveloper) {
      return NextResponse.json({ message: "Ruxsat berilmagan" }, { status: 403 });
    }

    await dbConnect();

    let query: any = {};
    
    if (!isAdmin) {
      // Non-admins only get docs they have access to
      const allowedProjects = await Project.find({ allowedRoles: role }).select("_id");
      const projectIds = allowedProjects.map(p => p._id);
      const allowedCategories = await Category.find({ projectId: { $in: projectIds } }).select("_id");
      const categoryIds = allowedCategories.map(c => c._id);
      
      query = { 
        $or: [
          { categoryId: { $in: categoryIds }, allowedRoles: role },
          { owner: (session?.user as any)?.id }
        ]
      };
    }

    const docs = await Document.find(query)
      .populate({
        path: 'categoryId',
        model: Category,
        populate: {
          path: 'projectId',
          model: Project
        }
      })
      .populate('owner');

    // Transform to a clean format for export
    const exportData = docs.map(doc => ({
      title: doc.title,
      content: doc.content,
      status: doc.status,
      allowedRoles: doc.allowedRoles,
      keywords: doc.keywords,
      category: (doc.categoryId as any)?.name,
      project: (doc.categoryId as any)?.projectId?.name,
    }));

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=sahiy_docs_export.json",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ message: "Eksport qilishda xatolik yuz berdi" }, { status: 500 });
  }
}
