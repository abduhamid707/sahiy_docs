import crypto from "crypto";

function getSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Mobile JWT uchun AUTH_SECRET yoki JWT_SECRET sozlanmagan");
  }

  return secret;
}

export interface MobileTokenPayload {
  id: string;
  email: string;
  role: string;
  isLead?: boolean;
  name?: string;
  iat?: number;
  exp?: number;
}

export function signMobileToken(payload: Omit<MobileTokenPayload, "iat" | "exp">): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const data = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + 30 * 24 * 60 * 60, // 30 days validity
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(`${header}.${data}`)
    .digest("base64url");

  return `${header}.${data}.${signature}`;
}

export function verifyMobileToken(token: string): MobileTokenPayload | null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.trim().split(".");
    if (parts.length !== 3) return null;

    const [header, data, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", getSecret())
      .update(`${header}.${data}`)
      .digest("base64url");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as MobileTokenPayload;

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expired
    }

    return payload;
  } catch (e) {
    return null;
  }
}
