import { createWriteStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { basename, join } from "node:path";
import archiver from "archiver";
import { withLock } from "./lock.js";
import { addLog, DROPS_DIR, loadState, updateState } from "./store.js";
import { formatBytes, publishAll, uploadMirrors } from "./channels.js";
import { notifyOperator } from "./telegram.js";
import { debug } from "./net.js";
import { langOf } from "./ops.js";
import { t } from "./i18n.js";

export async function fire(reason = "deadline") {
  return withLock(() => fireLocked(reason));
}

async function fireLocked(reason) {
  const state = await loadState();
  if (state.lastTrigger?.complete && reason !== "force") {
    return { skipped: true, reason: "complete" };
  }

  let zipPath = state.lastTrigger?.zipPath;
  let packed = state.lastTrigger
    ? { size: state.lastTrigger.size, files: state.lastTrigger.files || [], tamper: state.lastTrigger.tamper || [] }
    : null;

  if (!zipPath || !existsSync(zipPath)) {
    zipPath = join(DROPS_DIR, `drop-${Date.now()}.zip`);
    packed = await packVault(state.vault, zipPath);
  }

  await updateState((s) => {
    s.triggered = true;
    s.armed = false;
    return s;
  });
  await addLog("warn", t(langOf(state), "fired_log", { reason }));

  const mirrors = mergeMirrors(state.lastTrigger?.mirrors, await uploadMirrors(zipPath));
  const drop = {
    at: state.lastTrigger?.at || Date.now(),
    zipPath,
    size: packed.size,
    files: packed.files,
    tamper: packed.tamper || [],
    mirrors,
    reason,
    complete: false,
  };
  const results = await publishAll({ ...state, triggered: true, armed: false }, drop);
  drop.results = results;
  const real = results.filter((r) => r.channel !== "none");
  drop.complete = real.length > 0 && real.every((r) => r.ok);

  await updateState((s) => {
    s.lastTrigger = drop;
    s.triggered = true;
    s.armed = false;
    return s;
  });
  await addLog(
    drop.complete ? "critical" : "error",
    `pack ${formatBytes(packed.size)} | mirrors ${mirrors.length} | ${results
      .map((r) => `${r.channel}:${r.ok ? "ok" : "fail"}`)
      .join(",")}`
  );

  const live = await loadState();
  if (drop.complete) {
    const links = mirrors.map((m) => m.url).join("\n") || results.map((r) => r.detail).join("\n");
    await notifyOperator(live, t(langOf(live), "released_tg", { links }));
  }
  debug("fire", reason, drop.complete);
  return drop;
}

function mergeMirrors(prev = [], next = []) {
  const map = new Map();
  for (const m of [...prev, ...next]) {
    if (m?.url) map.set(m.url, m);
  }
  return [...map.values()];
}

function packVault(vault, zipPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    const files = [];
    const tamper = [];
    output.on("close", async () => {
      const info = await stat(zipPath);
      resolve({ size: info.size, files, tamper });
    });
    archive.on("warning", (err) => {
      if (err.code !== "ENOENT") reject(err);
    });
    archive.on("error", reject);
    archive.pipe(output);
    if (!vault.length) {
      archive.append("vault empty\n", { name: "EMPTY.txt" });
    }
    for (const item of vault) {
      files.push(item.path);
      if (!existsSync(item.path)) {
        tamper.push(item.path);
        continue;
      }
      const name = basename(item.path);
      if (item.type === "dir") archive.directory(item.path, name);
      else archive.file(item.path, { name });
    }
    if (tamper.length) {
      archive.append(`${tamper.join("\n")}\n`, { name: "TAMPER.txt" });
    }
    archive.append(
      JSON.stringify({ at: Date.now(), files, tamper }, null, 2),
      { name: "MANIFEST.json" }
    );
    archive.finalize();
  });
}
