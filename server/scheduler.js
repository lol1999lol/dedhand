import { stat } from "node:fs/promises";
import { vaultBroken } from "./fs.js";
import { addLog, loadState, updateState } from "./store.js";
import { fire } from "./trigger.js";
import { notifyOperator } from "./telegram.js";
import { debug } from "./net.js";
import { langOf } from "./ops.js";
import { t } from "./i18n.js";

let timer = null;

export function startScheduler() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    tick().catch((err) => debug("scheduler", err));
  }, 2000);
  tick().catch(() => {});
}

export async function tick() {
  const state = await loadState();

  if (state.triggered && !state.lastTrigger?.complete) {
    return fire("retry");
  }

  if (!state.armed || state.triggered || !state.deadline) return;

  const dueIntegrity = Date.now() - (state.lastIntegrityAt || 0) > 5 * 60 * 1000;
  if (dueIntegrity) {
    await updateState((s) => {
      s.lastIntegrityAt = Date.now();
      return s;
    });
    if (await vaultBroken(state.vault)) {
      await addLog("critical", t(langOf(state), "tamper_log"));
      return fire("tamper");
    }
  }

  if (await vaultMissing(state.vault)) {
    await addLog("critical", t(langOf(state), "tamper_log"));
    return fire("tamper");
  }

  const remaining = state.deadline - Date.now();
  if (remaining <= state.warningMs && remaining > 0 && !state.warningSent) {
    await updateState((s) => {
      s.warningSent = true;
      return s;
    });
    const lang = langOf(state);
    await addLog("warn", t(lang, "warn_log"));
    await notifyOperator(state, t(lang, "warn_tg"));
  }

  if (remaining <= 0) {
    return fire("missed-checkin");
  }
}

async function vaultMissing(vault) {
  if (!vault?.length) return false;
  for (const item of vault) {
    try {
      await stat(item.path);
    } catch {
      return true;
    }
  }
  return false;
}

