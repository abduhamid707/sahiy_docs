import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/models/Project";

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
    
    const projectRoles = [...(body.allowedRoles || [])];
    if (userRole && !["ADMIN", "SUPER_ADMIN"].includes(userRole)) {
      if (!projectRoles.includes(userRole)) {
        projectRoles.push(userRole);
      }
    }
    
    body.allowedRoles = projectRoles.length > 0 ? projectRoles : ["ADMIN", "SUPER_ADMIN"];
    
    const project = await Project.create({
      ...body,
      owner: sessionUser.id,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await dbConnect();
    const projects = await Project.find({}).sort({ name: 1 });
    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
