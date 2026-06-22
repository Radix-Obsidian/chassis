// db.ts — the single Prisma client. Next.js hot-reloads modules in dev, which would otherwise open a
// new connection pool on every reload; the global singleton prevents that. Production gets one client.
//
// Kept out of the dependency-free unit-test path on purpose: only DB-bound modules import this, so the
// pure libs (auth-tokens, carrier-view) still test with no @prisma/client installed.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
