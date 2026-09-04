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
console.log(`ok ${files.length} files`);
