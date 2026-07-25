import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      displayName: string;
      shortName: string;
      hue: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    displayName?: string;
    shortName?: string;
    hue?: number;
  }
}
