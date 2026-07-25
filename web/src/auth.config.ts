import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe Auth config (no Prisma). Used by middleware.
 * Full config with adapter lives in `auth.ts`.
 */
export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      // Explicit OIDC issuer — avoids oauth4webapi "iss" validation errors
      issuer: "https://accounts.google.com",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
