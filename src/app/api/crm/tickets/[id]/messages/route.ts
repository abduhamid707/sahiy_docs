/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { TicketMessage } from "@/models/TicketMessage";
import { CRM_MESSAGE_TYPES } from "@/lib/crm";
import { canAccessTicket } from "@/lib/support/access";
import { canMutateCrm, canSeeAllTickets } from "@/lib/support/permissions";
import { getAuthUser } from "@/lib/auth-helper";

const attachmentSchema = z.object({
  url: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.string().optional(),
  size: z.number().max(5 * 1024 * 1024).optional(),
});

const schema = z.object({
  type: z.enum(CRM_MESSAGE_TYPES),
  // Matnsiz screenshot/fayl yuborish ham ticket tarixida foydali bo'ladi.
  body: z.string().trim().max(10000).optional().default(""),
  attachment: attachmentSchema.optional(), // eski clientlar uchun
  attachments: z.array(attachmentSchema).max(10, "Ko'pi bilan 10 ta fayl biriktirish mumkin").optional(),
}).superRefine((data, ctx) => {
  if (!data.body && !data.attachment && !data.attachments?.length) {
    ctx.addIssue({ code: "custom", message: "Xabar yoki kamida bitta fayl yuboring", path: ["body"] });
  }
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
  if (["RESOLVED", "CLOSED"].includes(ticket.status)) {
    return NextResponse.json({ error: "Ticket yopilgan. Xabar yuborish uchun avval qayta oching" }, { status: 409 });
  }
  const assignedId = ticket.assignedTo?.toString();
  const isCollaborator = (ticket.collaborators || []).some((collaborator: any) => collaborator?.toString() === user.id);
  if (parsed.data.type !== "INTERNAL_NOTE" && assignedId !== user.id && !isCollaborator && !canSeeAllTickets(user)) {
    return NextResponse.json({ error: "Mijoz bilan faqat mas'ul operator ishlaydi" }, { status: 403 });
  }
  const attachments = parsed.data.attachments || (parsed.data.attachment ? [parsed.data.attachment] : []);
  const message = await TicketMessage.create({ ticketId: id, type: parsed.data.type, body: parsed.data.body || (attachments.length ? "Fayl biriktirildi" : ""), author: user.id, authorName: user.name, channel: "MANUAL", attachments });
  const update: any = { lastInteractionAt: new Date() };
  if (parsed.data.type === "OPERATOR_RESPONSE" && !ticket.firstResponseAt) update.firstResponseAt = new Date();
  const autoStarted = (ticket.status === "NEW" || ticket.status === "OPEN") && parsed.data.type === "OPERATOR_RESPONSE";
  if (autoStarted) update.status = "IN_PROGRESS";
  await Ticket.findByIdAndUpdate(id, update);
  if (autoStarted) await TicketMessage.create({ ticketId: id, type: "SYSTEM_EVENT", body: "Status: Yangi → Jarayonda", author: user.id, authorName: user.name });
  return NextResponse.json(message, { status: 201 });
}
