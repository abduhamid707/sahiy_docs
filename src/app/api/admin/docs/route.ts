import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Document } from "@/models/Document";
import { Category } from "@/models/Category";
import { recordLog } from "@/lib/logs";

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
      categoryId: finalCategoryId,
      status: status || "DRAFT",
      owner: userId,
      lastUpdatedBy: userId,
      allowedRoles: finalRoles,
      keywords: keywords || [],
    });

    await recordLog("CREATE", "DOCUMENT", doc._id.toString(), { title: doc.title });

    return NextResponse.json(doc, { status: 201 });
  } catch (error: any) {
    console.error("Document creation error:", error);
    return NextResponse.json({ error: "Hujjat yaratishda xatolik yuz berdi" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    await dbConnect();
    
    // For general listing, filter by role
    // Admins see everything
    const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
    const query = isAdmin ? {} : { allowedRoles: userRole };
    
    const docs = await Document.find(query)
      .populate("owner", "name email")
      .sort({ updatedAt: -1 });

    return NextResponse.json(docs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
