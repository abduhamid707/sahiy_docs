/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { TicketMessage } from "@/models/TicketMessage";
import { TicketTask } from "@/models/TicketTask";
import { User } from "@/models/User";
import { canAccessTicket, canUseCrm } from "@/lib/support/access";
import { canSeeAllTickets } from "@/lib/support/permissions";
import CrmTicketDetail from "@/components/crm/CrmTicketDetail";

export default async function CrmTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); const user = session?.user as any;
  if (!session) redirect("/login"); if (!canUseCrm(user)) redirect("/");
  await dbConnect(); const { id } = await params;
  const ticket = await Ticket.findById(id).populate("assignedTo", "name email image").populate("createdBy", "name email").lean();
  if (!ticket) notFound();
  const assignedTask = !canAccessTicket(user, ticket)
    ? await TicketTask.exists({ ticketId: id, assignedTo: user.id })
    : true;
  if (!assignedTask) redirect("/crm");
  const [messages, previousTickets, agents, tasks] = await Promise.all([
    TicketMessage.find({ ticketId: id }).populate("author", "name email image").sort({ createdAt: 1 }).lean(),
    Ticket.find({ _id: { $ne: id }, callerPhone: (ticket as any).callerPhone }).select("ticketNumber problem status priority createdAt").sort({ createdAt: -1 }).limit(5).lean(),
    User.find({ role: "SUPPORT" }).select("name email image").sort({ name: 1 }).lean(),
    TicketTask.find({ ticketId: id }).populate("assignedTo", "name email image").populate("createdBy", "name").populate("reviewedBy", "name").sort({ deadlineAt: 1 }).lean(),
  ]);
  return <CrmTicketDetail ticket={JSON.parse(JSON.stringify(ticket))} messages={JSON.parse(JSON.stringify(messages))} previousTickets={JSON.parse(JSON.stringify(previousTickets))} agents={JSON.parse(JSON.stringify(agents))} initialTasks={JSON.parse(JSON.stringify(tasks))} currentUser={user} canManage={canSeeAllTickets(user)} nowIso={new Date().toISOString()} />;
}
