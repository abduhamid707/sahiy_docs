/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { canUseCrm } from "@/lib/support/access";
import { canSeeAllTickets } from "@/lib/support/permissions";
import CrmTicketForm from "@/components/crm/CrmTicketForm";

export default async function NewCrmTicketPage() {
  const session = await auth(); const user = session?.user as any;
  if (!session) redirect("/login"); if (!canUseCrm(user)) redirect("/");
  await dbConnect();
  const agents = canSeeAllTickets(user) ? await User.find({ role: "SUPPORT" }).select("name email").sort({ name: 1 }).lean() : [];
  return <CrmTicketForm agents={JSON.parse(JSON.stringify(agents))} canAssign={canSeeAllTickets(user)} />;
}
