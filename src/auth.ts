import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { authConfig } from "./auth.config";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      async authorize(credentials) {
        try {
          const email =
            typeof credentials?.email === "string"
              ? credentials.email.trim().toLowerCase()
              : "";
          const password =
            typeof credentials?.password === "string"
              ? credentials.password.trim()
              : "";

          if (!email || !password) return null;

          await dbConnect();
          const user = await User.findOne({ email });
        
          if (user) {
            let isMatch = false;
            try {
              // Only try bcrypt if the stored password looks like a hash
              if (user.password.startsWith('$2')) {
                isMatch = await bcrypt.compare(password, user.password);
              }
            } catch (err) {
              console.error("Bcrypt compare error:", err);
            }
            
            if (isMatch || password === user.password) {
              return {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                isLead: user.isLead,
              };
            }
          }
          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
});
