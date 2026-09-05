import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Call from '@/models/Call';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { status } = await req.json();
    const { id } = await params;

    const call = await Call.findByIdAndUpdate(id, { status }, { new: true });
    
    if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });

    return NextResponse.json({ success: true, call });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}