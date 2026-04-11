import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// @neondatabase/serverless requires an explicit WebSocket constructor in Node.js
// environments. Node.js 24's native globalThis.WebSocket is not fully compatible
// with the Neon binary protocol — the ws package is the recommended implementation.
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : [],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
