import { chmod, copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { t } from "./i18n.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = process.env.DEDHAND_HOME || join(ROOT, "data");
export const DROPS_DIR = join(DATA_DIR, "drops");
const STATE_PATH = join(DATA_DIR, "state.bin");
const BACKUP_PATH = join(DATA_DIR, "state.bak");
const KEY_PATH = join(DATA_DIR, ".key");

export function defaultState() {
  return {
    setupComplete: false,
    password: null,
    operatorName: "",
    locale: "en",
    armed: false,
    triggered: false,
    lastCheckIn: null,
    deadline: null,
    intervalMs: 24 * 60 * 60 * 1000,
    warningMs: 60 * 60 * 1000,
    warningSent: false,
    telegramOffset: 0,
    failedUnlocks: 0,
    lockUntil: 0,
    message: t("en", "default_message"),
    vault: [],
    channels: {
      telegram: { enabled: false, token: "", chatId: "" },
      discord: { enabled: false, webhook: "" },
      slack: { enabled: false, webhook: "" },
      email: {
        enabled: false,
        host: "",
        port: 587,
        secure: false,
        user: "",
        pass: "",
        from: "",
        to: "",
      },
      mastodon: { enabled: false, instance: "", token: "" },
      webhook: { enabled: false, url: "", secret: "" },
      ntfy: { enabled: false, url: "https://ntfy.sh", topic: "", token: "" },
      matrix: { enabled: false, homeserver: "", token: "", roomId: "" },
      gotify: { enabled: false, url: "", token: "" },
    },
    lastIntegrityAt: 0,
    schema: 2,
    logs: [],
    lastTrigger: null,
  };
}

let cache = null;
let keyCache = null;
let writeQueue = Promise.resolve();

export async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
  await mkdir(DROPS_DIR, { recursive: true, mode: 0o700 });
  await chmod(DATA_DIR, 0o700).catch(() => {});
}

async function loadMaster() {
  if (keyCache) return keyCache;
  await ensureDataDir();
  try {
    const buf = await readFile(KEY_PATH);
    if (buf.length !== 32) throw new Error("bad key");
    keyCache = buf;
  } catch {
    keyCache = randomBytes(32);
    await writeFile(KEY_PATH, keyCache, { mode: 0o600 });
    await chmod(KEY_PATH, 0o600).catch(() => {});
  }
  return keyCache;
}

function encKey(master) {
  return Buffer.from(hkdfSync("sha256", master, "dedhand", "aes-256-gcm-v2", 32));
}

function seal(plain, master) {
  const key = encKey(master);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from("DH2"), iv, tag, enc]);
}

function open(buf, master) {
  const magic = buf.subarray(0, 3).toString();
  if (buf.length < 3 + 12 + 16 || (magic !== "DH1" && magic !== "DH2")) {
    throw new Error("state corrupt");
  }
  const key = magic === "DH2" ? encKey(master) : master;
  const iv = buf.subarray(3, 15);
  const tag = buf.subarray(15, 31);
  const enc = buf.subarray(31);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export async function loadState() {
  if (cache) return cache;
  await ensureDataDir();
  const master = await loadMaster();
  try {
    const raw = await readFile(STATE_PATH);
    const parsed = JSON.parse(open(raw, master));
    cache = { ...defaultState(), ...parsed };
    cache.channels = { ...defaultState().channels, ...cache.channels };
  } catch {
    cache = defaultState();
    await persist(cache);
  }
  return cache;
}

async function persist(state) {
  await ensureDataDir();
  const master = await loadMaster();
  try {
    await copyFile(STATE_PATH, BACKUP_PATH);
    await chmod(BACKUP_PATH, 0o600).catch(() => {});
  } catch {
    // first write
  }
  const tmp = `${STATE_PATH}.tmp`;
  const body = seal(JSON.stringify(state), master);
  await writeFile(tmp, body, { mode: 0o600 });
  await rename(tmp, STATE_PATH);
  await chmod(STATE_PATH, 0o600).catch(() => {});
}

export function updateState(mutator) {
  writeQueue = writeQueue.then(async () => {
    const state = await loadState();
    const next = mutator(state) || state;
    cache = next;
    await persist(next);
    return next;
  });
  return writeQueue;
}

export async function addLog(level, text, extra = {}) {
  return updateState((state) => {
    state.logs.unshift({
      id: crypto.randomUUID(),
      at: Date.now(),
      level,
      text,
      ...extra,
    });
    state.logs = state.logs.slice(0, 200);
    return state;
  });
}

export function summarize(state) {
  const remaining = state.deadline ? Math.max(0, state.deadline - Date.now()) : null;
  return {
    schema: state.schema || 2,
    home: DATA_DIR,
    locale: state.locale,
    setupComplete: state.setupComplete,
    operatorName: state.operatorName,
    armed: state.armed,
    triggered: state.triggered,
    lastCheckIn: state.lastCheckIn,
    deadline: state.deadline,
    intervalMs: state.intervalMs,
    warningMs: state.warningMs,
    remaining,
    vault: state.vault,
    channelFlags: Object.fromEntries(
      Object.entries(state.channels).map(([k, v]) => [k, Boolean(v.enabled)])
    ),
    lastTrigger: state.lastTrigger
      ? {
          at: state.lastTrigger.at,
          size: state.lastTrigger.size,
          files: state.lastTrigger.files,
          kinds: state.lastTrigger.kinds,
          mirrors: state.lastTrigger.mirrors,
          results: state.lastTrigger.results,
          complete: state.lastTrigger.complete,
          reason: state.lastTrigger.reason,
        }
      : null,
    logs: state.logs.slice(0, 30),
  };
}
