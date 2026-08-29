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
  "DESIGNER",
  "SUPPORT",
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
  DESIGNER: "UI/UX Designer",
  SUPPORT: "Support",
  VIEWER: "Viewer",
};

// Ticket SLA rang darajalari — Support/Call-center moduli
export const TICKET_TIERS = ["OPEN", "WARNING", "OVERDUE", "RESOLVED"] as const;
export type TicketTier = typeof TICKET_TIERS[number];

export const TICKET_TIER_LABELS: Record<TicketTier, string> = {
  OPEN: "Ochiq",
  WARNING: "Diqqat",
  OVERDUE: "Kechikkan",
  RESOLVED: "Hal qilindi",
};
