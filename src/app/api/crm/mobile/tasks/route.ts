import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { TicketTask } from "@/models/TicketTask";
import { getAuthUser } from "@/lib/auth-helper";
import { canUseCrm } from "@/lib/support/access";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Sessiya yaroqsiz" }, { status: 401 });
    }
    if (!canUseCrm(user)) {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("status") || searchParams.get("filter") || "ALL";
    const sort = searchParams.get("sort") || "OLDEST";

    const query: any = {};
    const now = new Date();

    if (filter === "PENDING_APPROVAL") {
      query.status = "PENDING_APPROVAL";
    } else if (filter === "OVERDUE") {
      query.status = { $in: ["TODO", "IN_PROGRESS", "PENDING_APPROVAL"] };
      query.deadlineAt = { $lt: now };
    } else if (filter === "CRITICAL") {
      query.status = { $nin: ["DONE", "CANCELLED"] };
      query.priority = "CRITICAL";
    } else if (filter === "ACTIVE") {
      query.status = { $nin: ["DONE", "CANCELLED"] };
    } else if (filter && filter !== "ALL") {
      query.status = filter;
    }

    let sortOptions: any = { createdAt: 1 };
    if (sort === "OLDEST") {
      sortOptions = { submittedAt: 1, createdAt: 1 };
    } else if (sort === "SLA_NEAREST") {
      sortOptions = { deadlineAt: 1 };
    } else if (sort === "CRITICAL") {
      sortOptions = { priority: -1, deadlineAt: 1 };
    }

    const tasks = await TicketTask.find(query)
      .populate(
        "ticketId",
        "ticketNumber callerName callerPhone orderId category problem priority status"
      )
      .populate("assignedTo", "name email image")
      .populate("createdBy", "name")
      .populate("reviewedBy", "name")
      .sort(sortOptions)
      .limit(100)
      .lean();

    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error("Tasks error:", error);
    return NextResponse.json(
      { error: "Tasklarni yuklashda xatolik" },
      { status: 500 }
    );
  }
}
