# HNO GitHub Operations Reference

Operational knowledge built from real use. This is not a GitHub docs mirror — it's what we've learned running the highnoonoffice org.

---

## Credentials

**Credentials file:** `~/.openclaw/credentials/github.json`

Fields:
- `token` — Fine-grained PAT (repo-scoped, limited to specific repos)
- `token_classic` — Classic PAT with `repo` scope (can push to any org repo, create repos)
- `token_classic_expires` — Expiration date (renew before this)
- `org` — `highnoonoffice`

**Which token to use:**
- Pushing to `mission-control`: either token works (fine-grained covers it)
- Creating new repos: `token_classic` required
- Pushing to any new repo: `token_classic` required
- Fine-grained PAT cannot create repos or push to repos it wasn't scoped to at creation time

**Token in git remote URL:**
```bash
git remote set-url origin "https://highnoonoffice:${TOKEN}@github.com/highnoonoffice/repo-name.git"
```

---

## Repositories

| Repo | Purpose | Token needed |
|------|---------|-------------|
| `highnoonoffice/mission-control` | HNO Mission Control Next.js app | fine-grained or classic |
| `highnoonoffice/ghost-theme` | joseph-theme custom Ghost theme | classic |
| `highnoonoffice/hno-skills` | ClawMart skills (ghost-publishing-pro etc) | classic |

---

## Commit Conventions (HNO Standard)

**Format:** `type: short description`

Types:
- `feat:` — new feature or capability
- `fix:` — bug fix
- `refactor:` — restructure without behavior change
- `data:` — data-only update (JSON files, no code change)
- `milestone:` — significant project milestone
- `session close:` — session end summary commit (memory/journal)

**Branch + PR rules (from IDENTITY.md):**
- Small fixes, data updates → push direct to `main`
- New features, multi-file changes, new tabs → feature branch → PR for Joseph to approve
- Branch naming: `feature/[short-description]`
- PR title should match Ops Queue task title

---

## Creating a New Repo

**Via API (requires classic token with `repo` scope):**
```bash
TOKEN=$(cat ~/.openclaw/credentials/github.json | python3 -c "import sys,json; print(json.load(sys.stdin)['token_classic'])")
curl -s -X POST "https://api.github.com/user/repos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -d "{\"name\":\"repo-name\",\"description\":\"Description\",\"private\":false,\"auto_init\":false}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('created:', d.get('full_name', d.get('message','error')))"
```

Note: `POST /orgs/{org}/repos` requires org admin permission. `POST /user/repos` creates under the authenticated user's org context and works with classic PAT.

**Via browser (when token lacks permission):**
1. Navigate to `https://github.com/organizations/highnoonoffice/repositories/new`
2. GitHub is logged in via the OpenClaw browser (port 18800)
3. Fill `#repository-name-input` with repo name via `type` action
4. Set description via `ref` from snapshot
5. Click "Create repository" button

---

## Pushing an Existing Repo

```bash
TOKEN=$(cat ~/.openclaw/credentials/github.json | python3 -c "import sys,json; print(json.load(sys.stdin)['token_classic'])")
cd /path/to/repo
git init  # if not already a git repo
git add -A
git commit -m "feat: initial commit"
git remote add origin "https://highnoonoffice:${TOKEN}@github.com/highnoonoffice/repo-name.git"
git branch -M main
git push -u origin main
```

---

## Generating a New Classic Token (Autonomous Flow)

When the classic token is expired or missing, generate a new one via browser:

1. Navigate to `https://github.com/settings/tokens/new`
2. GitHub will require sudo mode verification — click "Verify via email"
3. Email goes to `thehighnoonoffice@gmail.com` (NOT ProtonMail) — need verification code from Joseph
4. Once verified, the token form appears
5. Focus `#repository-name-input` field, type the note
6. Check the `repo` checkbox: `Array.from(document.querySelectorAll('input[type=checkbox][value=repo]'))[0].click()`
7. Click Generate token button: `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Generate token')).click()`
8. Extract token: `document.querySelector('.blob-code, code, [data-testid*=token], #new-oauth-token')?.textContent?.trim()`
9. Store in `~/.openclaw/credentials/github.json` as `token_classic`

**Note:** Classic tokens expire. Default is 30 days. Track `token_classic_expires` in credentials file and set a reminder to regenerate before expiry.

---

## Mission Control Deploy Flow

After making changes to Mission Control:

```bash
cd /Users/hnoadmin/.openclaw/vault/hno-mission-control

# 1. Build
npm run build

# 2. Restart service
launchctl stop ai.magnus.mission-control
sleep 2
launchctl start ai.magnus.mission-control

# 3. Verify
curl -s -o /dev/null -w "%{http_code}" http://hno-mac-mini.local:3000/mission-control

# 4. Commit + push (small fix = direct to main)
git add -A
git commit -m "fix: description of what changed"
git push origin main
```

For new features: use `feature/` branch and open PR before merging.

---

## Ops Queue Integration

Per IDENTITY.md hard rule: any new Mission Control tab, major feature, or multi-file build MUST have an Ops Queue task created BEFORE writing the first line of code.

Ops Queue data: `/Users/hnoadmin/.openclaw/vault/hno-mission-control/data/ops-queue.json`

After completing GitHub work: mark relevant Ops Queue steps done and push updated ops-queue.json.

---

## Common Errors

**403 Permission denied to highnoonoffice:**
→ Fine-grained PAT doesn't cover this repo. Use `token_classic`.

**`Resource not accessible by personal access token` on `/orgs/{org}/repos`:**
→ PAT lacks `admin:org` scope. Use `/user/repos` endpoint instead — creates repo under authenticated user (which is the org).

**`LIMIT_UNEXPECTED_FILE` on Ghost theme upload:**
→ Not a GitHub error — see Ghost Publishing Pro skill for Ghost-specific constraints.

**Trailing comma in JSON causes parse error on `git show`:**
→ The committed file had a JSON syntax error. Restore from previous clean commit. Always validate JSON before committing data files.

---

## Token Renewal Reminder

The classic PAT (`token_classic`) expires on the date in `token_classic_expires`. Before that date:
1. Navigate to `https://github.com/settings/tokens`
2. Find "Magnus HNO full repo access" token
3. Click Regenerate
4. Update `token_classic` and `token_classic_expires` in `~/.openclaw/credentials/github.json`
