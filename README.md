# DEDHAND

[![CI](https://github.com/lol1999lol/dedhand/actions/workflows/ci.yml/badge.svg)](https://github.com/lol1999lol/dedhand/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![GitHub](https://img.shields.io/github/v/release/lol1999lol/dedhand?include_prereleases&label=github)](https://github.com/lol1999lol/dedhand)
[![stars](https://img.shields.io/github/stars/lol1999lol/dedhand?style=social)](https://github.com/lol1999lol/dedhand)

**by [lol1999lol](https://github.com/lol1999lol)** · public repo: [github.com/lol1999lol/dedhand](https://github.com/lol1999lol/dedhand)

Headless **dead man's switch** / **dead-hand** daemon for Node.js. No website. No inbound port.

If you miss check-in (default **every 24 hours**), or someone deletes your vault files, Dedhand packs **your** files (zip, sqlite, sql dumps) and publishes them to **your** channels (Telegram, Discord, ntfy, email, …).

`dead-man-switch` · `dead-hand` · `daemon` · `telegram` · `nodejs` · `cli` · `security` · `sqlite`

```
╔══════════════════════════════════════════════════════════╗
║ DEDHAND                                                  ║
║ v2.2.0  ·  outbound only  ·  by lol1999lol               ║
║ https://github.com/lol1999lol/dedhand                    ║
╚══════════════════════════════════════════════════════════╝
```

## Install (copy-paste)

You need **Node 20+**.

```bash
git clone https://github.com/lol1999lol/dedhand.git
cd dedhand
npm install
node bin/dedhand.js guide
```

`guide` tells you the next command. Typical first run:

```bash
node bin/dedhand.js setup
node bin/dedhand.js add ./backup.zip ./dump.sql ./app.sqlite
node bin/dedhand.js telegram --token BOT --chat CHATID
node bin/dedhand.js doctor
node bin/dedhand.js arm
node bin/dedhand.js install-service
```

`install-service` writes systemd user units and tries to enable them. If that fails, it prints the commands.

Stay alive: `node bin/dedhand.js checkin`  
Telegram: `in <passphrase>`

### نصب سریع

```bash
git clone https://github.com/lol1999lol/dedhand.git
cd dedhand
npm install
node bin/dedhand.js guide
node bin/dedhand.js setup
```

بعد فایل مال خودت را `add` کن، یک کانال روشن کن، `arm` بزن. هر روز (یا هر چند ساعت که گذاشتی) `checkin` کن. اگر نکنی، آپلود روی اینترنت شروع می‌شود.

## Daily use

| You want | Command |
|---|---|
| What next? | `node bin/dedhand.js guide` |
| Am I ok? | `node bin/dedhand.js status` |
| Check in | `node bin/dedhand.js checkin` |
| Change hours | `node bin/dedhand.js interval 24` |
| Stop the protocol | `node bin/dedhand.js disarm` |
| Language | `node bin/dedhand.js lang fa` |

Passphrase: **12+** characters, letters **and** digits.

## Zip files and databases

```bash
node bin/dedhand.js add ./secrets.zip ./backup.sql ./app.sqlite /var/backups/pg
```

| Kind | Examples | At fire |
|---|---|---|
| Archive | `.zip` `.7z` `.tar.gz` | Packed as-is (not recompressed) |
| Database | `.sqlite` `.db` `.sql` `.dump` `.pgdump` | SQLite snapshot when `sqlite3` is installed |
| Folder | a directory you own | Packed recursively |

Live databases: **deleting** them fires. Writing to them does not. Telegram 49MB / Discord 24MB; bigger files go through mirrors or email.

## Commands

| Command | Role |
|---|---|
| `guide` / `quickstart` | Next step |
| `setup` / `init` | Identity |
| `status` / `doctor` / `which` / `logs` | Observe |
| `add` / `rm` | Vault |
| `arm` / `checkin` / `disarm` / `fire` / `reset` | Protocol |
| `daemon` / `tick` / `install-service` | Keep running |
| `telegram` `ntfy` `discord` `email` … | Your channels |
| `lang` / `version` | Meta |

Non-interactive setup:

```bash
DEDHAND_NAME=lol1999lol DEDHAND_PASS='YourPass12345' DEDHAND_HOURS=24 \
  node bin/dedhand.js setup
```

## Hardening

- AES-256-GCM state, HKDF, `state.bak`
- scrypt with lockout after 5 failures
- Daemon + systemd timer, file lock
- Retries until every enabled channel succeeds
- Never commit `data/`

See [SECURITY.md](SECURITY.md).

## Author

**lol1999lol** owns this project.

- GitHub: https://github.com/lol1999lol
- Repository: https://github.com/lol1999lol/dedhand
- Clone: `git clone https://github.com/lol1999lol/dedhand.git`

MIT © 2026 [lol1999lol](https://github.com/lol1999lol)
