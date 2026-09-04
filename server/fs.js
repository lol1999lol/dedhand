import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, resolve } from "node:path";
import { classify } from "./kind.js";

export async function inspectPath(target) {
  const full = resolve(target);
  const info = await stat(full);
  const type = info.isDirectory() ? "dir" : "file";
  const kind = await classify(full, type);
  const item = {
    path: full,
    name: basename(full),
    type,
    kind,
    size: info.isFile() ? info.size : null,
    mtime: info.mtimeMs,
    hash: null,
  };
  if (item.type === "file" && kind !== "database" && info.size <= 512 * 1024 * 1024) {
    item.hash = await hashFile(full);
  }
  return item;
}

export function hashFile(path) {
  return new Promise((resolveHash, reject) => {
    const h = createHash("sha256");
    createReadStream(path)
      .on("data", (d) => h.update(d))
      .on("end", () => resolveHash(h.digest("hex")))
      .on("error", reject);
  });
}

export async function vaultBroken(vault) {
  if (!vault?.length) return null;
  for (const item of vault) {
    let info;
    try {
      info = await stat(item.path);
    } catch {
      return item.path;
    }
    if (item.kind === "database") continue;
    if (item.type === "file" && item.hash) {
      if (!info.isFile()) return item.path;
      const now = await hashFile(item.path);
      if (now !== item.hash) return item.path;
    }
  }
  return null;
}
