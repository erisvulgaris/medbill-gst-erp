/**
 * Database Restore Utility
 *
 * Restores the SQLite database from a backup file.
 * Usage: bun run scripts/restore-db.ts <backup-file>
 *        bun run scripts/restore-db.ts db/backups/2026-06-29T12-00-00-000Z.db
 *
 * Safety: requires confirmation, creates a pre-restore backup.
 * See: docs/DATABASE_HEALTH_REPORT.md
 */
import { copyFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") || join(process.cwd(), "db/custom.db");
const BACKUP_DIR = join(process.cwd(), "db/backups");

async function main() {
  const backupArg = process.argv[2];
  if (!backupArg) {
    console.error("❌ Usage: bun run scripts/restore-db.ts <backup-file>");
    console.error("   Example: bun run scripts/restore-db.ts db/backups/2026-06-29T12-00-00-000Z.db");
    process.exit(1);
  }

  const backupPath = resolve(backupArg);
  if (!existsSync(backupPath)) {
    console.error(`❌ Backup file not found: ${backupPath}`);
    process.exit(1);
  }

  if (!existsSync(DB_PATH)) {
    console.error(`❌ Current database not found: ${DB_PATH}`);
    process.exit(1);
  }

  const backupStat = statSync(backupPath);
  const currentStat = statSync(DB_PATH);

  console.log("⚠️  RESTORE OPERATION");
  console.log(`   Current DB: ${DB_PATH} (${(currentStat.size / 1024).toFixed(1)} KB)`);
  console.log(`   Backup:     ${backupPath} (${(backupStat.size / 1024).toFixed(1)} KB)`);
  console.log(`   Backup date: ${backupStat.mtime.toISOString()}`);
  console.log("");
  console.log("⚠️  This will OVERWRITE the current database. A pre-restore backup will be created.");
  console.log("");

  const confirmed = await confirm("Type 'RESTORE' to proceed: ");
  if (confirmed !== "RESTORE") {
    console.log("❌ Restore cancelled.");
    process.exit(0);
  }

  // Pre-restore backup
  const preRestorePath = join(BACKUP_DIR, `pre-restore-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
  mkdirSync(BACKUP_DIR, { recursive: true });
  copyFileSync(DB_PATH, preRestorePath);
  console.log(`✅ Pre-restore backup: ${preRestorePath}`);

  // Restore
  copyFileSync(backupPath, DB_PATH);
  console.log(`✅ Database restored from: ${backupPath}`);
  console.log("   Restart the dev server for changes to take effect.");
}

function confirm(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

main();
