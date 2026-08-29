import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { auth } from "@/auth";
import { recordLog } from "@/lib/logs";
import { canReassignTickets, canClaimTicket } from "@/lib/support/permissions";
import { notifyTicketAssigned } from "@/lib/support/notifications";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!session || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const body = await req.json();
    const { assignedTo } = body;
    if (!assignedTo) {
      return NextResponse.json({ error: "Yangi xodim tanlanishi shart" }, { status: 400 });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });

    // Admin/lead istalgan tiketni qayta biriktirishi mumkin; SUPPORT xodimi esa
    // faqat navbatdagi (hali hech kimga biriktirilmagan) tiketni o'ziga olishi (claim) mumkin.
    const isSelfClaim = canClaimTicket(user, ticket) && assignedTo === user.id;
    if (!canReassignTickets(user) && !isSelfClaim) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const previousAssignee = ticket.assignedTo?.toString();

    const updated = await Ticket.findByIdAndUpdate(
      id,
      { assignedTo, lastReminderLevel: "NONE", lastReminderAt: null },
      { new: true }
    )
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    await recordLog("REASSIGN", "TICKET", id, { from: previousAssignee, to: assignedTo });

    if (assignedTo !== previousAssignee) {
      await notifyTicketAssigned(assignedTo, updated.problem, updated.deadlineAt);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Reassign ticket error:", error);
    return NextResponse.json({ error: "Qayta biriktirishda xatolik yuz berdi" }, { status: 500 });
  }
}
