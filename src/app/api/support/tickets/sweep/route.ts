import { NextResponse } from "next/server";
import { runReminderSweep } from "@/lib/support/reminderSweep";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret") || req.headers.get("x-sweep-secret");

  if (secret !== process.env.SWEEP_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await runReminderSweep();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Sweep error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
