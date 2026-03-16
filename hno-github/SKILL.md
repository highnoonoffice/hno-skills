---
name: hno-github
description: HNO GitHub operational skill — commit, push, create repos, manage tokens, and version HNO code assets. Built from real production use on the highnoonoffice org, not docs. Covers credential management (fine-grained vs classic PAT), repo creation via API and browser, Mission Control deploy flow, commit conventions, branch and PR rules, and autonomous token generation. Use when: (1) pushing code to any highnoonoffice repo, (2) creating a new GitHub repository, (3) committing Mission Control changes and restarting the service, (4) generating or renewing a GitHub PAT, (5) following HNO commit conventions or branch/PR rules, (6) debugging GitHub permission errors.
---

# HNO GitHub

Operational GitHub skill for the highnoonoffice org. Everything here was learned from actually doing it — including the parts that failed first.

## Credentials

Read credentials: `cat ~/.openclaw/credentials/github.json`

Two tokens:
- `token` — Fine-grained PAT, scoped to specific repos. Use for `mission-control` pushes.
- `token_classic` — Classic PAT with `repo` scope. Required for creating repos or pushing to new repos.

Check expiry via `token_classic_expires`. Renew before it expires.

## Quick Operations

### Push to mission-control
```bash
TOKEN=$(cat ~/.openclaw/credentials/github.json | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
cd /Users/hnoadmin/.openclaw/vault/hno-mission-control
git add -A && git commit -m "fix: description" && git push origin main
```

### Push to any other repo (requires classic token)
```bash
TOKEN=$(cat ~/.openclaw/credentials/github.json | python3 -c "import sys,json; print(json.load(sys.stdin)['token_classic'])")
cd /path/to/repo
git remote set-url origin "https://highnoonoffice:${TOKEN}@github.com/highnoonoffice/REPO.git"
git push origin main
```

### Create a new repo
```bash
TOKEN=$(cat ~/.openclaw/credentials/github.json | python3 -c "import sys,json; print(json.load(sys.stdin)['token_classic'])")
curl -s -X POST "https://api.github.com/user/repos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -d '{"name":"repo-name","description":"Description","private":false,"auto_init":false}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('full_name', d.get('message','error')))"
```

### Mission Control full deploy
```bash
cd /Users/hnoadmin/.openclaw/vault/hno-mission-control
npm run build && launchctl stop ai.magnus.mission-control && sleep 2 && launchctl start ai.magnus.mission-control
curl -s -o /dev/null -w "%{http_code}" http://hno-mac-mini.local:3000/mission-control
git add -A && git commit -m "feat: description" && git push origin main
```

## Commit Conventions

`type: short description`

- `feat:` new capability
- `fix:` bug fix
- `data:` data-only update (JSON, no code)
- `refactor:` restructure without behavior change
- `milestone:` significant project moment

## Branch + PR Rules

- Small fixes, data updates → push direct to `main`
- New features, new tabs, multi-file builds → `feature/[name]` branch → PR for Joseph to approve
- Ops Queue task must exist BEFORE writing code on major features

## Repos

| Repo | Purpose |
|------|---------|
| `highnoonoffice/mission-control` | HNO Mission Control Next.js dashboard |
| `highnoonoffice/ghost-theme` | joseph-theme custom Ghost theme |
| `highnoonoffice/hno-skills` | ClawMart skills (ghost-publishing-pro etc.) |

## Common Errors & Fixes

See `references/operations.md` for:
- Permission errors (fine-grained vs classic PAT)
- Autonomous token generation flow (requires verification code from Joseph)
- Repo creation via browser when API is blocked
- JSON trailing comma errors in committed data files
- Token renewal procedure
