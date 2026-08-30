/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { normalizeUzPhone } from "@/lib/crm";
import { canUseCrm, escapeRegex } from "@/lib/support/access";

function flexibleDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4
    ? new RegExp(digits.split("").map(escapeRegex).join("\\D*"), "i")
    : null;
}

function flexibleOrder(value: string) {
  const compact = value.replace(/[\s-]/g, "");
  return compact.length >= 2
    ? new RegExp(compact.split("").map(escapeRegex).join("[\\s-]*"), "i")
    : null;
}

import { getAuthUser } from "@/lib/auth-helper";

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user || !canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);
  await dbConnect();
  const searchConditions: Record<string, unknown>[] = [
    { callerName: new RegExp(escapeRegex(q), "i") },
    { orderId: new RegExp(escapeRegex(q), "i") },
  ];
  const phoneRegex = flexibleDigits(q);
  const orderRegex = flexibleOrder(q);
  if (phoneRegex) searchConditions.push({ callerPhone: phoneRegex });
  if (orderRegex) searchConditions.push({ orderId: orderRegex });

  // Customer lookup is intentionally shared across CRM operators. Assignment
  // scope is applied to the inbox, not to customer identity/history lookup.
  const matches = await Ticket.find({ $or: searchConditions })
    .select("callerName callerPhone orderId category problem status priority ticketNumber createdAt")
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const phoneKeys = [...new Set(matches.map((ticket: any) => normalizeUzPhone(ticket.callerPhone)).filter(Boolean))];
  const phoneConditions = phoneKeys
    .map(flexibleDigits)
    .filter((regex): regex is RegExp => Boolean(regex))
    .map((regex) => ({ callerPhone: regex }));
  const openTickets = phoneConditions.length ? await Ticket.find({
    callerPhone: { $exists: true },
    $or: phoneConditions,
    status: { $nin: ["RESOLVED", "CLOSED"] },
  }).select("callerPhone ticketNumber category problem status priority createdAt").sort({ createdAt: -1 }).lean() : [];
  const openByPhone = new Map<string, any[]>();
  for (const ticket of openTickets as any[]) {
    const key = normalizeUzPhone(ticket.callerPhone);
    const list = openByPhone.get(key) || []; list.push(ticket); openByPhone.set(key, list);
  }
  const seen = new Set<string>();
  const results = [];
  for (const ticket of matches as any[]) {
    const phoneKey = normalizeUzPhone(ticket.callerPhone);
    const identityKey = phoneKey || `${ticket.callerName}:${ticket.orderId}`;
    if (seen.has(identityKey)) continue;
    seen.add(identityKey);
    results.push({
      customerName: ticket.callerName || "Noma'lum", phone: ticket.callerPhone, orderId: ticket.orderId || "",
      sourceTicketId: ticket._id, lastCategory: ticket.category || "OTHER", lastProblem: ticket.problem,
      openTickets: openByPhone.get(phoneKey) || [],
    });
    if (results.length >= 8) break;
  }
  return NextResponse.json(results);
}
