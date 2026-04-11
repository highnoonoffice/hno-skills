---
title: "HNO Skills — Index"
created: 2026-02-20
modified: 2026-03-18T11:35:00-05:00
tags: [skills, index, clawhub, hno]
status: active
---

# HNO Skills

OpenClaw skills published to ClawHub and used internally by Magnus. All skills live in `vault/skills/` and the canonical published versions are in `highnoonoffice/hno-skills` on GitHub.

---

## Published to ClawHub (@highnoonoffice)

| Skill | Version | ClawHub | Status |
|-------|---------|---------|--------|
| ghost-publishing-pro | v1.0.4 | [clawhub.ai/highnoonoffice/ghost-publishing-pro](https://clawhub.ai/highnoonoffice/ghost-publishing-pro) | ✅ Live |
| brain-map-visualizer | v2.3.0 | [clawhub.ai/highnoonoffice/brain-map-visualizer](https://clawhub.ai/highnoonoffice/brain-map-visualizer) | ✅ Live |

---

## Internal Only (vault-local, not published)

| Skill | Purpose |
|-------|---------|
| hno-github | GitHub operations for highnoonoffice org |
| mission-control-ops | Mission Control troubleshooting and deploy |
| yaml-frontmatter | YAML frontmatter consistency across vault |
| youtube-pipeline | YouTube metadata, playlists, thumbnails |

---

## OpenClaw Built-ins (managed by OpenClaw, not HNO)

Located at `/opt/homebrew/lib/node_modules/openclaw/skills/`. Do not edit.

| Skill | Fires When |
|-------|-----------|
| healthcheck | Security audits, firewall/SSH hardening, OpenClaw version checks |
| skill-creator | Creating or improving agent skills |
| slack | Controlling Slack — reactions, pinning, reading, sending |
| video-frames | Extracting frames or clips from videos via ffmpeg |
| weather | Current weather and forecasts |

---

## Convention

Each skill is a subdirectory: `SKILL.md` + optional `references/` subfolder.
Published skills use ClawHub frontmatter format (`name`, `version`, `description`).
Internal skills use vault YAML format (`title`, `created`, `modified`, `tags`, `status`).
