/** DEDHAND by lol1999lol — https://github.com/lol1999lol/dedhand */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AUTHOR, TAGLINE } from "./meta.js";

const pkg = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8")
);

export const VERSION = pkg.version;

export function banner() {
  const title = "DEDHAND";
  const meta = `v${VERSION}  ·  outbound only  ·  by ${AUTHOR.name}`;
  const sub = "locked state  ·  no bind  ·  operator-owned channels";
  const credit = AUTHOR.repo;
  const w = Math.max(title.length, meta.length, sub.length, credit.length);
  const bar = "═".repeat(w + 2);
  return [
    `╔${bar}╗`,
    `║ ${title.padEnd(w)} ║`,
    `║ ${meta.padEnd(w)} ║`,
    `║ ${sub.padEnd(w)} ║`,
    `║ ${credit.padEnd(w)} ║`,
    `╚${bar}╝`,
  ].join("\n");
}

export function row(key, value) {
  return `  ${String(key).padEnd(12)} ${value}`;
}

export { TAGLINE, AUTHOR };
