/**
 * Database Backup Utility
 *
 * Copies the SQLite database file to db/backups/{timestamp}.db
 * Usage: bun run scripts/backup-db.ts
 *
 * See: docs/DATABASE_HEALTH_REPORT.md, docs/03_DATABASE_SPECIFICATION.md
 */
import { copyFileSync, mkdirSync, existsSync, statSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") || join(process.cwd(), "db/custom.db");
const BACKUP_DIR = join(process.cwd(), "db/backups");

function main() {
  if (!existsSync(DB_PATH)) {
    console.error(`❌ Database file not found: ${DB_PATH}`);
    process.exit(1);
  }

  mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(BACKUP_DIR, `${timestamp}.db`);

  const sourceStat = statSync(DB_PATH);
  copyFileSync(DB_PATH, backupPath);

  console.log(`✅ Backup created: ${backupPath}`);
  console.log(`   Source: ${DB_PATH} (${(sourceStat.size / 1024).toFixed(1)} KB)`);
  console.log(`   Timestamp: ${timestamp}`);

  // Keep only last 30 backups
  const backups = readdirSync(BACKUP_DIR)
    .filter((f: string) => f.endsWith(".db"))
    .map((f: string) => ({ name: f, path: join(BACKUP_DIR, f), mtime: statSync(join(BACKUP_DIR, f)).mtime }))
    .sort((a: any, b: any) => b.mtime.getTime() - a.mtime.getTime());

  const MAX_BACKUPS = 30;
  if (backups.length > MAX_BACKUPS) {
    const toDelete = backups.slice(MAX_BACKUPS);
    for (const b of toDelete) {
      unlinkSync(b.path);
      console.log(`   🗑️  Pruned old backup: ${b.name}`);
    }
  }
}

main();
