import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/models/Project";
import { Category } from "@/models/Category";
import { redirect } from "next/navigation";
import NewDocForm from "./NewDocForm";

export default async function NewDocPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const isDeveloper = role === "MOBILE" || role === "FRONTEND";

  if (!isAdmin && !isDeveloper) {
    redirect("/");
  }

  await dbConnect();
  
  // Filter projects by role
  const projectQuery = isAdmin ? {} : { allowedRoles: role };
  const projects = await Project.find(projectQuery).sort({ name: 1 });
  
  // Filter categories based on accessible projects
  const accessibleProjectIds = projects.map(p => p._id);
  const categoryQuery = isAdmin ? {} : { projectId: { $in: accessibleProjectIds } };
  const categories = await Category.find(categoryQuery).sort({ name: 1 });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <NewDocForm 
        projects={JSON.parse(JSON.stringify(projects))} 
        categories={JSON.parse(JSON.stringify(categories))} 
      />
    </div>
  );
}
