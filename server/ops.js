import { hashPassword, verifyPassword } from "./auth.js";
import { AppError } from "./errors.js";
import { addLog, loadState, updateState } from "./store.js";
import { computeDeadline } from "./time.js";
import { detectLang, t } from "./i18n.js";

const FAIL_LIMIT = 5;
const LOCK_MS = 30 * 60 * 1000;

export function langOf(state) {
  return detectLang(state?.locale);
}

export async function assertUnlocked() {
  const state = await loadState();
  if (state.lockUntil && Date.now() < state.lockUntil) {
    throw new AppError("locked");
  }
}

export async function checkin(password, source = "cli") {
  await assertUnlocked();
  const state = await loadState();
  const lang = langOf(state);
  if (!state.setupComplete) throw new AppError("need_setup");
  if (state.triggered) throw new AppError("already_fired");
  const ok = await verifyPassword(String(password || ""), state.password);
  if (!ok) {
    await bumpFail(lang);
    throw new AppError("bad_pass");
  }
  const next = await updateState((s) => {
    s.failedUnlocks = 0;
    s.lockUntil = 0;
    s.lastCheckIn = Date.now();
    s.warningSent = false;
    if (s.armed) s.deadline = computeDeadline(s.intervalMs);
    return s;
  });
  await addLog("info", t(lang, "checkin_log", { source }));
  return next;
}

export async function disarm(password, source = "cli") {
  await assertUnlocked();
  const state = await loadState();
  const lang = langOf(state);
  const ok = await verifyPassword(String(password || ""), state.password);
  if (!ok) {
    await bumpFail(lang);
    throw new AppError("bad_pass");
  }
  const next = await updateState((s) => {
    s.failedUnlocks = 0;
    s.lockUntil = 0;
    s.armed = false;
    s.deadline = null;
    s.warningSent = false;
    return s;
  });
  await addLog("info", t(lang, "disarm_log", { source }));
  return next;
}

export async function verifyOrThrow(password) {
  await assertUnlocked();
  const state = await loadState();
  const ok = await verifyPassword(String(password || ""), state.password);
  if (!ok) {
    await bumpFail(langOf(state));
    throw new AppError("bad_pass");
  }
  await updateState((s) => {
    s.failedUnlocks = 0;
    s.lockUntil = 0;
    return s;
  });
}

export async function changePassword(oldPass, nextPass) {
  await verifyOrThrow(oldPass);
  const hash = await hashPassword(nextPass);
  await updateState((s) => {
    s.password = hash;
    return s;
  });
}

async function bumpFail(lang) {
  await updateState((s) => {
    s.failedUnlocks = (s.failedUnlocks || 0) + 1;
    if (s.failedUnlocks >= FAIL_LIMIT) {
      s.lockUntil = Date.now() + LOCK_MS;
      s.failedUnlocks = 0;
    }
    return s;
  });
  await addLog("warn", t(lang || "en", "fail_log"));
}
