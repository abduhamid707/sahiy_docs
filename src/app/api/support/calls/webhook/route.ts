import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Ticket } from "@/models/Ticket";
import { verifyZadarmaSignature, fetchZadarmaRecordingLink } from "@/lib/pbx/zadarma";

const DEFAULT_DEADLINE_HOURS = 24;
const PLACEHOLDER_PROBLEM = "Qo'ng'iroq yakunlandi - xodim tomonidan muammo hali yozilmagan.";

// Zadarma PBX webhook qabul qiluvchi endpoint.
// Zadarma shaxsiy kabinet > Sozlamalar > API va integratsiyalar bo'limida
// ushbu URL manzilni "Webhooks" qatoriga kiritish va NOTIFY_START, NOTIFY_END,
// NOTIFY_RECORD hodisalarini yoqish kerak. Hujjat: https://zadarma.com/en/support/api/
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const event = formData.get("event")?.toString();
    const signatureHeader = req.headers.get("signature");

    if (!event) {
      return NextResponse.json({ error: "event maydoni yo'q" }, { status: 400 });
    }

    await dbConnect();

    if (event === "NOTIFY_START") {
      const pbxCallId = formData.get("pbx_call_id")?.toString();
      const callerId = formData.get("caller_id")?.toString();
      const calledDid = formData.get("called_did")?.toString();
      const callStart = formData.get("call_start")?.toString();

      if (!pbxCallId || !callerId || !calledDid || !callStart) {
        return NextResponse.json({ error: "Majburiy maydonlar yo'q" }, { status: 400 });
      }

      if (!verifyZadarmaSignature(signatureHeader, callerId + calledDid + callStart)) {
        return NextResponse.json({ error: "Imzo noto'g'ri" }, { status: 401 });
      }

      const existing = await Ticket.findOne({ externalCallId: pbxCallId });
      if (!existing) {
        await Ticket.create({
          callerPhone: callerId,
          problem: PLACEHOLDER_PROBLEM,
          deadlineAt: new Date(Date.now() + DEFAULT_DEADLINE_HOURS * 60 * 60 * 1000),
          origin: "PBX_WEBHOOK",
          externalCallId: pbxCallId,
          callStartedAt: new Date(callStart),
        });
      }
    } else if (event === "NOTIFY_END") {
      const pbxCallId = formData.get("pbx_call_id")?.toString();
      const callerId = formData.get("caller_id")?.toString();
      const calledDid = formData.get("called_did")?.toString();
      const callStart = formData.get("call_start")?.toString();
      const isRecorded = formData.get("is_recorded")?.toString() === "1";
      const callIdWithRec = formData.get("call_id_with_rec")?.toString();

      if (!pbxCallId || !callerId || !calledDid || !callStart) {
        return NextResponse.json({ error: "Majburiy maydonlar yo'q" }, { status: 400 });
      }

      if (!verifyZadarmaSignature(signatureHeader, callerId + calledDid + callStart)) {
        return NextResponse.json({ error: "Imzo noto'g'ri" }, { status: 401 });
      }

      const ticket = await Ticket.findOne({ externalCallId: pbxCallId });
      if (ticket) {
        ticket.callEndedAt = new Date();
        if (isRecorded && callIdWithRec) {
          ticket.recording = { source: "WEBHOOK", addedAt: new Date() };
          // Yozuv odatda qo'ng'iroq tugagach darrov tayyor bo'lmasligi mumkin - shu bois
          // urinib ko'ramiz, muvaffaqiyatsiz bo'lsa NOTIFY_RECORD hodisasi keyinroq yakunlaydi.
          try {
            const link = await fetchZadarmaRecordingLink(pbxCallId, callIdWithRec);
            if (link) ticket.recording.url = link;
          } catch (err) {
            console.error("Zadarma recording link (NOTIFY_END) olishda xatolik:", err);
          }
        }
        await ticket.save();
      }
    } else if (event === "NOTIFY_RECORD") {
      const pbxCallId = formData.get("pbx_call_id")?.toString();
      const callIdWithRec = formData.get("call_id_with_rec")?.toString();

      if (!pbxCallId || !callIdWithRec) {
        return NextResponse.json({ error: "Majburiy maydonlar yo'q" }, { status: 400 });
      }

      if (!verifyZadarmaSignature(signatureHeader, pbxCallId + callIdWithRec)) {
        return NextResponse.json({ error: "Imzo noto'g'ri" }, { status: 401 });
      }

      const ticket = await Ticket.findOne({ externalCallId: pbxCallId });
      if (ticket) {
        try {
          const link = await fetchZadarmaRecordingLink(pbxCallId, callIdWithRec);
          if (link) {
            ticket.recording = { url: link, source: "WEBHOOK", addedAt: new Date() };
            await ticket.save();
          }
        } catch (err) {
          console.error("Zadarma recording link (NOTIFY_RECORD) olishda xatolik:", err);
        }
      }
    }
    // Boshqa hodisalar (NOTIFY_OUT_START, NOTIFY_IVR va h.k.) - e'tiborsiz qoldiriladi.

    return new NextResponse("ok");
  } catch (error: any) {
    console.error("PBX webhook error:", error);
    return NextResponse.json({ error: "Ichki xatolik" }, { status: 500 });
  }
}
