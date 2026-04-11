---
title: "HNO GitHub Skill"
created: 2026-03-09
modified: 2026-03-18T11:35:00-05:00
tags: [skill, github, git, deployment, credentials]
status: active
---

# HNO GitHub

Operational GitHub skill for the highnoonoffice org. Everything here was learned from actually doing it — including the parts that failed first.

---

## Credentials

PAT stored at: `~/.openclaw/credentials/github.json`

```bash
cat ~/.openclaw/credentials/github.json
# { "token": "github_pat_...", "registry": "https://clawhub.ai" }
```

The PAT is fine-grained, scoped to **all repositories** in the highnoonoffice org (expanded 2026-03-18). Covers: contents, pull requests, metadata.

**Does NOT cover:** repo rename, repo delete, repo creation — those require admin scope. For those actions, ask Joseph to do it in GitHub settings.

**Expiry:** June 7 2026. Renew before then. Renewal requires a verification code from Joseph (GitHub sends to thehighnoonoffice@gmail.com).

Use `gh` CLI for most operations — it reads the keyring token automatically:
```bash
gh auth status  # verify auth
gh repo list highnoonoffice --limit 20  # list repos
```

---

## Repos

| Repo | Purpose | Visibility |
|------|---------|------------|
| `highnoonoffice/mission-control` | HNO Mission Control Next.js dashboard | Private |
| `highnoonoffice/hno-skills` | ClawHub skills (ghost-publishing-pro, brain-map-visualizer) | Public |
| `highnoonoffice/ghost-theme` | joseph-theme custom Ghost theme | Public |
| `highnoonoffice/lovable-tools` | Lovable.dev scratch builds (Lexicon, etc.) | Private |

---

## Branch + PR Rules (HARD)

- **Small fixes, data updates, config tweaks** → push direct to `main`
- **New features, new tabs, multi-file builds, refactors** → `feature/[name]` branch → PR → send Joseph the link → wait for merge
- **Always send the PR link** in the same message when opening a PR
- **Ops Queue task must exist BEFORE writing code** on any medium-to-large feature

```bash
# Feature branch workflow
git checkout -b feature/[short-description]
# ... make changes ...
git add -A && git commit -m "feat: description"
git push origin feature/[short-description]
gh pr create --repo highnoonoffice/REPO --base main --head feature/[name] --title "..." --body "..."
# Send PR link to Joseph, wait for merge
```

---

## Commit Conventions

`type: short description`

| Type | Use For |
|------|---------|
| `feat:` | New capability |
| `fix:` | Bug fix |
| `data:` | Data-only update (JSON, no code) |
| `refactor:` | Restructure without behavior change |
| `chore:` | Version bumps, dependency updates, cleanup |
| `milestone:` | Significant project moment |

---

## Quick Operations

### Push direct to main (small fix)
```bash
cd /path/to/repo
git add -A && git commit -m "fix: description" && git push origin main
```

### Mission Control full deploy
```bash
cd /Users/hnoadmin/.openclaw/vault/hno-mission-control
npm run build && launchctl kickstart -k gui/$(id -u)/ai.magnus.mission-control
curl -s -o /dev/null -w "%{http_code}" http://hno-mac-mini.local:3000/mission-control
```

### Check PR status
```bash
gh pr list --repo highnoonoffice/mission-control
gh pr view 10 --repo highnoonoffice/mission-control --json state,mergedAt
```

---

## Common Errors

| Error | Fix |
|-------|-----|
| `403 Resource not accessible by personal access token` | Action requires admin scope — ask Joseph to do it in GitHub settings |
| `404 Could not resolve to a Repository` | Repo not in PAT scope, or repo doesn't exist — verify with `gh repo list highnoonoffice` |
| `409 on git push` | Local branch behind remote — `git pull --rebase` first |

---

## References

- `references/operations.md` — extended troubleshooting, token renewal procedure, autonomous PAT generation flow
