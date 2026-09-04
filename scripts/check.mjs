import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [join(root, "bin", "dedhand.js"), join(root, "scripts", "check.mjs")];
const server = await readdir(join(root, "server"));
for (const name of server) {
  if (name.endsWith(".js")) files.push(join(root, "server", name));
}

let failed = 0;
for (const file of files) {
  const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (r.status !== 0) {
    failed += 1;
    process.stderr.write(r.stderr || r.stdout || `${file} failed\n`);
  }
}

const help = spawnSync(process.execPath, [join(root, "bin", "dedhand.js"), "help"], {
  encoding: "utf8",
  env: { ...process.env, DEDHAND_HOME: join(root, "data") },
});
if (help.status !== 0) {
  failed += 1;
  process.stderr.write(help.stderr || "help failed\n");
}

if (failed) process.exit(1);

const tmp = join(root, ".tmp-check");
process.env.DEDHAND_HOME = tmp;
const { mkdir, writeFile, rm } = await import("node:fs/promises");
await mkdir(tmp, { recursive: true });
try {
  const { classify } = await import(join(root, "server/kind.js"));
  const { inspectPath } = await import(join(root, "server/fs.js"));
  const { packVault } = await import(join(root, "server/pack.js"));
  const zipSample = join(tmp, "backup.zip");
  const sqlSample = join(tmp, "dump.sql");
  const dbSample = join(tmp, "app.sqlite");
  await writeFile(zipSample, Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]));
  await writeFile(sqlSample, "CREATE TABLE t(id int);\n");
  await writeFile(dbSample, Buffer.concat([Buffer.from("SQLite format 3\0"), Buffer.alloc(48)]));
  const zipKind = await classify(zipSample, "file");
  const sqlKind = await classify(sqlSample, "file");
  const dbKind = await classify(dbSample, "file");
  if (zipKind !== "archive" || sqlKind !== "database" || dbKind !== "database") {
    process.stderr.write(`kind mismatch zip=${zipKind} sql=${sqlKind} db=${dbKind}\n`);
    process.exit(1);
  }
  const zItem = await inspectPath(zipSample);
  const sItem = await inspectPath(sqlSample);
  const packed = await packVault([zItem, sItem], join(tmp, "drop.zip"));
  if (!packed.size || packed.files.length !== 2) {
    process.stderr.write("packVault failed\n");
    process.exit(1);
  }
} finally {
  await rm(tmp, { recursive: true, force: true });
}

console.log(`ok ${files.length} files`);
