import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Neon's serverless driver needs a WebSocket implementation in Node.js.
// In Lambda/Edge environments with a global WebSocket this is a no-op,
// but for local Node dev we wire up the `ws` package explicitly.
if (!neonConfig.webSocketConstructor) {
  neonConfig.webSocketConstructor = ws;
}

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });
