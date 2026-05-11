import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Document } from "@/models/Document";
import { Category } from "@/models/Category";
import { recordLog } from "@/lib/logs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";

    const { id } = await params;
    await dbConnect();

    const doc = await Document.findById(id);
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const canEdit = isAdmin || doc.allowedRoles.includes(userRole);
    if (!canEdit) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, categoryId, status, allowedRoles, keywords, newCategoryName, projectId } = body;

    let finalCategoryId = categoryId;

    if (newCategoryName && projectId) {
      const category = await Category.create({
        name: newCategoryName,
        projectId,
        allowedRoles: allowedRoles || ["ADMIN", "SUPER_ADMIN"],
      });
      finalCategoryId = category._id;
    }

    const updateData: any = { 
      title,
      content,
      categoryId: finalCategoryId,
      status,
      allowedRoles,
      keywords,
      lastUpdatedBy: (session?.user as any)?.id, 
      updatedAt: new Date() 
    };

    // If document has no owner, assign the person who is currently editing it
    if (!doc.owner) {
      updateData.owner = (session?.user as any)?.id;
    }

    const updatedDoc = await Document.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    await recordLog("UPDATE", "DOCUMENT", id, { 
      title: updatedDoc.title,
      previousContent: doc.content 
    });

    return NextResponse.json(updatedDoc);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can delete documents" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    
    const doc = await Document.findById(id);
    await Document.findByIdAndDelete(id);
    
    await recordLog("DELETE", "DOCUMENT", id, { 
      title: doc?.title,
      deletedDoc: doc 
    });

    return NextResponse.json({ message: "Document deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
