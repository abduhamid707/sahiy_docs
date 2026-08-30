import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:3000",
  "http://localhost:3006",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8082",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3006",
  "https://docs.logistic.org.uz",
  "https://crm.logistic.org.uz",
];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (
    process.env.NODE_ENV !== "production" &&
    (origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      origin.startsWith("http://192.168.") ||
      origin.startsWith("http://10.0."))
  ) {
    return true;
  }
  return false;
}

const authHandler = NextAuth(authConfig).auth;

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const allowed = isOriginAllowed(origin);
  const isCorsApi = pathname.startsWith("/api/crm/") || pathname === "/api/admin/users";

  // Employee avatars are public presentation assets. Keeping this narrowly
  // scoped avoids sending mobile Image requests to the HTML login page while
  // every other uploaded/private document remains protected.
  if (pathname.startsWith("/uploads/avatars/")) {
    return NextResponse.next();
  }

  // Mobile CRM/Expo Web uchun CORS. Native so'rovlarda Origin bo'lmaydi.
  if (isCorsApi) {
    if (origin && !allowed) {
      return NextResponse.json({ error: "Origin ruxsat etilmagan" }, { status: 403 });
    }

    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      if (origin) response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-auth-token, Accept, X-Requested-With"
      );
      response.headers.set("Access-Control-Max-Age", "86400");
      response.headers.set("Vary", "Origin");
      return response;
    }

    const response = NextResponse.next();
    if (origin) response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-auth-token, Accept, X-Requested-With"
    );
    response.headers.set("Vary", "Origin");
    return response;
  }

  if (pathname.startsWith("/api/")) return NextResponse.next();

  // Non-API routes pass to NextAuth authHandler
  return (authHandler as any)(request);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|firebase-messaging-sw.js).*)",
  ],
};
