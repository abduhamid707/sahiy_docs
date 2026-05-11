import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Document } from "@/models/Document";
import { Project } from "@/models/Project";
import { Category } from "@/models/Category";
import { redirect, notFound } from "next/navigation";
import EditDocForm from "./EditDocForm";

export default async function EditDocPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";

  const { id } = await params;

  // Validate ObjectId
  const isValidId = /^[0-9a-fA-F]{24}$/.test(id);
  if (!isValidId) notFound();

  await dbConnect();
  
  const doc = await Document.findById(id).populate("categoryId");
  if (!doc) notFound();

  const canEdit = isAdmin || doc.allowedRoles.includes(userRole);
  if (!canEdit) redirect("/");

  // Filter projects/categories by role if not admin
  const projectQuery = isAdmin ? {} : { allowedRoles: userRole };
  const projects = await Project.find(projectQuery);
  
  // Get category list based on accessible projects for developers
  const accessibleProjectIds = projects.map(p => p._id);
  const categoryQuery = isAdmin ? {} : { projectId: { $in: accessibleProjectIds } };
  const categories = await Category.find(categoryQuery).sort({ name: 1 });

  const docData = {
    _id: doc._id.toString(),
    title: doc.title,
    content: doc.content,
    projectId: doc.categoryId?.projectId?.toString() || "",
    categoryId: doc.categoryId?._id?.toString() || doc.categoryId?.toString(),
    status: doc.status,
    allowedRoles: doc.allowedRoles,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <EditDocForm 
        doc={docData} 
        projects={JSON.parse(JSON.stringify(projects))} 
        categories={JSON.parse(JSON.stringify(categories))} 
      />
    </div>
  );
}
