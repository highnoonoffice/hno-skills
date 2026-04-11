---
title: "OpenClaw Built-in Skills — HNO Notes"
created: 2026-03-18
modified: 2026-03-18T11:40:00-05:00
tags: [skills, openclaw, builtins, reference]
status: active
---

# OpenClaw Built-in Skills — HNO Notes

These skills ship with OpenClaw and live at `/opt/homebrew/lib/node_modules/openclaw/skills/`. Do not edit them directly — they're updated via `npm update openclaw`. This file documents HNO-specific usage notes, gotchas, and context for each.

Full skill documentation is in each skill's own SKILL.md at the path above.

---

## healthcheck

**What it does:** Security audits, firewall/SSH hardening, OpenClaw version checks, risk posture review, cron scheduling for periodic checks.

**HNO usage:** Not yet used in a formal audit session. Candidate for a quarterly security review cron — check OpenClaw version, SSH exposure, firewall state, service hardening.

**HNO-specific notes:**
- Machine: Apple M4 Mac mini, macOS 15.5, Minneapolis home network
- No SSH configured yet (TOOLS.md placeholder)
- Services exposed on LAN: port 3000 (Mission Control), 9900 (filedrop), 18789 (gateway)
- No public-facing services — all LAN-only plus Tailscale (unverified)

---

## skill-creator

**What it does:** Creates, edits, improves, or audits agent skills. Triggers on "create a skill", "author a skill", "tidy up a skill", "improve this skill", "audit the skill".

**HNO usage:** Used implicitly throughout skill development. Formally, this skill should be read before starting any new skill build to ensure correct structure, security checklist, and ClawHub publish gate is followed.

**HNO-specific notes:**
- ClawHub publish gate: write → security self-analysis → Joseph approval → publish. No exceptions.
- Security checklist: no `../` paths, no `exec`/`child_process`, no hardcoded machine paths, no credential values in skill content
- Pull `memory/joseph-voice.md` before writing any public-facing skill description
- Reference: `memory/oc-brain-map-skill.md` and `.learnings/LEARNINGS.md` for lessons from past skill builds

---

## slack

**What it does:** Controls Slack — reacting to messages, pinning/unpinning items, reading channels, sending messages.

**HNO usage:** Active. Used for Second Brain weekly synthesis — reads `#sb-inbox` channel every Sunday (cron: `second-brain-weekly`). Read-only scope is intentional and sufficient for current use.

**HNO-specific notes:**
- Slack workspace: Joseph's personal Slack
- `#sb-inbox` channel ID: `C0AGZG13NFL`
- Read-only API token only — write scope intentionally not granted
- Cron model switched to Haiku (2026-03-16) — was GPT-5.2, caused rate limit failures
- No message sending from Magnus to Slack currently configured

---

## video-frames

**What it does:** Extracts frames or short clips from videos using ffmpeg.

**HNO usage:** Not yet used formally via this skill. ffmpeg has been used directly (OpenClaw promo video OC_v1–v11, 2026-03-01) — see `memory/stale.md` > Video Production Knowledge for the full ffmpeg + Pillow workflow built during that session.

**HNO-specific notes:**
- This ffmpeg build has **no freetype/drawtext support** — all text overlay must go through Python/Pillow
- Font paths confirmed working: Impact at `/System/Library/Fonts/Supplemental/Impact.ttf`, Helvetica at `/System/Library/Fonts/Helvetica.ttc`
- Apple Color Emoji cannot be loaded via Pillow — use osascript workaround

---

## weather

**What it does:** Current weather and forecasts via wttr.in or Open-Meteo. No API key needed.

**HNO usage:** Not yet used. Candidate for Today tab enrichment — local weather card alongside the daily quote and Signal of the Day. Location: Minneapolis, MN (America/Chicago timezone).

**HNO-specific notes:**
- Preferred location string: "Minneapolis, MN" or lat/lon 44.9778,-93.2650
- wttr.in supports JSON output: `curl wttr.in/Minneapolis?format=j1`
- Could feed a weather widget into Mission Control Today tab
