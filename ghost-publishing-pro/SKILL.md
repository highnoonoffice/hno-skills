---
name: ghost-publishing-pro
description: Full Ghost CMS publishing skill with autonomous agent operations guide. Covers: publish + send newsletter in one API call, migrate from Squarespace/WordPress/Substack, batch post updates, image uploads, YouTube video posts, book-style typography, SEO metadata, Ghost webhooks, analytics, multi-site management, OpenClaw cron integration, and Ghost's permission model (integration token vs owner-only constraints, code injection workarounds, browser automation patterns). Use when publishing Ghost posts, sending newsletters, migrating blogs, batch updating content, scheduling posts, pulling analytics, or debugging Ghost API permission errors. Built by Joseph Voelbel from real production use.
---

# Ghost Publishing Pro

Full Ghost CMS publishing skill built from real production use. Not a generic API wrapper — this contains proven workflows, hard-won pitfalls, and patterns from actually running a Ghost Pro newsletter and migrating an entire Squarespace blog in an afternoon.

**Built by:** Joseph Voelbel

## Quick Setup

**Credentials file:** `~/.openclaw/credentials/ghost-admin.json`
```json
{
  "url": "https://your-site.ghost.io",
  "key": "id:secret"
}
```

Get your key: Ghost Admin → Settings → Integrations → Add custom integration → Admin API Key

Read credentials: `cat ~/.openclaw/credentials/ghost-admin.json`

## Two Access Paths

**Primary — Admin API:** All programmatic operations. Fast, reliable, no browser needed.

**Fallback — Browser:** Ghost admin UI at `{url}/ghost` for operations the API handles awkwardly (Lexical card insertions, visual tweaks, manual newsletter resend). Use browser automation when API isn't enough.

**Sub-admin setup (recommended for agents):**
Create a dedicated agent email (e.g., ProtonMail), invite it as a Ghost admin (Settings → Staff → Invite people). Agent has full admin access via both API and browser, but owner account stays separate. Revoke agent access without touching your owner credentials.

## Authentication

Ghost uses short-lived JWT tokens. Generate one before every API call — they expire in 5 minutes.

**Pure Node.js (no npm required):**
```bash
node -e "
const crypto=require('crypto');
const creds=JSON.parse(require('fs').readFileSync(process.env.HOME+'/.openclaw/credentials/ghost-admin.json','utf8'));
const [id,secret]=creds.key.split(':');
const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT',kid:id})).toString('base64url');
const n=Math.floor(Date.now()/1000);
const p=Buffer.from(JSON.stringify({iat:n,exp:n+300,aud:'/admin/'})).toString('base64url');
const s=crypto.createHmac('sha256',Buffer.from(secret,'hex')).update(h+'.'+p).digest('base64url');
console.log(JSON.stringify({token:h+'.'+p+'.'+s,url:creds.url}));
"
```

Use `Authorization: Ghost {token}` header on all requests.

## Core Operations

### Publish a post + send as newsletter (one call)
```bash
curl -s -X POST "{url}/ghost/api/admin/posts/?source=html" \
  -H "Authorization: Ghost {token}" \
  -H "Content-Type: application/json" \
  -d '{"posts":[{
    "title": "Your Title",
    "html": "<p>Your content</p>",
    "status": "published",
    "email_segment": "all"
  }]}'
```

**This is the killer feature.** One API call publishes to the web AND sends to all subscribers simultaneously. Do not publish first and try to send separately — use Ghost admin to manually resend if you miss this.

### Create a draft
Same as above but `"status": "draft"`. No email sent.

### Update an existing post
```bash
# 1. Fetch post to get updated_at (required)
curl -s "{url}/ghost/api/admin/posts/{id}/" -H "Authorization: Ghost {token}"

# 2. Update with updated_at included
curl -s -X PUT "{url}/ghost/api/admin/posts/{id}/?source=html" \
  -H "Authorization: Ghost {token}" \
  -H "Content-Type: application/json" \
  -d '{"posts":[{"html":"<p>New content</p>","updated_at":"{fetched_updated_at}"}]}'
```

### List posts
```bash
curl -s "{url}/ghost/api/admin/posts/?limit=15&filter=status:draft&fields=id,title,slug,status,updated_at" \
  -H "Authorization: Ghost {token}"
```

### Upload image
```bash
curl -s -X POST "{url}/ghost/api/admin/images/upload/" \
  -H "Authorization: Ghost {token}" \
  -F "file=@/path/to/image.jpg" \
  -F "purpose=image"
# Returns URL — use as feature_image value
```

### Schedule a post
Add `"status": "scheduled"` and `"published_at": "2026-03-20T18:00:00.000Z"` (UTC).

## HTML Content

Always use `?source=html` parameter. Ghost accepts raw HTML in the `html` field.

**Standard article:** `<p>`, `<h2>`, `<h3>`, `<hr>`, `<blockquote>`, `<ul>`, `<ol>`

**Book-style literary typography** (ideal for fiction, essays, and long-form literary content):
```html
<div style="font-family: Georgia, serif; text-align: justify; hyphens: auto; -webkit-hyphens: auto;" lang="en">
  <p style="text-indent: 2em; margin-bottom: 0; margin-top: 0;">Paragraph one.</p>
  <p style="text-indent: 2em; margin-bottom: 0; margin-top: 0;">Paragraph two — no gap, indent only.</p>
</div>
```

**YouTube embed:**
```html
<figure class="kg-card kg-embed-card">
  <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/{VIDEO_ID}"
    frameborder="0" allowfullscreen></iframe>
</figure>
```

**Email rules (critical):**
- JS stripped in email delivery — no scripts or interactive elements
- Subscribe widgets are web-only — stripped from email
- Ghost wraps in its own email template — don't add headers/footers
- Publish + `email_segment` must be in the same API call

## Autonomous Agent Operations

See `references/workflows.md` → Workflow 14 for the complete guide to running Ghost autonomously, including:
- Ghost's two-tier permission model (integration token vs. owner-level)
- 5 documented constraints with root causes and workarounds
- Code Injection as a structural fix when theme uploads fail
- Known API field behaviors (`?source=html`, Lexical vs HTML, `updated_at` locking)

## Migration Workflows

See `references/workflows.md` for full migration playbooks including:
- Squarespace XML export → Ghost batch import (proven: full blog migrated in one afternoon)
- WordPress XML migration
- Substack CSV + HTML migration
- Batch feature image updates
- DOCX → book-style Ghost posts with YouTube embeds

## API Reference

See `references/api.md` for complete endpoint documentation, error codes, and token generation details.

## Common Pitfalls

- `409 on PUT` — must include `updated_at` from a fresh fetch
- Email not sending — `email_segment` only fires on first publish; use Ghost admin to resend
- Rate limiting — add 500ms delay between calls in batch scripts
- Token expired mid-batch — regenerate every 50 posts in long operations
