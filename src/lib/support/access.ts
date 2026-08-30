/* eslint-disable @typescript-eslint/no-explicit-any */
import { canSeeAllTickets, isExecutive } from "./permissions";

export function canUseCrm(user: any) {
  return !!user && (isExecutive(user) || user.role === "SUPPORT" || canSeeAllTickets(user));
}

export function ticketScope(user: any) {
  return canSeeAllTickets(user) ? {} : { $or: [{ assignedTo: user.id }, { assignedTo: { $exists: false } }, { assignedTo: null }] };
}

export function canAccessTicket(user: any, ticket: any) {
  if (canSeeAllTickets(user)) return true;
  const assigned = ticket.assignedTo?._id || ticket.assignedTo;
  return user?.role === "SUPPORT" && (!assigned || assigned.toString() === user.id);
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
