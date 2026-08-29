import { redirect } from "next/navigation";
export default async function LegacySupportTicketPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; redirect(`/crm/tickets/${id}`); }
