import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/models/Project";
import { Category } from "@/models/Category";
import { Document } from "@/models/Document";
import { auth } from "@/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;
    
    if (!session || ((session.user as any).role !== "SUPER_ADMIN" && (session.user as any).role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Fetch project
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch categories
    const categories = await Category.find({ projectId: id }).sort({ order: 1 });

    // Fetch documents for each category
    const exportData = {
      project: {
        name: project.name,
        description: project.description,
        techStack: project.techStack,
        repoLinks: project.repoLinks,
        allowedRoles: project.allowedRoles,
      },
      categories: [] as any[],
    };

    for (const category of categories) {
      const documents = await Document.find({ categoryId: category._id }).sort({ createdAt: 1 });
      
      exportData.categories.push({
        name: category.name,
        order: category.order,
        allowedRoles: category.allowedRoles,
        documents: documents.map(doc => ({
          title: doc.title,
          content: doc.content,
          status: doc.status,
          keywords: doc.keywords,
          allowedRoles: doc.allowedRoles,
        })),
      });
    }

    return new NextResponse(JSON.stringify(exportData), {
      headers: {
        "Content-Disposition": `attachment; filename="${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_export.json"`,
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
