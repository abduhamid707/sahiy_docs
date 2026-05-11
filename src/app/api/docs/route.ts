import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Document } from "@/models/Document";
import { Project } from "@/models/Project";
import { Category } from "@/models/Category";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await auth();
    const role = (session?.user as any)?.role;
    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(role);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    
    let query: any = projectId ? { projectId } : {};

    if (!isAdmin) {
      // 1. Find all projects allowed for this role
      const allowedProjects = await Project.find({ allowedRoles: role }).select("_id");
      const projectIds = allowedProjects.map(p => p._id);
      
      // 2. Find all categories belonging to these projects
      const allowedCategories = await Category.find({ projectId: { $in: projectIds } }).select("_id");
      const categoryIds = allowedCategories.map(c => c._id);
      
      // 3. Query documents: (belongs to allowed categories AND has role) OR (is the owner)
      query = { 
        $or: [
          { 
            categoryId: { $in: categoryIds },
            allowedRoles: role 
          },
          { owner: (session?.user as any)?.id }
        ]
      };
    }
    
    const docs = await Document.find(query).populate("projectId", "name slug").sort({ updatedAt: -1 });
    return NextResponse.json(docs);
  } catch (error) {
    console.error("Fetch documents error:", error);
    return NextResponse.json({ error: "Ma'lumotlarni yuklashda xatolik yuz berdi" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!session || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { title, content, categoryId, status, allowedRoles } = body;

    // Ensure creator's role is always in allowedRoles for developers
    const finalRoles = [...(allowedRoles || [])];
    if (userRole && !["ADMIN", "SUPER_ADMIN"].includes(userRole)) {
      if (!finalRoles.includes(userRole)) {
        finalRoles.push(userRole);
      }
    }

    const doc = await Document.create({
      title,
      content,
      categoryId,
      status: status || "DRAFT",
      owner: userId,
      lastUpdatedBy: userId,
      allowedRoles: finalRoles,
    });
    
    return NextResponse.json(doc, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
