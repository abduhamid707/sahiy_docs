import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { auth } from "@/auth";
import { recordLog } from "@/lib/logs";
import { canSeeAllTickets, canClaimTicket } from "@/lib/support/permissions";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!session || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const ticket = await Ticket.findById(id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });

    const isOwner = ticket.assignedTo?._id?.toString() === user.id;
    if (!canSeeAllTickets(user) && !isOwner && !canClaimTicket(user, ticket)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(ticket);
  } catch (error: any) {
    console.error("Fetch ticket error:", error);
    return NextResponse.json({ error: "Ticketni yuklashda xatolik yuz berdi" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!session || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const ticket = await Ticket.findById(id);
    if (!ticket) return NextResponse.json({ error: "Ticket topilmadi" }, { status: 404 });

    const isOwner = ticket.assignedTo?.toString() === user.id;
    if (!canSeeAllTickets(user) && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { problem, notes, deadlineAt, status, resolutionNote, recordingUrl } = body;

    const updateData: any = {};
    if (problem !== undefined) updateData.problem = problem;
    if (notes !== undefined) updateData.notes = notes;
    if (deadlineAt !== undefined) updateData.deadlineAt = new Date(deadlineAt);
    if (recordingUrl !== undefined) {
      updateData.recording = { url: recordingUrl, source: "MANUAL", addedAt: new Date() };
    }

    let action = "UPDATE";
    if (status === "RESOLVED" && ticket.status !== "RESOLVED") {
      updateData.status = "RESOLVED";
      updateData.resolvedAt = new Date();
      updateData.resolutionNote = resolutionNote;
      action = "RESOLVE";
    } else if (status === "OPEN" && ticket.status !== "OPEN") {
      updateData.status = "OPEN";
      updateData.resolvedAt = null;
      action = "UPDATE";
    }

    const updated = await Ticket.findByIdAndUpdate(id, updateData, { new: true })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    await recordLog(action, "TICKET", id, { problem: updated.problem });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update ticket error:", error);
    return NextResponse.json({ error: "Ticketni yangilashda xatolik yuz berdi" }, { status: 500 });
  }
}
