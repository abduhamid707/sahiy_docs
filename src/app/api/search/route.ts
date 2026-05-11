import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Document } from "@/models/Document";
import { Project } from "@/models/Project";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    await dbConnect();
    
    const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
    const roleQuery = isAdmin ? {} : { allowedRoles: userRole };

    // Search Projects
    const projects = await Project.find({
      ...roleQuery,
      name: { $regex: q, $options: "i" }
    }).limit(5);

    // Search Documents
    const docs = await Document.find({
      ...roleQuery,
      $or: [
        { title: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } },
        { keywords: { $regex: q, $options: "i" } }
      ]
    }).limit(10).populate("categoryId");

    const results = [
      ...projects.map(p => ({ id: p._id, title: p.name, type: "project", url: `/projects/${p._id}` })),
      ...docs.map(d => ({ id: d._id, title: d.title, type: "doc", url: `/docs/${d._id}` }))
    ];

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
