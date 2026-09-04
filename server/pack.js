import { createWriteStream, existsSync } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import archiver from "archiver";
import { DROPS_DIR } from "./store.js";
import { classify, isSqliteFile, readHead } from "./kind.js";

export async function packVault(vault, zipPath) {
  await mkdir(DROPS_DIR, { recursive: true, mode: 0o700 });
  const cleanups = [];
  const files = [];
  const tamper = [];
  const kinds = [];

  await new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve);
    archive.on("warning", (err) => {
      if (err.code !== "ENOENT") reject(err);
    });
    archive.on("error", reject);
    archive.pipe(output);

    (async () => {
      if (!vault.length) {
        archive.append("vault empty\n", { name: "EMPTY.txt" });
      }
      for (const item of vault) {
        files.push(item.path);
        if (!existsSync(item.path)) {
          tamper.push(item.path);
          continue;
        }
        const kind = item.kind || (await classify(item.path, item.type));
        kinds.push({ path: item.path, kind });
        const cleanup = await appendItem(archive, item, kind);
        if (cleanup) cleanups.push(cleanup);
      }
      if (tamper.length) {
        archive.append(`${tamper.join("\n")}\n`, { name: "TAMPER.txt" });
      }
      archive.append(
        JSON.stringify({ at: Date.now(), files, tamper, kinds }, null, 2),
        { name: "MANIFEST.json" }
      );
      archive.finalize();
    })().catch(reject);
  });

  for (const fn of cleanups) await fn().catch(() => {});
  const info = await stat(zipPath);
  return { size: info.size, files, tamper, kinds };
}

async function appendItem(archive, item, kind) {
  const name = basename(item.path);
  if (item.type === "dir") {
    archive.directory(item.path, name);
    return null;
  }
  const head = await readHead(item.path);
  if (isSqliteFile(item.path, kind, head)) {
    return appendSqlite(archive, item.path, name);
  }
  archive.file(item.path, { name, store: kind === "archive" });
  return null;
}

async function appendSqlite(archive, path, name) {
  const snap = join(DROPS_DIR, `snap-${Date.now()}-${name}`);
  if (sqliteBackup(path, snap)) {
    archive.file(snap, { name, store: true });
    return async () => unlink(snap).catch(() => {});
  }
  archive.file(path, { name, store: true });
  for (const suffix of ["-wal", "-shm"]) {
    const side = `${path}${suffix}`;
    if (existsSync(side)) archive.file(side, { name: `${name}${suffix}`, store: true });
  }
  return null;
}

function sqliteBackup(src, dest) {
  const escaped = dest.replaceAll("'", "''");
  for (const sql of [`VACUUM INTO '${escaped}'`, `.backup '${escaped}'`]) {
    const r = spawnSync("sqlite3", [src, sql], { encoding: "utf8", timeout: 180000 });
    if (r.status === 0 && existsSync(dest)) return true;
  }
  return false;
}
