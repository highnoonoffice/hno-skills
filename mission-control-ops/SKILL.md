---
title: "Mission Control Ops Skill"
created: 2026-03-03
modified: 2026-03-18T11:35:00-05:00
tags: [skill, mission-control, infrastructure, launchd, ops]
status: active
---

# Mission Control Ops

Single brain for keeping Mission Control and the local HNO stack alive. Use when Joseph says: "Mission Control is down", "restart Mission Control", "restart gateway", "tail logs", "deploy mission control", "runbooks", "launchd", "ttyd", "filedrop", or asks about remote access.

---

## First Principles

- Prefer hostname over IP: always use `hno-mac-mini.local` (DHCP changes the IP — confirmed changed from .56 to .53 on 2026-03-08)
- Restart the smallest thing first: tab refresh → service restart → deeper diagnosis
- Mission Control URL: `http://hno-mac-mini.local:3000/mission-control`

---

## Quick Triage

**1. Is it just the browser?**
```
Hard refresh → try hno-mac-mini.local hostname explicitly
```

**2. Is the gateway alive?**
```bash
openclaw gateway status
openclaw status --all
```

**3. Is Mission Control running?**
```bash
launchctl list | grep magnus
curl -s -o /dev/null -w "%{http_code}" http://hno-mac-mini.local:3000/mission-control
```

**4. Stale UI after code edits?**
```bash
cd /Users/hnoadmin/.openclaw/vault/hno-mission-control
npm run build
launchctl kickstart -k gui/$(id -u)/ai.magnus.mission-control
```

---

## Common Commands

```bash
# Restart OpenClaw gateway
openclaw gateway restart

# Tail logs (last 200 lines)
openclaw logs --limit 200 --plain --local-time

# Restart Mission Control
launchctl kickstart -k gui/$(id -u)/ai.magnus.mission-control

# Stop / start individual services
launchctl stop ai.magnus.filedrop
launchctl start ai.magnus.filedrop

# Check all launchd services
launchctl list | grep ai.magnus

# Resolve current IP if hostname fails
dns-sd -Q hno-mac-mini.local. A
```

---

## Launchd Services

| Service ID | What It Does | Port |
|-----------|-------------|------|
| `ai.magnus.mission-control` | Mission Control Next.js dashboard | 3000 |
| `ai.magnus.filedrop` | HTTP file drop server | 9900 |
| `ai.maple.proxy` | Maple inference proxy | 8080 |
| OpenClaw Gateway | Main agent gateway | 18789 |

Brain map server and board server are no longer standalone — both superseded by Mission Control tabs.

---

## Deploy Flow (after GitHub merge)

```bash
cd /Users/hnoadmin/.openclaw/vault/hno-mission-control
git checkout main && git pull origin main
npm run build
launchctl kickstart -k gui/$(id -u)/ai.magnus.mission-control
sleep 3 && curl -s -o /dev/null -w "%{http_code}" http://hno-mac-mini.local:3000/mission-control
```

---

## Remote Access (Tailscale)

Tailscale is installed but has not been reliably confirmed working for Mission Control access from off-LAN. Joseph tested at BitDevs (2026-03-10) and experienced issues.

**When troubleshooting Tailscale:**
1. Verify both devices show as online in Tailscale admin console
2. Use Tailscale IP directly (not MagicDNS) as first test
3. Check that Mission Control port 3000 is reachable: `curl http://<tailscale-ip>:3000/mission-control`
4. Confirm no local firewall blocking the port: `sudo lsof -i :3000`
5. Router firewall should not matter for Tailscale (it's peer-to-peer encrypted tunnel)

If Tailscale is reliably working, document the verified IP or MagicDNS hostname here.

---

## ttyd (Web Terminal)

ttyd v1.7.7 is installed via Homebrew but not wired to launchd. When needed:
```bash
ttyd -p 7681 zsh  # start manually
# Access at http://hno-mac-mini.local:7681
```
Launchd wiring is pending (Ops Queue).
