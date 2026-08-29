export function canSeeAllTickets(user: any): boolean {
  return user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || !!user?.isLead;
}

export function canReassignTickets(user: any): boolean {
  return user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || !!user?.isLead;
}

// PBX webhookdan kelgan tiketlar boshida hech kimga biriktirilmagan (navbatda) bo'ladi -
// har qanday SUPPORT xodimi uni o'ziga olishi (claim) mumkin.
export function canClaimTicket(user: any, ticket: { assignedTo?: any }): boolean {
  return !ticket.assignedTo && user?.role === "SUPPORT";
}
