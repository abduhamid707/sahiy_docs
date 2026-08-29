/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { canUseCrm } from "@/lib/support/access";
import { CrmNotification } from "@/models/CrmNotification";

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
  await dbConnect();
  const notifications = await CrmNotification.find({ userId: user.id }).sort({ createdAt: -1 }).limit(50).lean();
  return NextResponse.json({ notifications, unread: notifications.filter((item: any) => !item.readAt).length });
}

const patchSchema = z.object({ id: z.string().optional(), all: z.boolean().optional() });

export async function PATCH(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success || (!parsed.data.id && !parsed.data.all)) return NextResponse.json({ error: "Notification tanlanmagan" }, { status: 400 });
  await dbConnect();
  const filter = parsed.data.all ? { userId: user.id, readAt: null } : { _id: parsed.data.id, userId: user.id };
  await CrmNotification.updateMany(filter, { $set: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
