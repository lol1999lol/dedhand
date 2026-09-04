import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { AppError } from "./errors.js";

const scryptAsync = promisify(scrypt);
const PARAMS = { N: 32768, r: 8, p: 1 };

export function assertStrongPassword(password) {
  const p = String(password || "");
  if (p.length < 12) throw new AppError("password_short");
  if (!/\p{L}/u.test(p) || !/\p{N}/u.test(p)) throw new AppError("password_weak");
}

export async function hashPassword(password) {
  assertStrongPassword(password);
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, 64, PARAMS);
  return `scrypt:${salt.toString("hex")}:${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || !password) return false;
  const [kind, saltHex, hex] = String(stored).split(":");
  if (kind !== "scrypt" || !saltHex || !hex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const derived = await scryptAsync(password, salt, 64, PARAMS);
  const a = Buffer.from(hex, "hex");
  const b = Buffer.from(derived);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
