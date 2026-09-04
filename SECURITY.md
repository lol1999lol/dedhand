# Security

**DEDHAND** by [lol1999lol](https://github.com/lol1999lol) is a dead-hand daemon for a machine **you** control.

It publishes files you selected — including **your** zip archives and database dumps — only to channels whose credentials **you** supplied.

## Safe use

1. Add only paths you own.
2. Use only API tokens / bots / webhooks you created.
3. Keep `data/` off git (passphrase hashes and the machine key live there).
4. Run `node bin/dedhand.js doctor` after setup.

## Do not

- Point the vault at anyone else's files, zips, or databases
- Feed it stolen API tokens
- Treat it as undetectable, uncrackable, or a hiding tool
- Open a public issue that includes tokens, paths, or a live payload

## Report a vulnerability

Private advisory: https://github.com/lol1999lol/dedhand/security/advisories

Include Node version, OS, and reproduction steps. Do not attach live vault contents.

## Trust model

The check-in passphrase proves the operator is alive. The daemon must still decrypt state after reboot, so the machine key lives on disk (`data/.key`, mode `0600`). Root on that host can always stop the service or read the key. That is by design.

Author: **lol1999lol** · https://github.com/lol1999lol/dedhand
