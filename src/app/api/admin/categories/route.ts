import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Category } from "@/models/Category";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const sessionUser = session?.user as any;
    
    if (!session || !sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAllowed = sessionUser.role === "SUPER_ADMIN" || sessionUser.role === "ADMIN" || sessionUser.isLead;

    if (!isAllowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const userRole = sessionUser.role;
    
    const categoryRoles = [...(body.allowedRoles || [])];
    if (userRole && !["ADMIN", "SUPER_ADMIN"].includes(userRole)) {
      if (!categoryRoles.includes(userRole)) {
        categoryRoles.push(userRole);
      }
    }
    
    body.allowedRoles = categoryRoles.length > 0 ? categoryRoles : ["ADMIN", "SUPER_ADMIN"];
    
    const category = await Category.create(body);
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    await dbConnect();
    const query = projectId ? { projectId } : {};
    const categories = await Category.find(query).sort({ order: 1 });
    
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
