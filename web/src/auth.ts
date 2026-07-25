import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { deriveShortName, hueFromString } from "@/lib/user-profile";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  // JWT so middleware can run on Edge without Prisma
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.sub = user.id;
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        token.displayName =
          dbUser?.displayName || user.name || user.email?.split("@")[0] || "Jugador";
        token.shortName =
          dbUser?.shortName || deriveShortName(String(token.displayName));
        token.hue =
          dbUser?.hue ?? hueFromString(user.email ?? user.id ?? "user");
      }
      if (trigger === "update" && token.sub) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.sub } });
        if (dbUser) {
          token.displayName =
            dbUser.displayName || dbUser.name || "Jugador";
          token.shortName =
            dbUser.shortName || deriveShortName(String(token.displayName));
          token.hue = dbUser.hue;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.displayName = String(token.displayName ?? "Jugador");
        session.user.shortName = String(token.shortName ?? "J");
        session.user.hue = Number(token.hue ?? 160);
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const displayName =
        user.name?.trim() || user.email?.split("@")[0] || "Jugador";
      const shortName = deriveShortName(displayName);
      const hue = hueFromString(user.email ?? user.id ?? "user");
      await prisma.user.update({
        where: { id: user.id },
        data: { displayName, shortName, hue },
      });
    },
  },
});
