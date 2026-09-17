/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { TicketMessage } from "@/models/TicketMessage";
import { Conversation } from "@/models/Conversation";
import { Message } from "@/models/Message";
import { getAuthUser } from "@/lib/auth-helper";
import { canUseCrm, escapeRegex, ticketScope } from "@/lib/support/access";

function compactDg(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function parseDgs(values: string[]) {
  return [
    ...new Set(
      values
        .flatMap((value) => value.split(/[,;\n]/))
        .map(compactDg)
        .filter(Boolean),
    ),
  ];
}

function dgRegexes(value: string) {
  const compact = compactDg(value);
  const pattern = [...compact].map(escapeRegex).join("\\s*");
  return {
    issue: new RegExp(`^\\s*${pattern}\\s*$`, "i"),
    legacyOrder: new RegExp(`(?:^|[,;])\\s*${pattern}\\s*(?=$|[,;])`, "i"),
    message: new RegExp(`(^|[^A-Z0-9])${pattern}(?=$|[^A-Z0-9])`, "i"),
  };
}

function ticketHasDg(ticket: any, dg: string) {
  const target = compactDg(dg);
  const issueMatch = (ticket.orderIssues || []).some(
    (issue: any) => compactDg(String(issue?.orderId || "")) === target,
  );
  if (issueMatch) return true;
  return String(ticket.orderId || "")
    .split(/[,;\n]/)
    .some((orderId) => compactDg(orderId) === target);
}

function chatSnippet(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 220 ? `${normalized.slice(0, 217)}...` : normalized;
}

async function findAccessibleChatMatches(userId: string, dgs: string[], regexesByDg: Map<string, ReturnType<typeof dgRegexes>>) {
  // Scope conversations first. A matching Message is never queried or returned
  // unless its conversation is either public or belongs to the current user.
  const conversations = await Conversation.find({
    $or: [{ participants: userId }, { isPublic: true }],
  })
    .select("_id name type")
    .lean();
  if (!conversations.length) return [];

  const conversationsById = new Map(
    (conversations as any[]).map((conversation) => [conversation._id.toString(), conversation]),
  );
  const rows = await Message.find({
    conversationId: { $in: [...conversationsById.keys()] },
    $or: dgs.map((dg) => ({ text: regexesByDg.get(dg)!.message })),
  })
    .select("conversationId text createdAt")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const matchesByConversation = new Map<string, {
    conversationId: string;
    name: string;
    snippet: string;
    createdAt: Date;
    matchedDgs: Set<string>;
  }>();
  for (const row of rows as any[]) {
    const conversationId = row.conversationId?.toString();
    const conversation = conversationId ? conversationsById.get(conversationId) : undefined;
    if (!conversation || !conversationId) continue;

    const matchedDgs = dgs.filter((dg) => regexesByDg.get(dg)!.message.test(String(row.text || "")));
    if (!matchedDgs.length) continue;

    const existing = matchesByConversation.get(conversationId);
    if (existing) {
      matchedDgs.forEach((dg) => existing.matchedDgs.add(dg));
      continue;
    }

    matchesByConversation.set(conversationId, {
      conversationId,
      name: conversation.name || (conversation.type === "GROUP" ? "Nomsiz guruh" : "Shaxsiy chat"),
      snippet: chatSnippet(String(row.text || "")),
      createdAt: row.createdAt,
      matchedDgs: new Set(matchedDgs),
    });
  }

  return [...matchesByConversation.values()].slice(0, 20).map((match) => ({
    conversationId: match.conversationId,
    name: match.name,
    snippet: match.snippet,
    createdAt: match.createdAt,
    matchedDgs: [...match.matchedDgs],
  }));
}

/**
 * Exact DG history lookup. Ticket fields and conversation text are both
 * searched, but the final Ticket query always applies the caller's scope.
 */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });
  if (!canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const params = new URL(req.url).searchParams;
  const dgs = parseDgs([
    ...params.getAll("dgs"),
    params.get("dg") || "",
    params.get("orderId") || "",
    params.get("q") || "",
  ]);
  if (!dgs.length || dgs.some((dg) => dg.length < 2 || dg.length > 100)) {
    return NextResponse.json({ error: "DG raqamini kiriting" }, { status: 400 });
  }
  if (dgs.length > 20) return NextResponse.json({ error: "Ko'pi bilan 20 ta DG qidirish mumkin" }, { status: 400 });

  await dbConnect();
  const regexesByDg = new Map(dgs.map((dg) => [dg, dgRegexes(dg)]));
  const [messageRows, chatMatches] = await Promise.all([
    TicketMessage.find({
      $or: dgs.map((dg) => ({ body: regexesByDg.get(dg)!.message })),
    })
      .select("ticketId body")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
    findAccessibleChatMatches(user.id, dgs, regexesByDg),
  ]);
  const messageTicketIds = [...new Set(messageRows.map((message: any) => message.ticketId?.toString()).filter(Boolean))];
  const messageDgsByTicket = new Map<string, Set<string>>();
  for (const message of messageRows as any[]) {
    const ticketId = message.ticketId?.toString();
    if (!ticketId) continue;
    for (const dg of dgs) {
      if (regexesByDg.get(dg)!.message.test(String(message.body || ""))) {
        const matched = messageDgsByTicket.get(ticketId) || new Set<string>();
        matched.add(dg);
        messageDgsByTicket.set(ticketId, matched);
      }
    }
  }

  const relatedConditions: any[] = dgs.flatMap((dg) => {
    const regexes = regexesByDg.get(dg)!;
    return [
      { "orderIssues.orderId": regexes.issue },
      { orderId: regexes.legacyOrder },
    ];
  });
  if (messageTicketIds.length) relatedConditions.push({ _id: { $in: messageTicketIds } });

  const relatedMatch = { $or: relatedConditions };
  const activeRelatedMatch = {
    status: { $nin: ["RESOLVED", "CLOSED"] },
    $or: relatedConditions,
  };
  const [tickets, visibleActiveCount, globalActiveCount] = await Promise.all([
    Ticket.find({
      $and: [ticketScope(user), relatedMatch],
    })
      .select("ticketNumber callerName callerPhone orderId orderIssues category problem status priority assignedTo collaborators createdBy deadlineAt lastInteractionAt createdAt resolvedAt closedAt")
      .populate("assignedTo", "name email image")
      .populate("collaborators", "name email image")
      .populate("createdBy", "name email image")
      .sort({ lastInteractionAt: -1, createdAt: -1 })
      .limit(20)
      .lean(),
    Ticket.countDocuments({ $and: [ticketScope(user), activeRelatedMatch] }),
    Ticket.countDocuments(activeRelatedMatch),
  ]);

  const messageTicketIdSet = new Set(messageTicketIds);
  return NextResponse.json({
    dg: dgs[0],
    dgs,
    chatMatches,
    // Details of another operator's ticket are deliberately not exposed, but
    // the creation form can still prevent accidental duplicate DG work.
    hasRestrictedMatch: globalActiveCount > visibleActiveCount,
    tickets: (tickets as any[]).map((ticket) => ({
      ...ticket,
      matchedDgs: [
        ...dgs.filter((dg) => ticketHasDg(ticket, dg)),
        ...[...(messageDgsByTicket.get(ticket._id.toString()) || new Set<string>())].filter(
          (dg) => !ticketHasDg(ticket, dg),
        ),
      ],
      matchSources: [
        ...(dgs.some((dg) => ticketHasDg(ticket, dg)) ? ["ORDER"] : []),
        ...(messageTicketIdSet.has(ticket._id.toString()) ? ["CONVERSATION"] : []),
      ],
      isClosed: ["RESOLVED", "CLOSED"].includes(ticket.status),
      canReopen: ["RESOLVED", "CLOSED"].includes(ticket.status),
    })),
  });
}
