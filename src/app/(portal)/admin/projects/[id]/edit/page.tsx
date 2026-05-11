import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/models/Project";
import { Category } from "@/models/Category";
import { redirect, notFound } from "next/navigation";
import EditProjectForm from "./EditProjectForm";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    redirect("/");
  }

  const { id } = await params;
  await dbConnect();
  
  const project = await Project.findById(id);
  
  if (!project) {
    notFound();
  }

  const categories = await Category.find({ projectId: id }).sort({ order: 1 });

  // Convert to plain object for Client Component
  const projectData = {
    _id: project._id.toString(),
    name: project.name,
    description: project.description,
    techStack: project.techStack.join(", "),
    allowedRoles: project.allowedRoles,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <EditProjectForm project={projectData} categories={JSON.parse(JSON.stringify(categories))} />
    </div>
  );
}

