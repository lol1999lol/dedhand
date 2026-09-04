#!/usr/bin/env node
/** DEDHAND by lol1999lol — https://github.com/lol1999lol/dedhand */
import readline from "node:readline";
import { spawnSync } from "node:child_process";
import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { hashPassword } from "../server/auth.js";
import { formatBytes, testChannel } from "../server/channels.js";
import { runDaemon, removeUserUnit, writeUserUnit } from "../server/daemon.js";
import { inspectPath, vaultBroken } from "../server/fs.js";
import {
  detectLang,
  fail,
  formatTime,
  LOCALES,
  normalizeLang,
  remainingLabel,
  t,
} from "../server/i18n.js";
import { AUTHOR } from "../server/meta.js";
import { changePassword, checkin, disarm, langOf, verifyOrThrow } from "../server/ops.js";
import { tick } from "../server/scheduler.js";
import { addLog, DATA_DIR, loadState, summarize, updateState } from "../server/store.js";
import { computeDeadline } from "../server/time.js";
import { fire } from "../server/trigger.js";
import { banner, row, VERSION } from "../server/banner.js";

const [cmd, ...rest] = process.argv.slice(2);
const opts = parseArgs(rest);

try {
  await main(cmd || "help");
} catch (err) {
  const lang = await currentLang();
  console.error(fail(lang, err));
  process.exit(1);
}

async function currentLang() {
  if (opts.lang) return detectLang(opts.lang);
  const state = await loadState();
  return detectLang(state.locale);
}

async function main(command) {
  const lang = await currentLang();
  switch (command) {
    case "help":
    case "-h":
    case "--help":
      console.log(banner());
      console.log(t(lang, "help").trim());
      return;
    case "guide":
    case "quickstart":
      await cmdGuide(lang);
      return;
    case "version":
    case "-v":
    case "--version":
      console.log(`${VERSION}  by ${AUTHOR.name}  ${AUTHOR.repo}`);
      return;
    case "langs":
      console.log(`${t(lang, "langs_title")}: ${LOCALES.join(" ")}`);
      return;
    case "lang":
      await cmdLang(opts._[0], lang);
      return;
    case "doctor":
      await cmdDoctor(lang);
      return;
    case "daemon":
      await runDaemon();
      return;
    case "setup":
    case "init":
      await cmdSetup(lang);
      return;
    case "install-service":
      await cmdInstall();
      return;
    case "uninstall-service":
      await cmdUninstall();
      return;
    case "which":
      await cmdWhich(lang);
      return;
    case "export":
      await cmdExport(lang);
      return;
    case "passwd":
      await cmdPasswd(lang);
      return;
    case "tick":
      await tick();
      return;
    case "status":
      await cmdStatus(lang);
      return;
    case "logs":
      await cmdLogs(lang);
      return;
    case "add":
      await cmdAdd(opts._, lang);
      return;
    case "rm":
      await cmdRm(opts._[0], lang);
      return;
    case "interval":
      await cmdInterval(opts._[0], lang);
      return;
    case "warning":
      await cmdWarning(opts._[0], lang);
      return;
    case "message":
      await cmdMessage();
      return;
    case "name":
      await updateState((s) => {
        s.operatorName = opts._.join(" ");
        return s;
      });
      console.log("ok");
      return;
    case "telegram":
    case "discord":
    case "slack":
    case "mastodon":
    case "webhook":
    case "email":
    case "ntfy":
    case "matrix":
    case "gotify":
      await cmdChannel(command, lang);
      return;
    case "test":
      await cmdTest(opts._[0], lang);
      return;
    case "arm":
      await cmdArm(lang);
      return;
    case "checkin":
      await checkin(await secret(t(lang, "ask_checkin")), "cli");
      console.log(t(lang, "checkin_ok"));
      return;
    case "disarm":
      await disarm(await secret(t(lang, "ask_disarm")), "cli");
      console.log(t(lang, "disarmed"));
      return;
    case "fire":
      await cmdFire(lang);
      return;
    case "reset":
      await verifyOrThrow(await secret(t(lang, "ask_pass_plain")));
      await updateState((s) => {
        s.triggered = false;
        s.armed = false;
        s.deadline = null;
        s.warningSent = false;
        s.lastTrigger = null;
        return s;
      });
      await addLog("info", t(lang, "reset_log"));
      console.log(t(lang, "reset_ok"));
      return;
    default:
      throw new Error(t(lang, "unknown_cmd", { cmd: command }) + "\n" + t(lang, "help"));
  }
}

async function cmdLang(code, lang) {
  const next = normalizeLang(code);
  if (!next) throw new Error(t(lang, "lang_bad"));
  await updateState((s) => {
    s.locale = next;
    if (!s.setupComplete || s.message === t(langOf(s), "default_message") || !s.message) {
      s.message = t(next, "default_message");
    }
    return s;
  });
  console.log(t(next, "lang_set", { lang: next }));
}

async function cmdDoctor(lang) {
  const state = await loadState();
  const issues = [];
  const major = Number(String(process.versions.node).split(".")[0]);
  if (major < 20) issues.push(t(lang, "doctor_node", { have: process.versions.node }));
  if (!state.setupComplete) issues.push(t(lang, "doctor_not_setup"));
  if (!Object.values(state.channels).some((c) => c.enabled)) issues.push(t(lang, "doctor_no_channel"));
  const notes = [];
  for (const item of state.vault) {
    try {
      await stat(item.path);
    } catch {
      issues.push(t(lang, "doctor_vault_missing", { path: item.path }));
      continue;
    }
    if (item.kind === "database") {
      notes.push(t(lang, "doctor_db_live", { path: item.path }));
    }
    if (item.size && item.size > 24 * 1024 * 1024) {
      notes.push(
        t(lang, "doctor_large", {
          kind: item.kind || item.type,
          path: item.path,
          size: formatBytes(item.size),
        })
      );
    }
  }
  const drift = await vaultBroken(state.vault);
  if (drift) issues.push(t(lang, "doctor_hash", { path: drift }));
  for (const path of [DATA_DIR, join(DATA_DIR, ".key"), join(DATA_DIR, "state.bin")]) {
    try {
      const info = await stat(path);
      if (info.mode & 0o077) issues.push(t(lang, "doctor_perms", { path }));
    } catch {
      // absent until setup
    }
  }
  console.log(banner());
  if (issues.length) {
    console.log(t(lang, "doctor_fail"));
    for (const line of issues) console.log(`- ${line}`);
    process.exitCode = 1;
    return;
  }
  console.log(t(lang, "doctor_ok"));
  for (const line of notes) console.log(`- ${line}`);
}

async function cmdSetup(lang) {
  const state = await loadState();
  if (state.setupComplete) throw new Error(t(lang, "already_setup"));
  const operatorName = String(opts.name || process.env.DEDHAND_NAME || (await ask(t(lang, "ask_name")))).trim();
  const p1 = process.env.DEDHAND_PASS || (await secret(t(lang, "ask_pass")));
  const p2 = process.env.DEDHAND_PASS || (await secret(t(lang, "ask_pass2")));
  if (p1 !== p2) throw new Error(t(lang, "pass_mismatch"));
  const hoursRaw = opts.hours || process.env.DEDHAND_HOURS || (await ask(t(lang, "ask_hours"))) || "24";
  const hours = Number(hoursRaw) || 24;
  const token = process.env.DEDHAND_TG_TOKEN || (await optionalSecret(t(lang, "ask_tg_token")));
  const chatId = token
    ? String(process.env.DEDHAND_TG_CHAT || opts.chat || (await ask(t(lang, "ask_tg_chat")))).trim()
    : "";
  const hash = await hashPassword(p1);
  await updateState((s) => {
    s.setupComplete = true;
    s.password = hash;
    s.operatorName = operatorName || AUTHOR.name;
    s.locale = lang;
    s.intervalMs = Math.max(60 * 1000, hours * 3600 * 1000);
    s.message = t(lang, "default_message");
    if (token && chatId) {
      s.channels.telegram = { enabled: true, token, chatId };
    }
    return s;
  });
  await addLog("info", t(lang, "setup_done"));
  console.log(`${t(lang, "home")}: ${DATA_DIR}`);
  await cmdGuide(lang);
}

async function cmdGuide(lang) {
  const state = await loadState();
  const hasChannel = Object.values(state.channels).some((c) => c.enabled);
  const steps = [
    { ok: state.setupComplete, label: t(lang, "guide_step_setup"), cmd: "node bin/dedhand.js setup" },
    {
      ok: state.vault.length > 0,
      label: t(lang, "guide_step_add"),
      cmd: "node bin/dedhand.js add ./backup.zip ./dump.sql ./app.sqlite",
    },
    {
      ok: hasChannel,
      label: t(lang, "guide_step_channel"),
      cmd: "node bin/dedhand.js telegram --token BOT --chat CHATID\n     node bin/dedhand.js ntfy --topic your-private-topic",
    },
    {
      ok: state.setupComplete,
      label: t(lang, "guide_step_doctor"),
      cmd: "node bin/dedhand.js doctor",
    },
    {
      ok: state.armed,
      label: t(lang, "guide_step_arm"),
      cmd: "node bin/dedhand.js arm",
    },
    {
      ok: false,
      label: t(lang, "guide_step_service"),
      cmd: "node bin/dedhand.js install-service",
      skipMark: !state.armed,
    },
    {
      ok: Boolean(state.lastCheckIn),
      label: t(lang, "guide_step_checkin"),
      cmd: "node bin/dedhand.js checkin",
    },
  ];
  console.log(banner());
  console.log(row(t(lang, "author"), AUTHOR.name));
  console.log(row(t(lang, "repo"), AUTHOR.clone));
  console.log("");
  for (const step of steps) {
    const mark = step.skipMark ? "·" : step.ok ? "✓" : "→";
    console.log(`  ${mark}  ${step.label}`);
    if (!step.ok && !step.skipMark) console.log(`     ${step.cmd}`);
  }
  console.log("");
  if (state.triggered) console.log(t(lang, "guide_fired"));
  else if (state.armed && hasChannel && state.vault.length) console.log(t(lang, "guide_done"));
}

async function cmdInstall() {
  const lang = await currentLang();
  const info = await writeUserUnit();
  console.log(banner());
  const enabled = enableUserUnits(info.unit);
  if (enabled) {
    console.log(t(lang, "install_ok"));
    console.log(info.servicePath);
    console.log(info.timerPath);
    return;
  }
  console.log(t(lang, "install_manual"));
  console.log(info.servicePath);
  console.log(info.timerPath);
  console.log("systemctl --user daemon-reload");
  console.log(`systemctl --user enable --now ${info.unit}.service`);
  console.log(`systemctl --user enable --now ${info.unit}.timer`);
  console.log("loginctl enable-linger \"$USER\"");
}

function enableUserUnits(unit) {
  const steps = [
    ["systemctl", ["--user", "daemon-reload"]],
    ["systemctl", ["--user", "enable", "--now", `${unit}.service`]],
    ["systemctl", ["--user", "enable", "--now", `${unit}.timer`]],
  ];
  for (const [bin, args] of steps) {
    const r = spawnSync(bin, args, { encoding: "utf8" });
    if (r.error || r.status !== 0) return false;
  }
  const user = process.env.USER || process.env.LOGNAME;
  if (user) spawnSync("loginctl", ["enable-linger", user], { encoding: "utf8" });
  return true;
}

async function cmdUninstall() {
  const info = await removeUserUnit();
  console.log(banner());
  for (const path of info.paths) console.log(path);
  console.log(`systemctl --user daemon-reload`);
  console.log(`systemctl --user disable --now ${info.unit}.service ${info.unit}.timer`);
}

async function cmdWhich(lang) {
  console.log(banner());
  console.log(row(t(lang, "author"), AUTHOR.name));
  console.log(row(t(lang, "repo"), AUTHOR.repo));
  console.log(row("node", process.version));
  console.log(row(t(lang, "status_home"), DATA_DIR));
  console.log(row("bin", join(dirname(fileURLToPath(import.meta.url)))));
}

async function cmdExport(lang) {
  const state = await loadState();
  const body = {
    version: VERSION,
    author: AUTHOR.name,
    repo: AUTHOR.repo,
    lang,
    ...summarize(state),
  };
  console.log(JSON.stringify(body, null, 2));
}

async function cmdPasswd(lang) {
  const oldPass = await secret(t(lang, "ask_pass_plain"));
  const next = await secret(t(lang, "ask_pass"));
  const again = await secret(t(lang, "ask_pass2"));
  if (next !== again) throw new Error(t(lang, "pass_mismatch"));
  await changePassword(oldPass, next);
  console.log(t(lang, "passwd_ok"));
}

async function cmdStatus(lang) {
  const state = await loadState();
  const s = summarize(state);
  if (opts.json) {
    console.log(JSON.stringify({ version: VERSION, lang, ...s }, null, 2));
    return;
  }
  const left = s.remaining != null ? remainingLabel(s.remaining, lang) : "—";
  const mode = s.triggered ? "FIRED" : s.armed ? "ARMED" : "IDLE";
  console.log(banner());
  console.log(row("mode", mode));
  console.log(row(t(lang, "author"), AUTHOR.name));
  console.log(row(t(lang, "status_lang"), lang));
  console.log(row(t(lang, "status_home"), s.home));
  console.log(row(t(lang, "status_setup"), s.setupComplete));
  console.log(row(t(lang, "status_operator"), s.operatorName || "—"));
  console.log(row(t(lang, "status_deadline"), s.deadline ? formatTime(s.deadline, lang) : "—"));
  console.log(row(t(lang, "status_left"), left));
  console.log(row(t(lang, "status_checkin"), formatTime(s.lastCheckIn, lang)));
  console.log(`  ${t(lang, "status_vault")}`);
  if (!s.vault.length) console.log(`  ${t(lang, "empty")}`);
  for (const item of s.vault) {
    console.log(`  ${item.id.slice(0, 8)}  ${(item.kind || item.type).padEnd(8)}  ${item.path}${item.size != null ? `  ${formatBytes(item.size)}` : ""}`);
  }
  console.log(`  ${t(lang, "status_channels")}`);
  for (const [k, on] of Object.entries(s.channelFlags)) {
    console.log(`    ${k.padEnd(10)} ${on ? t(lang, "on") : t(lang, "off")}`);
  }
}

async function cmdLogs(lang) {
  const state = await loadState();
  for (const log of state.logs.slice(0, 40)) {
    console.log(`${formatTime(log.at, lang)}  ${log.level.padEnd(8)}  ${log.text}`);
  }
}

async function cmdAdd(paths, lang) {
  const list = (paths || []).map((p) => String(p).trim()).filter(Boolean);
  if (!list.length) throw new Error(t(lang, "need_path"));
  for (const path of list) {
    const item = await inspectPath(path);
    await updateState((s) => {
      if (s.vault.some((v) => v.path === item.path)) return s;
      s.vault.push({ id: crypto.randomUUID(), ...item, addedAt: Date.now() });
      return s;
    });
    await addLog("info", t(lang, "vault_log", { path: item.path }));
    console.log(
      t(lang, "added", {
        kind: item.kind,
        path: item.path,
        size: item.size != null ? formatBytes(item.size) : item.type,
      })
    );
  }
}

async function cmdRm(id, lang) {
  if (!id) throw new Error(t(lang, "need_id"));
  await updateState((s) => {
    s.vault = s.vault.filter((v) => v.id !== id && v.path !== id && !v.id.startsWith(id));
    return s;
  });
  console.log(t(lang, "removed"));
}

async function cmdInterval(hours, lang) {
  const n = Number(hours);
  if (!n) throw new Error(t(lang, "bad_hours"));
  await updateState((s) => {
    s.intervalMs = Math.max(60 * 1000, n * 3600 * 1000);
    if (s.armed && !s.triggered) s.deadline = computeDeadline(s.intervalMs);
    return s;
  });
  console.log("ok");
}

async function cmdWarning(minutes, lang) {
  const n = Number(minutes);
  if (Number.isNaN(n)) throw new Error(t(lang, "bad_minutes"));
  await updateState((s) => {
    s.warningMs = Math.max(0, n * 60 * 1000);
    return s;
  });
  console.log("ok");
}

async function cmdMessage() {
  const text = await readStdin();
  await updateState((s) => {
    s.message = text.trim();
    return s;
  });
  console.log("ok");
}

async function cmdChannel(name, lang) {
  const patch = {};
  if (opts.on) patch.enabled = true;
  if (opts.off) patch.enabled = false;
  if (opts.token) patch.token = String(opts.token);
  if (opts.chat) patch.chatId = String(opts.chat);
  if (opts.webhook) patch.webhook = String(opts.webhook);
  if (opts.instance) patch.instance = String(opts.instance);
  if (opts.url) patch.url = String(opts.url);
  if (opts.secret) patch.secret = String(opts.secret);
  if (opts.topic) patch.topic = String(opts.topic);
  if (opts.homeserver) patch.homeserver = String(opts.homeserver);
  if (opts.room) patch.roomId = String(opts.room);
  if (opts.host) patch.host = String(opts.host);
  if (opts.port) patch.port = Number(opts.port);
  if (opts.user) patch.user = String(opts.user);
  if (opts.pass) patch.pass = String(opts.pass);
  if (opts.from) patch.from = String(opts.from);
  if (opts.to) patch.to = String(opts.to);
  if (opts.token || opts.webhook || opts.url || opts.host || opts.topic || opts.homeserver) {
    patch.enabled = true;
  }
  await updateState((s) => {
    if (!s.channels[name]) s.channels[name] = {};
    Object.assign(s.channels[name], patch);
    return s;
  });
  console.log(t(lang, "updated", { name }));
}

async function cmdTest(name, lang) {
  if (!name) throw new Error(t(lang, "need_channel"));
  const state = await loadState();
  const config = state.channels[name];
  if (!config) throw new Error(t(lang, "no_channel"));
  const detail = await testChannel(name, config);
  console.log(detail);
}

async function cmdArm(lang) {
  const state = await loadState();
  if (state.triggered) throw new Error(t(lang, "already_fired"));
  if (!state.vault.length) throw new Error(t(lang, "vault_empty"));
  if (!Object.values(state.channels).some((c) => c.enabled)) {
    throw new Error(t(lang, "need_channel_on"));
  }
  await verifyOrThrow(await secret(t(lang, "ask_pass_plain")));
  const sealed = [];
  for (const item of state.vault) {
    try {
      const fresh = await inspectPath(item.path);
      sealed.push({ ...fresh, id: item.id, addedAt: item.addedAt });
    } catch {
      sealed.push(item);
    }
  }
  await updateState((s) => {
    s.vault = sealed;
    s.armed = true;
    s.lastCheckIn = Date.now();
    s.warningSent = false;
    s.deadline = computeDeadline(s.intervalMs);
    return s;
  });
  await addLog("warn", t(lang, "armed_log"));
  console.log(t(lang, "armed"));
  console.log(t(lang, "armed_next"));
}

async function cmdFire(lang) {
  await verifyOrThrow(await secret(t(lang, "ask_pass_plain")));
  const confirm = await ask(t(lang, "ask_fire"));
  if (confirm !== "FIRE") throw new Error(t(lang, "cancelled"));
  const drop = await fire("manual");
  console.log(JSON.stringify(drop.results || drop, null, 2));
}

function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--on") o.on = true;
    else if (a === "--off") o.off = true;
    else if (a.startsWith("--") && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      o[a.slice(2)] = argv[i + 1];
      i += 1;
    } else if (a.startsWith("--")) o[a.slice(2)] = true;
    else o._.push(a);
  }
  return o;
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(q, (ans) => {
      rl.close();
      resolve(ans);
    });
  });
}

function secret(q) {
  if (process.env.DEDHAND_PASS) return Promise.resolve(process.env.DEDHAND_PASS);
  return secretPrompt(q);
}

function optionalSecret(q) {
  if (!process.stdin.isTTY) return Promise.resolve("");
  return secretPrompt(q);
}

function secretPrompt(q) {
  if (!process.stdin.isTTY) return ask(q);
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(q);
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    let value = "";
    const onData = (buf) => {
      const ch = buf.toString("utf8");
      if (ch === "\n" || ch === "\r") {
        cleanup();
        process.stdout.write("\n");
        resolve(value);
        return;
      }
      if (ch === "\u0003") process.exit(130);
      if (ch === "\u007f" || ch === "\b") {
        value = value.slice(0, -1);
        return;
      }
      value += ch;
    };
    function cleanup() {
      stdin.removeListener("data", onData);
      stdin.setRawMode(Boolean(wasRaw));
    }
    stdin.on("data", onData);
  });
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => {
      data += c;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}
