/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { canSeeAllTickets } from "@/lib/support/permissions";
import { getCrmAnalytics } from "@/lib/support/analytics";

export async function GET() {
  const session = await auth(); const user = session?.user as any;
  if (!session || !canSeeAllTickets(user)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  await dbConnect(); return NextResponse.json(await getCrmAnalytics());
}
