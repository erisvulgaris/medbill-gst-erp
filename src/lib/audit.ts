import { db } from "@/lib/db";

export async function recordAudit(opts: {
  businessId: string;
  userId?: string | null;
  action: string; // create | update | delete | login | export | print | payment | cancel
  entity: string; // invoice | party | product | purchase | expense | payment | ...
  entityId?: string | null;
  summary?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        businessId: opts.businessId,
        userId: opts.userId ?? null,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId ?? null,
        summary: opts.summary ?? null,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
        ip: opts.ip ?? null,
      },
    });
  } catch {
    // Audit logging is non-blocking — never fail the operation because of it
  }
}
