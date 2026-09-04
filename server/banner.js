import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8")
);

export const VERSION = pkg.version;

export function banner() {
  const title = `DEDHAND`;
  const meta = `v${VERSION}  ·  outbound only`;
  const sub = "locked state  ·  no bind  ·  operator-owned channels";
  const w = Math.max(title.length, meta.length, sub.length);
  const bar = "═".repeat(w + 2);
  return [`╔${bar}╗`, `║ ${title.padEnd(w)} ║`, `║ ${meta.padEnd(w)} ║`, `║ ${sub.padEnd(w)} ║`, `╚${bar}╝`].join(
    "\n"
  );
}

export function row(key, value) {
  return `  ${String(key).padEnd(11)} ${value}`;
}
