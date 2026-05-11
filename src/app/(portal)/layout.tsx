import { auth } from "@/auth";
import PortalShell from "@/components/shared/PortalShell";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/models/Project";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  await dbConnect();
  const userRole = (session.user as any)?.role;
  
  const query = (userRole === "SUPER_ADMIN" || userRole === "ADMIN") 
    ? {} 
    : { allowedRoles: userRole };

  const projects = await Project.find(query).sort({ name: 1 }).lean();

  return (
    <PortalShell 
      user={session.user} 
      projects={JSON.parse(JSON.stringify(projects))}
    >
      {children}
    </PortalShell>
  );
}
