import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Document } from "@/models/Document";
import { auth } from "@/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const doc = await Document.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Only owners or admins can delete
    const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
    const isOwner = doc.owner?.toString() === userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden: You cannot delete this document" }, { status: 403 });
    }

    await Document.findByIdAndDelete(id);

    return NextResponse.json({ message: "Document deleted successfully" });
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const doc = await Document.findByIdAndUpdate(id, body, { new: true });
    
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
