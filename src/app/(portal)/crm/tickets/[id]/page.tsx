/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { TicketMessage } from "@/models/TicketMessage";
import { User } from "@/models/User";
import Call from "@/models/Call";
import { canAccessTicket, canUseCrm, escapeRegex, ticketScope } from "@/lib/support/access";
import { canSeeAllTickets } from "@/lib/support/permissions";
import CrmTicketDetail from "@/components/crm/CrmTicketDetail";

export default async function CrmTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); const user = session?.user as any;
  if (!session) redirect("/login"); if (!canUseCrm(user)) redirect("/");
  await dbConnect(); const { id } = await params;
  const ticket = await Ticket.findById(id)
    .populate("assignedTo", "name email image")
    .populate("collaborators", "name email image")
    .populate("createdBy", "name email")
    .lean();
  if (!ticket) notFound();
  if (!canAccessTicket(user, ticket)) redirect("/crm");
  const ticketDgs = [
    ...((ticket as any).orderIssues || []).map((issue: any) => String(issue?.orderId || "").trim()).filter(Boolean),
    ...String((ticket as any).orderId || "").split(/[,;\n]/).map((value) => value.trim()).filter(Boolean),
  ];
  const relatedDgConditions = ticketDgs.map((dg) => {
    const compact = dg.replace(/\s+/g, "");
    const pattern = [...compact].map(escapeRegex).join("\\s*");
    return [
      { "orderIssues.orderId": new RegExp(`^\\s*${pattern}\\s*$`, "i") },
      { orderId: new RegExp(`(?:^|[,;])\\s*${pattern}\\s*(?=$|[,;])`, "i") },
    ];
  }).flat();
  const previousTicketOr: any[] = [];
  if ((ticket as any).callerPhone) previousTicketOr.push({ callerPhone: (ticket as any).callerPhone });
  if (relatedDgConditions.length) previousTicketOr.push({ $or: relatedDgConditions });
  const previousTicketMatch = previousTicketOr.length ? { $or: previousTicketOr } : { _id: null };
  const [messages, previousTickets, agents, calls, recentCalls] = await Promise.all([
    TicketMessage.find({ ticketId: id }).populate("author", "name email image").sort({ createdAt: 1 }).lean(),
    Ticket.find({ $and: [ticketScope(user), { _id: { $ne: id } }, previousTicketMatch] })
      .select("ticketNumber problem status priority createdAt orderId orderIssues")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    User.find({ role: "SUPPORT" }).select("name email image").sort({ name: 1 }).lean(),
    Call.find({ ticketId: id }).sort({ startedAt: 1 }).lean(),
    Call.find({ phone: (ticket as any).callerPhone }).sort({ startedAt: -1 }).limit(10).lean(),
  ]);
  return <CrmTicketDetail ticket={JSON.parse(JSON.stringify(ticket))} messages={JSON.parse(JSON.stringify(messages))} previousTickets={JSON.parse(JSON.stringify(previousTickets))} agents={JSON.parse(JSON.stringify(agents))} calls={JSON.parse(JSON.stringify(calls))} recentCalls={JSON.parse(JSON.stringify(recentCalls))} currentUser={user} canManage={canSeeAllTickets(user)} nowIso={new Date().toISOString()} />;
}
