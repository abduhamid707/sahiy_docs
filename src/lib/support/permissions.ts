/* eslint-disable @typescript-eslint/no-explicit-any */

export function isExecutive(user: any): boolean {
  return user?.role === "RAHBAR";
}

export function canSeeAllTickets(user: any): boolean {
  return (
    isExecutive(user) ||
    user?.role === "SUPER_ADMIN" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPPORT_LEAD" ||
    !!user?.isLead
  );
}

export function canMutateCrm(user: any): boolean {
  if (isExecutive(user)) return false; // RAHBAR is strictly read-only
  return (
    user?.role === "SUPER_ADMIN" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPPORT" ||
    user?.role === "SUPPORT_LEAD" ||
    !!user?.isLead
  );
}

export function canReassignTickets(user: any): boolean {
  if (isExecutive(user)) return false;
  return (
    user?.role === "SUPER_ADMIN" ||
    user?.role === "ADMIN" ||
    user?.role === "SUPPORT_LEAD" ||
    !!user?.isLead
  );
}

export function canManageUsers(user: any): boolean {
  if (isExecutive(user)) return false;
  return user?.role === "SUPER_ADMIN" || (user?.role === "ADMIN" && !!user?.isLead);
}

export function canApproveTicketResolution(user: any): boolean {
  if (isExecutive(user)) return false;
  return user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || !!user?.isLead;
}

// PBX webhookdan kelgan tiketlar boshida hech kimga biriktirilmagan (navbatda) bo'ladi -
// har qanday SUPPORT xodimi uni o'ziga olishi (claim) mumkin.
export function canClaimTicket(user: any, ticket: { assignedTo?: any }): boolean {
  if (isExecutive(user)) return false;
  return !ticket.assignedTo && (user?.role === "SUPPORT" || user?.role === "OPERATOR");
}
