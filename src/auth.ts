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
          await dbConnect();
          const user = await User.findOne({ email: credentials?.email });
        
          if (user && credentials?.password) {
            let isMatch = false;
            try {
              // Only try bcrypt if the stored password looks like a hash
              if (user.password.startsWith('$2')) {
                isMatch = await bcrypt.compare(credentials.password as string, user.password);
              }
            } catch (err) {
              console.error("Bcrypt compare error:", err);
            }
            
            if (isMatch || credentials.password === user.password) {
              return {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
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
