---
name: Local vs remote real system stats
description: Pattern for a dashboard that runs on one of the machines it monitors and must show real (never fabricated) stats for itself and a second remote machine.
---

When an app is designed to run directly on one of N machines it needs to report stats for (e.g. a home-server dashboard deployed onto one of two NAS/servers), split the data path by host role instead of using one network protocol for all of them:

- **Local host** (the one actually running the process): read stats with native OS calls / proc filesystem directly — no network hop, no credentials needed. E.g. `/proc/stat` diffed over time for CPU%, `/sys/class/thermal` for temps, `free -b` for RAM, `df` for disk, `/sys/class/drm/*` (Intel iGPU) or `nvidia-smi` (dedicated GPU) for GPU.
- **Remote host(s)**: fetch over SSH (or another remote protocol) using credentials stored as secrets; every remote metric must independently handle "unreachable"/"unauthenticated" and degrade to an explicit unavailable state rather than blocking the whole response.

**Why:** Fabricating a plausible-looking number when a sensor/host is unavailable erodes trust in a monitoring tool — the user needs to know when the data is real vs missing (e.g. GPU sysfs paths not present on all chipsets, `smartctl` needing root, remote LAN host unreachable from a cloud dev sandbox).

**How to apply:** Wrap every individual metric fetch in a helper that returns `{available: boolean, data?, reason?}` so partial failures (e.g. disk temp unavailable but RAM fine) don't take down the rest of the response, and surface the `reason` string in the UI (localized) instead of hiding it. Note this also means dev/cloud sandboxes will legitimately show the "local" numbers of the sandbox itself, and remote LAN-only hosts will show "unreachable" until run on the real network — that's correct behavior, not a bug.
