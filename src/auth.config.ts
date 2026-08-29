/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [], // Providers are added in auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.isLead = (user as any).isLead;
      }
      if (!token.id && token.sub) {
        token.id = token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).isLead = token.isLead;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname === "/login";
      const isAdminPage = nextUrl.pathname.startsWith("/admin");
      const role = (auth?.user as any)?.role;

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/crm", nextUrl));
        }
        return true;
      }

      const isDocsAdmin = nextUrl.pathname.startsWith("/admin/docs");
      const isSupportPage = nextUrl.pathname.startsWith("/support") || nextUrl.pathname.startsWith("/crm");

      if (!isLoggedIn) {
        return false; // Redirect to login
      }

      if (isSupportPage) {
        const user = auth?.user as any;
        if (role === "SUPPORT" || role === "SUPER_ADMIN" || role === "ADMIN" || user?.isLead) {
          return true;
        }
        return Response.redirect(new URL("/", nextUrl));
      }

      if (isAdminPage) {
        const user = auth?.user as any;
        const isLead = user?.isLead;

        // Super admins and admins have full access
        if (role === "SUPER_ADMIN" || role === "ADMIN") return true;

        // Leads have access to users, projects, and docs
        if (isLead && (
          nextUrl.pathname === "/admin" ||
          nextUrl.pathname.startsWith("/admin/users") ||
          nextUrl.pathname.startsWith("/admin/projects") ||
          nextUrl.pathname.startsWith("/admin/docs")
        )) {
          return true;
        }

        // Developers (MOBILE, FRONTEND) can only access documentation management
        if (isDocsAdmin && (role === "MOBILE" || role === "FRONTEND")) {
          return true;
        }

        return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
