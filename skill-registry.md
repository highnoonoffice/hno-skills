---
title: "Skill Registry"
created: 2026-03-18
modified: 2026-03-18T17:58:00-05:00
tags: [skills, registry, reference, index]
status: active
---

# Skill Registry

Operational registry for all skills available to Magnus. One row per skill — trigger phrases, dependencies, last verified, known limitations. Update this file whenever a skill is added, modified, or confirmed working/broken.

---

## Published Skills (ClawHub)

### ghost-publishing-pro (v1.0.4)
- **Fires when:** publishing Ghost posts, sending newsletters, migrating blogs, Ghost API errors, image uploads, scheduling, analytics
- **Trigger phrases:** "publish to Ghost", "send newsletter", "Ghost API", "update post", "migrate from Squarespace/WordPress/Substack"
- **Credentials:** `~/.openclaw/credentials/ghost-admin.json` — `{ url, key }` (Admin API key from Ghost Settings > Integrations)
- **Dependencies:** Ghost Admin API, Node.js (JWT generation — no npm needed)
- **Last verified:** 2026-03-18 ✅
- **ClawHub:** https://clawhub.ai/highnoonoffice/ghost-publishing-pro
- **Publish method:** Direct API via `cli/clawhub-api.md` — never use the browser importer
- **Known limitations:** `email_segment` only fires on first publish — missed it means manual resend from Ghost admin. Theme uploads require browser automation (owner-level only).

### brain-map-visualizer (v2.3.0)
- **Fires when:** brain map questions, graph visualization, co-access analysis, vault structure questions
- **Trigger phrases:** "brain map", "update the graph", "rebuild brain map", "co-access", "node graph"
- **Credentials:** None
- **Dependencies:** D3.js, React, Node.js 18+, session journals in `memory/journal/YYYY-MM-DD.md`
- **Last verified:** 2026-03-18 ✅
- **ClawHub:** https://clawhub.ai/highnoonoffice/brain-map-visualizer
- **Publish method:** Direct API via `cli/clawhub-api.md` — never use the browser importer
- **Known limitations:** Graph rebuilds are not real-time — run `node scripts/build-brain-map.js` to refresh. Reader panel (double-click to open file) requires `/api/read-file` endpoint in host app.
- **Planned v3 features (logged 2026-03-18):**
  - **Session filter UI** — select a date or session ID, graph highlights only nodes accessed that session, dims everything else. Data already exists in journal `files_accessed` arrays. Mostly a UI layer.
  - **Gap detection** — define canonical file sets per task type (e.g. "ClawHub publish" should always touch `credentials/clawhub.json`, the skill file, and the publish script). If a session graph shows a node missing from the expected set, it lights up in a distinct color (red or unfilled). Diagnostic tool: see what *should* have been pulled but wasn't.
  - **Expected files config** — lightweight JSON map of task types → required files. Maintained manually, drives gap detection layer. Not complex to build, but requires intentional design before wiring in.

---

## Internal Skills (Vault-local)

### hno-github
- **Fires when:** pushing code, creating repos, managing PAT, PR workflow, commit conventions, GitHub permission errors
- **Trigger phrases:** "push to GitHub", "create a PR", "new repo", "GitHub token", "commit this", "deploy"
- **Credentials:** `~/.openclaw/credentials/github.json` — fine-grained PAT, all highnoonoffice repos
- **Dependencies:** `gh` CLI (authenticated), git
- **Last verified:** 2026-03-18 ✅
- **Known limitations:** Repo rename/delete/create requires admin scope — not in current PAT. Ask Joseph to do those in GitHub settings. PAT expires 2026-06-07.

### mission-control-ops
- **Fires when:** Mission Control is down, restart needed, log tailing, deploy after code change, Tailscale troubleshooting
- **Trigger phrases:** "Mission Control is down", "restart", "tail logs", "deploy mission control", "launchd", "hno-mac-mini.local"
- **Credentials:** None (uses local launchctl)
- **Dependencies:** launchctl, Node.js, npm, OpenClaw gateway
- **Last verified:** 2026-03-18 ✅
- **Known limitations:** Tailscale off-LAN access unverified — failed at BitDevs 2026-03-10, root cause unknown. ttyd not wired to launchd yet.

### yaml-frontmatter
- **Fires when:** creating or updating any vault .md file, ensuring YAML consistency
- **Trigger phrases:** "add front matter", "fix YAML", "create a markdown file", (implicit — fires on any file creation)
- **Credentials:** None
- **Dependencies:** None
- **Last verified:** 2026-02-20 ✅
- **Known limitations:** None known.

### youtube-pipeline
- **Fires when:** YouTube metadata edits, thumbnail generation/upload, playlist management, channel audit
- **Trigger phrases:** "update titles", "retitle", "thumbnail", "playlist audit", "YouTube Studio", "metadata overhaul", "pillar"
- **Credentials:** `~/.openclaw/credentials/youtube-api.json` — YouTube Data API v3 key
- **Dependencies:** YouTube Data API v3, Python + Pillow (thumbnails), FLUX/Replicate (image generation)
- **Last verified:** 2026-03-06 ✅
- **Known limitations:** YouTube API doesn't expose impressions/CTR/watch time without OAuth (not set up). Studio throttles thumbnail uploads — upload one at a time.

---

## OpenClaw Built-ins

### healthcheck
- **Fires when:** security audits, firewall/SSH hardening, OpenClaw version checks, risk posture, cron scheduling for periodic checks
- **Credentials:** None
- **Last verified:** Not yet used in HNO context
- **Notes:** See `skills/openclaw-builtins/README.md`

### skill-creator
- **Fires when:** creating, editing, improving, or auditing a skill or SKILL.md file
- **Credentials:** None
- **Last verified:** Not yet used in HNO context
- **Notes:** See `skills/openclaw-builtins/README.md`

### slack
- **Fires when:** controlling Slack — reacting, pinning, reading, sending messages
- **Credentials:** Slack API token (configured in openclaw.json)
- **Last verified:** 2026-03-11 ✅ (Second Brain weekly synthesis reads #sb-inbox)
- **Notes:** Read-only scope only — write scope intentionally not granted

### video-frames
- **Fires when:** extracting frames or short clips from videos using ffmpeg
- **Credentials:** None
- **Dependencies:** ffmpeg
- **Last verified:** Not yet used in HNO context
- **Notes:** See `skills/openclaw-builtins/README.md`

### weather
- **Fires when:** current weather, temperature, or forecasts for any location
- **Credentials:** None (uses wttr.in or Open-Meteo — no API key needed)
- **Last verified:** Not yet used in HNO context
- **Notes:** See `skills/openclaw-builtins/README.md`

---

## Skill Gaps (Should Exist — Don't Yet)

| Missing Skill | Would Fire When | Priority |
|--------------|----------------|----------|
| lobster-university | Writing and delivering daily Lobster University entries | Medium |
| content-pipeline | Full HNO article workflow — stage moves, model routing, voice checks | Medium |
| image-generation | Replicate/FLUX image generation requests | Low |
| protonmail | Drafting, reviewing, and sending email via ProtonMail | Low |
