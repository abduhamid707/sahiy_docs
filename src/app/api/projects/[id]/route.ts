import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/models/Project";
import { Category } from "@/models/Category";
import { Document } from "@/models/Document";
import { auth } from "@/auth";

export async function DELETE(
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


    // Delete project
    const project = await Project.findByIdAndDelete(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // cascade delete: find categories and documents
    const categories = await Category.find({ projectId: id });
    const categoryIds = categories.map(c => c._id);
    
    await Document.deleteMany({ categoryId: { $in: categoryIds } });
    await Category.deleteMany({ projectId: id });

    return NextResponse.json({ message: "Project and associated data deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
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
    const body = await req.json();
    const project = await Project.findByIdAndUpdate(id, body, { new: true });
    
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
