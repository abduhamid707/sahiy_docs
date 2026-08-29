/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { canUseCrm } from "@/lib/support/access";
import { User } from "@/models/User";

const schema = z.object({ token: z.string().min(20) });

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!canUseCrm(user)) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "FCM token noto‘g‘ri" }, { status: 400 });
  await dbConnect();
  await User.updateOne({ _id: user.id }, { $addToSet: { fcmTokens: parsed.data.token } });
  return NextResponse.json({ ok: true });
}
