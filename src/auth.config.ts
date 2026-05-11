import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [], // Providers are added in auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
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
          if (role === "SUPER_ADMIN" || role === "ADMIN") {
            return Response.redirect(new URL("/admin", nextUrl));
          }
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      const isDocsAdmin = nextUrl.pathname.startsWith("/admin/docs");

      if (!isLoggedIn) {
        return false; // Redirect to login
      }

      if (isAdminPage) {
        // Super admins and admins have full access
        if (role === "SUPER_ADMIN" || role === "ADMIN") return true;

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
