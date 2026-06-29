import { PrismaClient } from '@prisma/client'

// Prisma query logging is dev-only — logging every query in production
// floods stdout, leaks PII (phone numbers in WHERE clauses), and adds I/O cost.
// See: DATABASE_AUDIT.md §2.1, PERFORMANCE_REPORT.md §7, ADR-002
const logConfig =
  process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error']

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logConfig,
  })

// Cache the client on globalThis to prevent multiple instances during HMR in dev.
// In production, the singleton is module-scoped.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
