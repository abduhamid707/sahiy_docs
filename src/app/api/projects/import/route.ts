import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/models/Project";
import { Category } from "@/models/Category";
import { Document } from "@/models/Document";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session || ((session.user as any).role !== "SUPER_ADMIN" && (session.user as any).role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    await dbConnect();
    const data = await req.json();

    const { project, categories } = data;

    if (!project || !project.name) {
      return NextResponse.json({ error: "Invalid project data. Name is required." }, { status: 400 });
    }

    // Create project
    const newProject = await Project.create({
      ...project,
      owner: userId,
    });

    // Create categories and documents
    if (categories && Array.isArray(categories)) {
      for (const cat of categories) {
        const newCategory = await Category.create({
          name: cat.name,
          order: cat.order || 0,
          allowedRoles: cat.allowedRoles || project.allowedRoles,
          projectId: newProject._id,
        });

        if (cat.documents && Array.isArray(cat.documents)) {
          for (const doc of cat.documents) {
            await Document.create({
              title: doc.title,
              content: doc.content,
              status: doc.status || "DRAFT",
              keywords: doc.keywords || [],
              allowedRoles: doc.allowedRoles || cat.allowedRoles || project.allowedRoles,
              categoryId: newCategory._id,
              owner: userId,
              lastUpdatedBy: userId,
            });
          }
        }
      }
    }

    return NextResponse.json({ 
      message: "Project imported successfully", 
      projectId: newProject._id 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
