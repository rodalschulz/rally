import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Neon scale-to-zero can take >5s to accept TCP; Prisma's default is too tight. */
function databaseUrlWithConnectTimeout() {
  const url = process.env.DATABASE_URL;
  if (!url || /[?&]connect_timeout=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connect_timeout=15`;
}

function createPrismaClient() {
  const url = databaseUrlWithConnectTimeout();
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
}

function getClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/** Lazy proxy so importing modules during build does not require a live DB. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
