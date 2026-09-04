# Security

Dedhand is a **dead-hand daemon for a machine you control**. It publishes files you selected to channels whose credentials you supplied.

## Do not

- Point the vault at anyone else's files
- Feed it stolen API tokens
- Treat it as undetectable, uncrackable, or a hiding tool
- Open a public issue that includes tokens, paths, or a live payload

## Report a vulnerability

Open a **private** GitHub security advisory, or email the maintainer listed on the repository. Include Node version, OS, and reproduction steps. Do not attach live vault contents.

## Trust model

The check-in passphrase proves the operator is alive. The daemon must still decrypt state after reboot, so the machine key lives on disk (`data/.key`, mode `0600`). Root on that host can always stop the service or read the key. That is by design, not a bypass.
