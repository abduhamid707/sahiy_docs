import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { auth } from "@/auth";
import { recordLog } from "@/lib/logs";
import { canSeeAllTickets } from "@/lib/support/permissions";
import { getTicketTier } from "@/lib/ticketStatus";
import { notifyTicketAssigned } from "@/lib/support/notifications";

const SUPPORT_ROLES = ["SUPPORT", "SUPER_ADMIN", "ADMIN"];

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!session || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // legacy support API
    const tier = searchParams.get("tier"); // OPEN | WARNING | OVERDUE | RESOLVED

    // SUPPORT xodimi o'z tiketlari + hali hech kimga biriktirilmagan (navbatdagi) tiketlarni ko'radi,
    // shunda PBX qo'ng'irovidan kelgan yangi murojaatlarni o'ziga olishi (claim) mumkin.
    const query: any = canSeeAllTickets(user)
      ? {}
      : { $or: [{ assignedTo: user.id }, { assignedTo: { $exists: false } }] };
    if (status === "OPEN") query.status = { $nin: ["RESOLVED", "CLOSED"] };
    else if (status) query.status = status;

    let tickets = await Ticket.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ deadlineAt: 1 });

    if (tier) {
      tickets = tickets.filter((t: any) => getTicketTier(t) === tier);
    }

    return NextResponse.json(tickets);
  } catch (error: any) {
    console.error("Fetch tickets error:", error);
    return NextResponse.json({ error: "Tiketlarni yuklashda xatolik yuz berdi" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !user || !SUPPORT_ROLES.includes(user.role) && !user.isLead) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { callerName, callerPhone, problem, notes, deadlineAt, assignedTo, recordingUrl } = body;

    if (!callerPhone || !problem || !deadlineAt) {
      return NextResponse.json({ error: "Telefon raqami, muammo va muddat kiritilishi shart" }, { status: 400 });
    }

    const finalAssignedTo = canSeeAllTickets(user) && assignedTo ? assignedTo : user.id;

    const ticket = await Ticket.create({
      callerName,
      callerPhone,
      problem,
      notes,
      deadlineAt: new Date(deadlineAt),
      assignedTo: finalAssignedTo,
      createdBy: user.id,
      origin: "MANUAL",
      recording: recordingUrl ? { url: recordingUrl, source: "MANUAL", addedAt: new Date() } : undefined,
    });

    await recordLog("CREATE", "TICKET", ticket._id.toString(), { problem: ticket.problem, assignedTo: finalAssignedTo });

    if (finalAssignedTo !== user.id) {
      await notifyTicketAssigned(finalAssignedTo, ticket.problem, ticket.deadlineAt);
    }

    return NextResponse.json(ticket, { status: 201 });
  } catch (error: any) {
    console.error("Create ticket error:", error);
    return NextResponse.json({ error: "Ticket yaratishda xatolik yuz berdi" }, { status: 500 });
  }
}
