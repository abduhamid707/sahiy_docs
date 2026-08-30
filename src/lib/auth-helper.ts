/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { verifyMobileToken } from "@/lib/jwt";

export interface AuthenticatedUser {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: string;
  isLead?: boolean;
}

export async function getAuthUser(req?: Request): Promise<AuthenticatedUser | null> {
  // 1. Try NextAuth session (for Web CRM)
  try {
    const session = await auth();
    if (session?.user && (session.user as any).id) {
      const u = session.user as any;
      return {
        id: u.id,
        _id: u.id,
        name: u.name || "",
        email: u.email || "",
        role: u.role || "USER",
        isLead: Boolean(u.isLead),
      };
    }
  } catch (e) {
    // ignore
  }

  // 2. Try Bearer JWT token from Authorization header (for Mobile App)
  if (req) {
    const authHeader = req.headers.get("authorization") || req.headers.get("x-auth-token");
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (token) {
        // Verify signed JWT
        const payload = verifyMobileToken(token);
        if (payload && payload.id) {
          try {
            await dbConnect();
            const dbUser = (await User.findById(payload.id).lean()) as any;
            if (dbUser) {
              return {
                id: dbUser._id.toString(),
                _id: dbUser._id.toString(),
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role,
                isLead: Boolean(dbUser.isLead),
              };
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }
  }

  return null;
}
