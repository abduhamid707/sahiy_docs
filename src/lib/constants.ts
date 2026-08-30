export const ALL_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "RAHBAR",
  "HR",
  "PM",
  "FRONTEND",
  "BACKEND",
  "MOBILE",
  "DEVOPS",
  "QA",
  "DESIGNER",
  "SUPPORT",
  "VIEWER",
] as const;

export type UserRole = typeof ALL_ROLES[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  RAHBAR: "Rahbar",
  HR: "HR Manager",
  PM: "Project Manager",
  FRONTEND: "Frontend Developer",
  BACKEND: "Backend Developer",
  MOBILE: "Mobile Developer",
  DEVOPS: "DevOps Engineer",
  QA: "QA Engineer",
  DESIGNER: "UI/UX Designer",
  SUPPORT: "Support / Operator",
  VIEWER: "Viewer",
};

export const DEPARTMENTS = [
  "Call Center",
  "Ombor / Logistika",
  "IT / Dasturlash",
  "Moliya / Buxgalteriya",
  "HR / Kadrlar",
  "Boshqaruv / Rahbariyat",
  "Marketing / Savdo",
  "Mijozlar bilan ishlash",
] as const;

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "To‘liq stavka",
  PART_TIME: "Yarim stavka",
  PROBATION: "Sinov muddati",
  CONTRACT: "Shartnoma asosida",
};

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Faol",
  ON_LEAVE: "Ta’tilda",
  INACTIVE: "Vaqtincha nofaol",
  TERMINATED: "Ishdan bo‘shagan",
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
