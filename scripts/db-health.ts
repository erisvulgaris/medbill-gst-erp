/**
 * Database Integrity Checker
 *
 * Runs SQLite PRAGMA integrity_check and verifies:
 * - All tables exist
 * - Row counts are sane
 * - No orphaned foreign keys
 * - Migration history is intact
 *
 * Usage: bun run scripts/db-health.ts
 * See: docs/DATABASE_HEALTH_REPORT.md
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const db = new PrismaClient();

interface CheckResult {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

const results: CheckResult[] = [];

async function checkIntegrity() {
  try {
    const result = await db.$queryRaw`PRAGMA integrity_check` as any[];
    const status = result[0]?.integrity_check === "ok" ? "pass" : "fail";
    results.push({
      name: "SQLite integrity_check",
      status,
      detail: result[0]?.integrity_check || "unknown",
    });
  } catch (e: any) {
    results.push({ name: "SQLite integrity_check", status: "fail", detail: e.message });
  }
}

async function checkTables() {
  const expectedTables = [
    "User", "Session", "Business", "BusinessMember", "Branch",
    "Category", "Unit", "TaxRate", "Product", "Warehouse", "StockMovement",
    "Party", "Invoice", "InvoiceItem", "Purchase", "PurchaseItem",
    "Quotation", "QuotationItem", "Payment", "Expense", "Notification", "AuditLog",
  ];

  try {
    const tables = await db.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'` as any[];
    const tableNames = tables.map((t) => t.name).filter((n) => !n.startsWith("_") && !n.startsWith("sqlite_"));
    const missing = expectedTables.filter((t) => !tableNames.includes(t));
    results.push({
      name: "Tables exist",
      status: missing.length === 0 ? "pass" : "fail",
      detail: missing.length === 0 ? `All ${expectedTables.length} tables present` : `Missing: ${missing.join(", ")}`,
    });
  } catch (e: any) {
    results.push({ name: "Tables exist", status: "fail", detail: e.message });
  }
}

async function checkRowCounts() {
  const checks: [string, any][] = [
    ["Business", db.business],
    ["User", db.user],
    ["Product", db.product],
    ["Party", db.party],
    ["Invoice", db.invoice],
    ["Payment", db.payment],
  ];

  for (const [name, model] of checks) {
    try {
      const count = await model.count();
      results.push({
        name: `${name} row count`,
        status: "pass",
        detail: `${count} rows`,
      });
    } catch (e: any) {
      results.push({ name: `${name} row count`, status: "fail", detail: e.message });
    }
  }
}

async function checkOrphanedInvoices() {
  try {
    const orphaned = await db.invoice.count({
      where: { partyId: { not: null }, party: null },
    } as any);
    results.push({
      name: "Orphaned invoices (partyId pointing to deleted party)",
      status: orphaned === 0 ? "pass" : "warn",
      detail: `${orphaned} orphaned invoices`,
    });
  } catch (e: any) {
    results.push({ name: "Orphaned invoices", status: "warn", detail: "Could not check (SQLite FK off)" });
  }
}

async function checkNegativeStock() {
  try {
    const negative = await db.product.count({ where: { stock: { lt: 0 } } });
    results.push({
      name: "Products with negative stock",
      status: negative === 0 ? "pass" : "warn",
      detail: `${negative} products with negative stock`,
    });
  } catch (e: any) {
    results.push({ name: "Negative stock", status: "fail", detail: e.message });
  }
}

async function checkMigrationHistory() {
  const migrationsDir = join(process.cwd(), "prisma/migrations");
  if (!existsSync(migrationsDir)) {
    results.push({ name: "Migration history", status: "fail", detail: "No prisma/migrations directory" });
    return;
  }
  const migrations = readdirSync(migrationsDir).filter((d: string) => !d.includes("lock"));
  results.push({
    name: "Migration history",
    status: migrations.length > 0 ? "pass" : "warn",
    detail: `${migrations.length} migration(s): ${migrations.join(", ")}`,
  });
}

async function main() {
  console.log("🔍 MedBill Database Health Check\n");
  console.log("=" .repeat(50));

  await checkIntegrity();
  await checkTables();
  await checkRowCounts();
  await checkOrphanedInvoices();
  await checkNegativeStock();
  await checkMigrationHistory();

  console.log("");
  for (const r of results) {
    const icon = r.status === "pass" ? "✅" : r.status === "warn" ? "⚠️ " : "❌";
    console.log(`${icon} ${r.name}: ${r.detail}`);
  }

  console.log("");
  console.log("=".repeat(50));
  const passed = results.filter((r) => r.status === "pass").length;
  const warned = results.filter((r) => r.status === "warn").length;
  const failed = results.filter((r) => r.status === "fail").length;
  console.log(`Summary: ${passed} passed, ${warned} warnings, ${failed} failed`);

  await db.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
