/** DEDHAND by lol1999lol — https://github.com/lol1999lol/dedhand */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chmod, mkdir, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { startInbox } from "./telegram.js";
import { startScheduler } from "./scheduler.js";
import { DATA_DIR, loadState } from "./store.js";
import { AUTHOR } from "./meta.js";
import { debug } from "./net.js";
import { langOf } from "./ops.js";
import { t } from "./i18n.js";

const UNIT = "session-helper";

export async function runDaemon() {
  const state = await loadState();
  if (!state.setupComplete) {
    console.error(t(langOf(state), "daemon_need_setup"));
    process.exit(1);
  }
  process.umask(0o077);
  debug("daemon", AUTHOR.name, DATA_DIR, "armed", state.armed);
  startScheduler();
  startInbox();
  const stop = () => process.exit(0);
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  await new Promise(() => {});
}

export async function writeUserUnit() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const exec = process.execPath;
  const bin = join(root, "bin", "dedhand.js");
  const unitDir = join(homedir(), ".config", "systemd", "user");
  await mkdir(unitDir, { recursive: true });

  const service = `[Unit]
Description=User session helper
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${root}
ExecStart=${exec} ${bin} daemon
Restart=always
RestartSec=2
Environment=DEDHAND_HOME=${DATA_DIR}
NoNewPrivileges=true
PrivateTmp=true
RestrictSUIDSGID=true
LockPersonality=true
RestrictRealtime=true
UMask=0077

[Install]
WantedBy=default.target
`;

  const tickService = `[Unit]
Description=User session helper tick

[Service]
Type=oneshot
WorkingDirectory=${root}
ExecStart=${exec} ${bin} tick
Environment=DEDHAND_HOME=${DATA_DIR}
NoNewPrivileges=true
PrivateTmp=true
UMask=0077
`;

  const timer = `[Unit]
Description=User session helper timer

[Timer]
OnBootSec=20
OnUnitActiveSec=45
AccuracySec=5
Persistent=true
Unit=${UNIT}-tick.service

[Install]
WantedBy=timers.target
`;

  const servicePath = join(unitDir, `${UNIT}.service`);
  const tickPath = join(unitDir, `${UNIT}-tick.service`);
  const timerPath = join(unitDir, `${UNIT}.timer`);
  await writeFile(servicePath, service, { mode: 0o600 });
  await writeFile(tickPath, tickService, { mode: 0o600 });
  await writeFile(timerPath, timer, { mode: 0o600 });
  await chmod(servicePath, 0o600);
  await chmod(tickPath, 0o600);
  await chmod(timerPath, 0o600);
  return { servicePath, tickPath, timerPath, unit: UNIT };
}

export async function removeUserUnit() {
  const unitDir = join(homedir(), ".config", "systemd", "user");
  const paths = [
    join(unitDir, `${UNIT}.service`),
    join(unitDir, `${UNIT}-tick.service`),
    join(unitDir, `${UNIT}.timer`),
  ];
  for (const path of paths) await unlink(path).catch(() => {});
  return { paths, unit: UNIT };
}
