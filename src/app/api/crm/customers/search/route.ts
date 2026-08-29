/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { canUseCrm, escapeRegex, ticketScope } from "@/lib/support/access";

export async function GET(req: Request) {
  const session = await auth(); const user = session?.user as any;
  if (!canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);
  await dbConnect();
  const variants = [...new Set([q, q.replace(/[^\p{L}\p{N}]/gu, ""), q.replace(/\D/g, "")].filter(value => value.length >= 2))];
  const searchConditions = variants.flatMap(value => {
    const regex = new RegExp(escapeRegex(value), "i");
    return [{ callerPhone: regex }, { orderId: regex }, { callerName: regex }];
  });
  const matches = await Ticket.find({
    $and: [ticketScope(user), { $or: searchConditions }],
  }).select("callerName callerPhone orderId category problem status priority ticketNumber createdAt").sort({ createdAt: -1 }).limit(30).lean();

  const phones = [...new Set(matches.map((t: any) => t.callerPhone).filter(Boolean))];
  const openTickets = phones.length ? await Ticket.find({
    $and: [ticketScope(user), { callerPhone: { $in: phones }, status: { $nin: ["RESOLVED", "CLOSED"] } }],
  }).select("callerPhone ticketNumber category problem status priority createdAt").sort({ createdAt: -1 }).lean() : [];
  const openByPhone = new Map<string, any[]>();
  for (const ticket of openTickets as any[]) {
    const list = openByPhone.get(ticket.callerPhone) || []; list.push(ticket); openByPhone.set(ticket.callerPhone, list);
  }
  const seen = new Set<string>();
  const results = [];
  for (const ticket of matches as any[]) {
    if (seen.has(ticket.callerPhone)) continue;
    seen.add(ticket.callerPhone);
    results.push({
      customerName: ticket.callerName || "Noma'lum", phone: ticket.callerPhone, orderId: ticket.orderId || "",
      sourceTicketId: ticket._id, lastCategory: ticket.category || "OTHER", lastProblem: ticket.problem,
      openTickets: openByPhone.get(ticket.callerPhone) || [],
    });
    if (results.length >= 8) break;
  }
  return NextResponse.json(results);
}
