import { createReadStream } from "node:fs";
import * as fs from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { createTransport } from "./mail.js";
import { chatIds, http, retry } from "./net.js";

const MAX_TELEGRAM = 49 * 1024 * 1024;
const MAX_DISCORD = 24 * 1024 * 1024;

export async function publishAll(state, drop) {
  const text = composeMessage(state, drop);
  const enabled = Object.entries(state.channels).filter(([, c]) => c.enabled);
  if (!enabled.length) {
    return [{ channel: "none", ok: false, detail: "no channel enabled" }];
  }
  const settled = await Promise.all(
    enabled.map(async ([name, config]) => {
      try {
        const detail = await retry(() => senders[name](config, { text, drop }));
        return { channel: name, ok: true, detail };
      } catch (err) {
        return { channel: name, ok: false, detail: err.message };
      }
    })
  );
  return settled;
}

function composeMessage(state, drop) {
  const links = drop.mirrors?.length
    ? drop.mirrors.map((m) => `${m.host}: ${m.url}`).join("\n")
    : "no public mirror";
  const tamper = drop.tamper?.length ? `\ntampered paths:\n${drop.tamper.join("\n")}` : "";
  return [state.message.trim(), "", `time: ${new Date(drop.at).toISOString()}`, `size: ${formatBytes(drop.size)}`, "", "mirrors:", links, tamper]
    .join("\n")
    .trim();
}

const senders = {
  async telegram(config, { text, drop }) {
    if (!config.token || !config.chatId) throw new Error("telegram config incomplete");
    const ids = chatIds(config.chatId);
    const info = await stat(drop.zipPath);
    for (const chatId of ids) {
      await telegramApi(config.token, "sendMessage", { chat_id: chatId, text });
      if (info.size <= MAX_TELEGRAM) {
        const body = new FormData();
        body.set("chat_id", chatId);
        body.set("document", await fileBlob(drop.zipPath), basename(drop.zipPath));
        const res = await http(`https://api.telegram.org/bot${config.token}/sendDocument`, {
          method: "POST",
          body,
        }, 120000);
        const json = await res.json();
        if (!json.ok) throw new Error(json.description || "telegram file");
      }
    }
    return `telegram ${ids.length} dest`;
  },

  async discord(config, { text, drop }) {
    if (!config.webhook) throw new Error("discord webhook missing");
    const info = await stat(drop.zipPath);
    if (info.size <= MAX_DISCORD) {
      const body = new FormData();
      body.set("content", text.slice(0, 1900));
      body.set("file", await fileBlob(drop.zipPath), basename(drop.zipPath));
      const res = await http(config.webhook, { method: "POST", body }, 120000);
      if (!res.ok) throw new Error(`discord ${res.status}`);
      return "discord file";
    }
    const res = await http(config.webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.slice(0, 1900) }),
    });
    if (!res.ok) throw new Error(`discord ${res.status}`);
    return "discord text";
  },

  async slack(config, { text }) {
    if (!config.webhook) throw new Error("slack webhook missing");
    const res = await http(config.webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`slack ${res.status}`);
    return "slack";
  },

  async webhook(config, { text, drop }) {
    const urls = chatIds(config.url).length ? chatIds(config.url) : config.url ? [config.url] : [];
    if (!urls.length) throw new Error("webhook url missing");
    for (const url of urls) {
      const res = await http(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.secret ? { "X-Dedhand-Secret": config.secret } : {}),
        },
        body: JSON.stringify({
          text,
          mirrors: drop.mirrors,
          size: drop.size,
          at: drop.at,
          tamper: drop.tamper || [],
        }),
      });
      if (!res.ok) throw new Error(`webhook ${res.status}`);
    }
    return `${urls.length} webhook`;
  },

  async mastodon(config, { text }) {
    if (!config.instance || !config.token) throw new Error("mastodon config incomplete");
    const instance = config.instance.replace(/\/$/, "");
    const res = await http(`${instance}/api/v1/statuses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: text.slice(0, 4900), visibility: "public" }),
    });
    if (!res.ok) throw new Error(`mastodon ${res.status}`);
    return "mastodon";
  },

  async ntfy(config, { text }) {
    if (!config.topic) throw new Error("ntfy topic missing");
    const base = (config.url || "https://ntfy.sh").replace(/\/$/, "");
    const res = await http(`${base}/${config.topic}`, {
      method: "POST",
      headers: {
        Title: "release",
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
      body: text,
    });
    if (!res.ok) throw new Error(`ntfy ${res.status}`);
    return "ntfy";
  },

  async matrix(config, { text }) {
    if (!config.homeserver || !config.token || !config.roomId) throw new Error("matrix config incomplete");
    const base = config.homeserver.replace(/\/$/, "");
    const room = encodeURIComponent(config.roomId);
    const txn = `${Date.now()}`;
    const res = await http(`${base}/_matrix/client/v3/rooms/${room}/send/m.room.message/${txn}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ msgtype: "m.text", body: text }),
    });
    if (!res.ok) throw new Error(`matrix ${res.status}`);
    return "matrix";
  },

  async gotify(config, { text }) {
    if (!config.url || !config.token) throw new Error("gotify config incomplete");
    const base = config.url.replace(/\/$/, "");
    const res = await http(`${base}/message?token=${encodeURIComponent(config.token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "DEDHAND", message: text, priority: 8 }),
    });
    if (!res.ok) throw new Error(`gotify ${res.status}`);
    return "gotify";
  },

  async email(config, { text, drop }) {
    if (!config.host || !config.to) throw new Error("smtp incomplete");
    const transport = await createTransport(config);
    await transport.send({
      from: config.from || config.user,
      to: config.to,
      subject: "payload released",
      text,
      attachments: [{ filename: basename(drop.zipPath), path: drop.zipPath }],
    });
    return `email ${config.to}`;
  },
};

async function telegramApi(token, method, payload) {
  const res = await http(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.description || method);
  return json;
}

export async function testChannel(name, config) {
  const text = "test — not a real release.";
  if (name === "telegram") {
    if (!config.token || !config.chatId) throw new Error("telegram config incomplete");
    for (const chatId of chatIds(config.chatId)) {
      await telegramApi(config.token, "sendMessage", { chat_id: chatId, text });
    }
    return "telegram test";
  }
  if (name === "discord" || name === "slack") {
    if (!config.webhook) throw new Error("webhook missing");
    const res = await http(config.webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(name === "slack" ? { text } : { content: text }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return "test sent";
  }
  if (name === "webhook") return senders.webhook(config, { text, drop: { mirrors: [], size: 0, at: Date.now() } });
  if (name === "ntfy") return senders.ntfy(config, { text });
  if (name === "matrix") return senders.matrix(config, { text });
  if (name === "gotify") return senders.gotify(config, { text });
  if (name === "mastodon") return senders.mastodon(config, { text });
  if (name === "email") {
    if (!config.host || !config.to) throw new Error("smtp incomplete");
    const transport = await createTransport(config);
    await transport.send({
      from: config.from || config.user,
      to: config.to,
      subject: "test",
      text,
    });
    return "email test";
  }
  throw new Error("unknown channel");
}

export async function uploadMirrors(zipPath) {
  const jobs = [upload0x0, uploadCatbox, uploadLitterbox, uploadTransfer];
  const settled = await Promise.all(
    jobs.map(async (fn) => {
      try {
        return await retry(() => fn(zipPath), 2);
      } catch {
        return null;
      }
    })
  );
  return settled.filter(Boolean);
}

async function upload0x0(zipPath) {
  const info = await stat(zipPath);
  if (info.size > 512 * 1024 * 1024) return null;
  const body = new FormData();
  body.set("file", await fileBlob(zipPath), basename(zipPath));
  const res = await http("https://0x0.st", {
    method: "POST",
    body,
    headers: { "User-Agent": "curl/8.0" },
  }, 180000);
  if (!res.ok) throw new Error("0x0");
  const url = (await res.text()).trim();
  if (!url.startsWith("http")) throw new Error("0x0 bad");
  return { host: "0x0.st", url };
}

async function uploadCatbox(zipPath) {
  const info = await stat(zipPath);
  if (info.size > 200 * 1024 * 1024) return null;
  const body = new FormData();
  body.set("reqtype", "fileupload");
  body.set("fileToUpload", await fileBlob(zipPath), basename(zipPath));
  const res = await http("https://catbox.moe/user/api.php", { method: "POST", body }, 180000);
  if (!res.ok) throw new Error("catbox");
  const url = (await res.text()).trim();
  if (!url.startsWith("http")) throw new Error("catbox bad");
  return { host: "catbox.moe", url };
}

async function uploadLitterbox(zipPath) {
  const info = await stat(zipPath);
  if (info.size > 1024 * 1024 * 1024) return null;
  const body = new FormData();
  body.set("reqtype", "fileupload");
  body.set("time", "72h");
  body.set("fileToUpload", await fileBlob(zipPath), basename(zipPath));
  const res = await http("https://litterbox.catbox.moe/resources/internals/api.php", {
    method: "POST",
    body,
  }, 180000);
  if (!res.ok) throw new Error("litterbox");
  const url = (await res.text()).trim();
  if (!url.startsWith("http")) throw new Error("litterbox bad");
  return { host: "litterbox", url };
}

async function uploadTransfer(zipPath) {
  const info = await stat(zipPath);
  if (info.size > 10 * 1024 * 1024 * 1024) return null;
  const blob = await fileBlob(zipPath);
  const res = await http(`https://transfer.sh/${encodeURIComponent(basename(zipPath))}`, {
    method: "PUT",
    body: blob,
  }, 180000);
  if (!res.ok) throw new Error("transfer");
  const url = (await res.text()).trim();
  if (!url.startsWith("http")) throw new Error("transfer bad");
  return { host: "transfer.sh", url };
}

async function fileBlob(path) {
  if (typeof fs.openAsBlob === "function") return fs.openAsBlob(path);
  return new Blob([await readFile(path)]);
}

export function formatBytes(n) {
  if (!n && n !== 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function streamFile(path) {
  return createReadStream(path);
}
