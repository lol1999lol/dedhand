import { open, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { DATA_DIR, ensureDataDir } from "./store.js";

export async function withLock(fn) {
  await ensureDataDir();
  const path = join(DATA_DIR, ".lock");
  for (let i = 0; i < 12; i += 1) {
    try {
      const fh = await open(path, "wx");
      await fh.writeFile(String(process.pid));
      try {
        return await fn();
      } finally {
        await fh.close();
        await unlink(path).catch(() => {});
      }
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      try {
        const pid = Number((await readFile(path, "utf8")).trim());
        if (pid) process.kill(pid, 0);
      } catch {
        await unlink(path).catch(() => {});
        continue;
      }
      await new Promise((r) => setTimeout(r, 150 * (i + 1)));
    }
  }
  throw new Error("busy");
}
