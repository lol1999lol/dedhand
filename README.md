# DEDHAND

```
╔══════════════════════════════════════════════╗
║ DEDHAND                                      ║
║ v2.0.0  ·  outbound only                     ║
║ locked state  ·  no bind  ·  your channels   ║
╚══════════════════════════════════════════════╝
```

Headless dead-hand protocol for a machine **you** control. No website. No inbound port.

Miss check-in — or have the vault deleted/altered — and selected files are packed, mirrored, and pushed to **accounts whose credentials you supplied**.

## Install

```bash
git clone https://github.com/lol1999lol/dedhand.git
cd dedhand
npm install
node bin/dedhand.js setup
node bin/dedhand.js add /path/you/own
node bin/dedhand.js telegram --token BOT --chat CHATID
node bin/dedhand.js doctor
node bin/dedhand.js arm
node bin/dedhand.js install-service
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now session-helper.service
systemctl --user enable --now session-helper.timer
loginctl enable-linger "$USER"
```

Telegram check-in: `in <passphrase>`

## Commands

| Command | Role |
|---|---|
| `setup` / `passwd` | Identity |
| `status` / `status --json` / `export` / `which` / `doctor` / `logs` | Observe |
| `add` / `rm` | Vault |
| `arm` / `checkin` / `disarm` / `fire` / `reset` | Protocol |
| `daemon` / `tick` | Core |
| `install-service` / `uninstall-service` | systemd |
| `telegram` `discord` `slack` `mastodon` `webhook` `ntfy` `matrix` `gotify` `email` | Channels |
| `lang` / `langs` / `version` | Meta |

Passphrase: 12+ characters, letters and digits. Arming seals SHA-256 of vault files.

## Hardening

- AES-256-GCM state, HKDF key, `state.bak`
- scrypt N=32768, lockout after 5 failures
- Dual runner: daemon + systemd timer, file lock
- Publish retries until **every** enabled channel succeeds
- Missing vault path fires immediately; hash drift checked every five minutes
- Default UI is English

Never commit `data/`. See [SECURITY.md](SECURITY.md).

## Author

**lol1999lol** — https://github.com/lol1999lol

## License

MIT © 2026 [lol1999lol](https://github.com/lol1999lol)
