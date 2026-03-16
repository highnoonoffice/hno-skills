---
name: mission-control-ops
description: Operate, troubleshoot, deploy, and maintain HNO Mission Control (local Next.js app). Use when Joseph says: "Mission Control is down", "restart Mission Control", "restart gateway", "tail logs", "deploy mission control", "runbooks", "launchd", "ttyd", "filedrop", "hno-mac-mini.local", or asks about remote access (Tailscale).
---

# Mission Control Ops

This is the single brain for keeping Mission Control and the local HNO stack alive.

Scope:
- Mission Control web UI (Next.js)
- OpenClaw gateway daemon
- launchd services for Mission Control, filedrop, brain map, terminal (ttyd)
- Hostname and LAN access rules
- Remote access notes (Tailscale)

## First principles

- Prefer hostname over IP: use `hno-mac-mini.local` (DHCP changes).
- Restart the smallest thing first (tab refresh, then service restart, then deeper).

## Quick triage checklist

1) Is it just the browser?
- Refresh.
- Hard refresh.
- Try the URL with hostname: `http://hno-mac-mini.local:3000/mission-control`

2) Is the service running?
- Check gateway: `openclaw gateway status`
- Check overall: `openclaw status --all`

3) If Mission Control UI is stale after code edits
- If running production mode, source edits require a rebuild:
  - `cd /Users/hnoadmin/.openclaw/vault/hno-mission-control && npm run build`
  - Restart service (launchd kickstart)

## Common commands

- Restart OpenClaw gateway:
  - `openclaw gateway restart`

- Tail OpenClaw logs:
  - `openclaw logs --limit 200 --plain --local-time`

- Restart Mission Control (launchd):
  - `launchctl kickstart -k gui/$(id -u)/ai.magnus.mission-control`

- Repo status:
  - `cd /Users/hnoadmin/.openclaw/vault/hno-mission-control && git status`

## Remote access (Tailscale)

Use Tailscale when Joseph is off-LAN and needs Mission Control or other local services.

Notes to carry forward:
- Joseph tested Tailscale at BitDevs and it did not work as expected.
- When troubleshooting, verify:
  - both devices are logged in and online
  - MagicDNS or the actual Tailscale IP is being used
  - subnet routing and ACLs (if any) are correct
  - local firewall and router are not blocking required ports

(If you want the exact failure symptoms and what you changed that night, paste them and I’ll codify it here.)
