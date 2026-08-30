/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { TicketMessage } from "@/models/TicketMessage";
import { CRM_MESSAGE_TYPES } from "@/lib/crm";
import { canAccessTicket, canUseCrm } from "@/lib/support/access";
import { canMutateCrm } from "@/lib/support/permissions";
import { getAuthUser } from "@/lib/auth-helper";

const schema = z.object({
  type: z.enum(CRM_MESSAGE_TYPES), body: z.string().trim().min(1).max(10000),
  attachment: z.object({ url: z.string().min(1), name: z.string().min(1), mimeType: z.string().optional(), size: z.number().optional() }).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });
  if (!canMutateCrm(user)) return NextResponse.json({ error: "Rahbar izoh yozolmaydi (faqat kuzatish)" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Xabar noto'g'ri" }, { status: 400 });
  await dbConnect(); const { id } = await params;
  const ticket = await Ticket.findById(id);
  if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });
  if (!canAccessTicket(user, ticket)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  const message = await TicketMessage.create({ ticketId: id, type: parsed.data.type, body: parsed.data.body, author: user.id, authorName: user.name, channel: "MANUAL", attachments: parsed.data.attachment ? [parsed.data.attachment] : [] });
  const update: any = { lastInteractionAt: new Date() };
  if (parsed.data.type === "OPERATOR_RESPONSE" && !ticket.firstResponseAt) update.firstResponseAt = new Date();
  const autoStarted = (ticket.status === "NEW" || ticket.status === "OPEN") && parsed.data.type === "OPERATOR_RESPONSE";
  if (autoStarted) update.status = "IN_PROGRESS";
  await Ticket.findByIdAndUpdate(id, update);
  if (autoStarted) await TicketMessage.create({ ticketId: id, type: "SYSTEM_EVENT", body: "Status: Yangi → Jarayonda", author: user.id, authorName: user.name });
  return NextResponse.json(message, { status: 201 });
}
