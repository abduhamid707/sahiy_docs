export const ALL_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MOBILE",
  "FRONTEND",
  "BACKEND",
  "DEVOPS",
  "QA",
  "PM",
  "HR",
  "VIEWER",
] as const;

export type UserRole = typeof ALL_ROLES[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MOBILE: "Mobile Developer",
  FRONTEND: "Frontend Developer",
  BACKEND: "Backend Developer",
  DEVOPS: "DevOps Engineer",
  QA: "QA Engineer",
  PM: "Project Manager",
  HR: "HR Manager",
  VIEWER: "Viewer",
};
