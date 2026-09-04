import { open } from "node:fs/promises";
import { basename, extname } from "node:path";

const ARCHIVE_EXT = new Set([
  ".zip",
  ".7z",
  ".rar",
  ".tar",
  ".tgz",
  ".gz",
  ".bz2",
  ".xz",
  ".zst",
  ".lz4",
  ".iso",
  ".war",
  ".jar",
  ".whl",
]);

const DB_EXT = new Set([
  ".sqlite",
  ".sqlite3",
  ".db",
  ".db3",
  ".sdb",
  ".sql",
  ".dump",
  ".pgdump",
  ".pgsql",
  ".rdb",
  ".mdb",
  ".accdb",
  ".fdb",
  ".bak",
]);

const DB_DIRS = /^(pgdata|postgres|postgresql|mysql|mariadb|mongodb|mongo|redis|sqlite)$/i;

export async function classify(path, type) {
  if (type === "dir") {
    return DB_DIRS.test(basename(path)) ? "database" : "dir";
  }
  const name = basename(path).toLowerCase();
  if (name.endsWith(".tar.gz") || name.endsWith(".tgz") || name.endsWith(".tar.bz2") || name.endsWith(".tar.xz")) {
    return "archive";
  }
  if (name.endsWith(".sql.gz") || name.endsWith(".dump.gz") || name.endsWith(".sql.zst") || name.endsWith(".sql.xz")) {
    return "database";
  }
  const head = await readHead(path);
  if (head.startsWith("SQLite format 3")) return "database";
  if (head.startsWith("PK")) return "archive";
  const ext = extname(name);
  if (DB_EXT.has(ext)) return "database";
  if (ARCHIVE_EXT.has(ext)) return "archive";
  return "file";
}

export function isSqliteFile(path, kind, head) {
  if (head?.startsWith("SQLite format 3")) return true;
  if (kind !== "database") return false;
  return isSqliteName(path);
}

export function isSqliteName(path) {
  const name = basename(path).toLowerCase();
  return (
    name.endsWith(".sqlite") ||
    name.endsWith(".sqlite3") ||
    name.endsWith(".db") ||
    name.endsWith(".db3")
  );
}

export async function readHead(path) {
  let fh;
  try {
    fh = await open(path, "r");
    const buf = Buffer.alloc(16);
    const { bytesRead } = await fh.read(buf, 0, 16, 0);
    return buf.subarray(0, bytesRead).toString("utf8");
  } catch {
    return "";
  } finally {
    await fh?.close().catch(() => {});
  }
}
