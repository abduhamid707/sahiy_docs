import crypto from "crypto";

// Zadarma API hujjatlariga asoslangan (https://zadarma.com/en/support/api/):
// - Webhook imzosi: base64(hmac_sha1(signatureString, secret)) - "Signature" headerida keladi.
//   signatureString NOTIFY_START/NOTIFY_END uchun: caller_id + called_did + call_start
//   signatureString NOTIFY_RECORD uchun: pbx_call_id + call_id_with_rec
// - Chiquvchi so'rovlar uchun Authorization headeri: "{key}:{signature}"
//   signature = base64(hmac_sha1(method + paramsString + md5(paramsString), secret))
//   paramsString - kalitlar alifbo tartibida saralangan, PHP http_build_query uslubida.

function encodeSignature(data: string, secret: string) {
  return crypto.createHmac("sha1", secret).update(data).digest("base64");
}

export function verifyZadarmaSignature(signatureHeader: string | null, signatureString: string) {
  const secret = process.env.ZADARMA_API_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = Buffer.from(encodeSignature(signatureString, secret));
  const received = Buffer.from(signatureHeader);
  // timingSafeEqual throws on length mismatch instead of returning false, so guard it first.
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(received, expected);
}

// PHP http_build_query bilan mos: bo'sh joy "+" bilan kodlanadi (encodeURIComponent %20 beradi).
function phpStyleEncode(value: string) {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

function buildParamsString(params: Record<string, string>) {
  const sortedKeys = Object.keys(params).sort();
  return sortedKeys.map((k) => `${phpStyleEncode(k)}=${phpStyleEncode(params[k])}`).join("&");
}

async function callZadarmaApi(method: string, params: Record<string, string> = {}) {
  const key = process.env.ZADARMA_API_KEY;
  const secret = process.env.ZADARMA_API_SECRET;
  if (!key || !secret) throw new Error("ZADARMA_API_KEY yoki ZADARMA_API_SECRET sozlanmagan");

  const paramsString = buildParamsString(params);
  const signature = encodeSignature(method + paramsString + crypto.createHash("md5").update(paramsString).digest("hex"), secret);

  const url = `https://api.zadarma.com${method}${paramsString ? `?${paramsString}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `${key}:${signature}` },
  });

  const data = await res.json();
  if (!res.ok || data.status !== "success") {
    throw new Error(`Zadarma API xatoligi: ${JSON.stringify(data)}`);
  }
  return data;
}

// Qo'ng'iroq yozuvining haqiqiy yuklab olish linkini so'raydi.
// NOTIFY_END/NOTIFY_RECORD webhooklari faqat ID beradi - haqiqiy link uchun alohida so'rov kerak.
export async function fetchZadarmaRecordingLink(pbxCallId: string, callId?: string) {
  const params: Record<string, string> = { pbx_call_id: pbxCallId };
  if (callId) params.call_id = callId;

  const data = await callZadarmaApi("/v1/pbx/record/request/", params);
  return data.link as string | undefined;
}
