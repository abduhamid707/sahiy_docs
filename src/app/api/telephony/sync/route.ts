import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { telecomService } from '@/services/telecom.service';
import Call from '@/models/Call';
import { Ticket } from '@/models/Ticket';

let lastSyncTime = 0;

export async function POST(req: Request) {
  try {
    const requestTime = Date.now();
    if (requestTime - lastSyncTime < 30000) {
      // 30 soniyalik limit (Uztelecom ga ortiqcha zapros bormasligi uchun)
      return NextResponse.json({ success: true, message: "Yaqindagina sinxronizatsiya qilingan." });
    }
    lastSyncTime = requestTime;

    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const period = searchParams.get('period');

    const now = new Date();
    let startD = new Date();
    let endD = new Date();

    if (period === 'today') {
      startD.setHours(0, 0, 0, 0);
    } else if (period === 'yesterday') {
      startD.setDate(startD.getDate() - 1);
      startD.setHours(0, 0, 0, 0);
      endD = new Date(startD);
      endD.setHours(23, 59, 59, 999);
    } else if (period === '3days') {
      startD.setDate(startD.getDate() - 2);
      startD.setHours(0, 0, 0, 0);
    } else if (period === '7days') {
      startD.setDate(startD.getDate() - 6);
      startD.setHours(0, 0, 0, 0);
    } else if (period === '30days') {
      startD.setDate(startD.getDate() - 29);
      startD.setHours(0, 0, 0, 0);
    } else {
      // default: last 48 hours
      startD = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    }
    
    // Format to YYYY-MM-DD HH:mm:ss
    const formatStr = (d: Date) => {
      // O'zbekiston vaqti (UTC+5) bo'yicha to'g'rilash
      const localD = new Date(d.getTime() + 5 * 60 * 60 * 1000);
      return localD.toISOString().replace('T', ' ').substring(0, 19);
    };
    
    const startDate = startDateParam || formatStr(startD);
    const endDate = endDateParam || formatStr(endD);

    const calls = await telecomService.getSyncCalls(startDate, endDate);
    
    let added = 0;
    let autoLinked = 0;

    for (const callData of calls) {
      const existing = await Call.findOne({ providerCallId: callData.callId });
      if (existing) continue;

      let linkedTicketId = null;

      // Extract last 9 digits of phone to match both '909984747' and '998909984747'
      if (callData.clientPhone) {
        const phoneDigits = callData.clientPhone.replace(/\D/g, '');
        const last9 = phoneDigits.slice(-9);

        if (last9.length === 9) {
          // Find an OPEN/ACTIVE ticket with this phone number
          const openTicket = await Ticket.findOne({
            callerPhone: { $regex: new RegExp(last9 + '$') },
            status: { $in: ['OPEN', 'NEW', 'IN_PROGRESS', 'WAITING'] }
          }).sort({ createdAt: -1 });

          if (openTicket) {
            linkedTicketId = openTicket._id;
            autoLinked++;
          }
        }
      }

      await Call.create({
        providerCallId: callData.callId,
        phone: callData.clientPhone,
        ticketId: linkedTicketId,
        operator: callData.operatorNumber,
        startedAt: callData.startTime,
        duration: callData.talkDuration,
        totalDuration: callData.totalDuration,
        audioUrl: callData.audioUrl,
        status: callData.status,
        direction: callData.direction || 'inbound'
      });
      added++;
    }

    return NextResponse.json({ success: true, processed: calls.length, added, autoLinked, startDate, endDate });

  } catch (error: any) {
    console.error('Telephony Sync Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
