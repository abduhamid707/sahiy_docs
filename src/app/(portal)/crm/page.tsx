/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { TicketTask } from "@/models/TicketTask";
import { CrmNotification } from "@/models/CrmNotification";
import { User } from "@/models/User";
import { canUseCrm, ticketScope } from "@/lib/support/access";
import { canSeeAllTickets } from "@/lib/support/permissions";
import CrmInbox from "@/components/crm/CrmInbox";

export default async function CrmPage() {
  const session = await auth(); const user = session?.user as any;
  if (!session) redirect("/login"); if (!canUseCrm(user)) redirect("/");
  await dbConnect();
  const [tickets, agents, tasks, notifications] = await Promise.all([
    Ticket.find(ticketScope(user)).populate("assignedTo", "name email image").populate("createdBy", "name email").sort({ lastInteractionAt: -1, createdAt: -1 }).limit(500).lean(),
    User.find({ role: "SUPPORT" }).select("name email image").sort({ name: 1 }).lean(),
    TicketTask.find(canSeeAllTickets(user) ? {} : { assignedTo: user.id }).populate("ticketId", "ticketNumber callerName status").populate("assignedTo", "name email image").sort({ deadlineAt: 1 }).limit(300).lean(),
    CrmNotification.find({ userId: user.id }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  return <CrmInbox initialTickets={JSON.parse(JSON.stringify(tickets))} agents={JSON.parse(JSON.stringify(agents))} initialTasks={JSON.parse(JSON.stringify(tasks))} initialNotifications={JSON.parse(JSON.stringify(notifications))} currentUserId={user.id} nowIso={new Date().toISOString()} />;
}
