import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function checkRole(allowedRoles: string[]) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    return false;
  }
  return true;
}

export async function isAdmin() {
  return checkRole(["SUPER_ADMIN", "ADMIN"]);
}

export async function requireAdmin() {
  const admin = await isAdmin();
  if (!admin) {
    redirect("/");
  }
}
