import { addLog, loadState, updateState } from "./store.js";
import { checkin, disarm, langOf } from "./ops.js";
import { remainingLabel, t } from "./i18n.js";
import { debug, http } from "./net.js";
import { VERSION } from "./banner.js";

let stop = false;

export async function notifyOperator(state, text) {
  const tg = state.channels.telegram;
  if (!tg?.enabled || !tg.token || !tg.chatId) return;
  await telegramCall(tg.token, "sendMessage", { chat_id: tg.chatId, text }).catch(() => {});
}

export function startInbox() {
  stop = false;
  loop().catch((err) => debug("inbox", err));
}

export function stopInbox() {
  stop = true;
}

async function loop() {
  while (!stop) {
    const state = await loadState();
    const tg = state.channels.telegram;
    if (!tg?.enabled || !tg.token) {
      await sleep(5000);
      continue;
    }
    try {
      const updates = await telegramCall(tg.token, "getUpdates", {
        offset: state.telegramOffset || 0,
        timeout: 25,
        allowed_updates: ["message"],
      });
      for (const update of updates.result || []) {
        await updateState((s) => {
          s.telegramOffset = update.update_id + 1;
          return s;
        });
        await handleUpdate(tg, update);
      }
    } catch (err) {
      debug("poll", err.message);
      await sleep(5000);
    }
  }
}

async function handleUpdate(tg, update) {
  const msg = update.message;
  if (!msg?.text) return;
  const chatId = String(msg.chat.id);
  if (tg.chatId && !String(tg.chatId).split(/[,\s]+/).includes(chatId)) return;

  const text = msg.text.trim();
  const [cmd, ...rest] = text.split(/\s+/);
  const arg = rest.join(" ");
  const reply = async (body) =>
    telegramCall(tg.token, "sendMessage", { chat_id: chatId, text: body }).catch(() => {});

  const live = await loadState();
  const lang = langOf(live);

  try {
    if (cmd === "/in" || cmd === "/checkin" || cmd === "in") {
      await checkin(arg, "telegram");
      const state = await loadState();
      const left = state.deadline ? remainingLabel(state.deadline - Date.now(), lang) : t(lang, "off");
      await reply(t(lang, "tg_ok", { left }));
      return;
    }
    if (cmd === "/disarm" || cmd === "disarm") {
      await disarm(arg, "telegram");
      await reply(t(lang, "tg_off"));
      return;
    }
    if (cmd === "/status" || cmd === "status") {
      const state = await loadState();
      const left = state.deadline ? remainingLabel(state.deadline - Date.now(), lang) : "—";
      await reply(
        [
          state.armed ? t(lang, "on") : t(lang, "off"),
          state.triggered ? "fired" : "idle",
          String(state.vault.length),
          left,
        ].join(" ")
      );
      return;
    }
    if (cmd === "/help" || cmd === "help") {
      await reply("in <pass>\ndisarm <pass>\nstatus\nhelp");
      return;
    }
    if (cmd === "/version" || cmd === "version") {
      await reply(`DEDHAND ${VERSION}`);
      return;
    }
  } catch {
    await addLog("warn", t(lang, "tg_deny_log"));
    await reply(t(lang, "tg_no"));
  }
}

export async function telegramCall(token, method, payload) {
  const res = await http(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    method === "getUpdates" ? 40000 : 30000
  );
  const json = await res.json();
  if (!json.ok) throw new Error(json.description || method);
  return json;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
