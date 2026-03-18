---
name: ghost-publishing-pro
version: 1.0.3
description: Ghost CMS publishing skill built from real production use on a Ghost Pro newsletter — not a generic API wrapper. Covers the full publishing stack: publish + send newsletter in one API call, migrate from Squarespace/WordPress/Substack, book-style literary typography, YouTube embeds, batch updates, image uploads, SEO metadata, analytics, and OpenClaw cron scheduling. Includes Ghost's two-tier API permission model, site header customization patterns, browser-based fallbacks for owner-only operations, and hard-won API pitfalls. Use when publishing Ghost posts, sending newsletters, migrating blogs, or debugging Ghost API errors.
homepage: https://github.com/highnoonoffice/hno-skills
source: https://github.com/highnoonoffice/hno-skills/tree/main/ghost-publishing-pro
credentials:
  - name: GHOST_ADMIN_URL
    description: Your Ghost site URL (e.g. https://your-site.ghost.io)
    required: true
  - name: GHOST_ADMIN_KEY
    description: Admin API key in id:secret format — Ghost Admin > Settings > Integrations
    required: true
  - name: credentials_file
    description: "Path to JSON credentials file — default: ~/.openclaw/credentials/ghost-admin.json"
    required: false
license: MIT
metadata:
---

# Ghost Publishing Pro

A full Ghost CMS publishing skill built from real production use — not a generic API wrapper.

This contains proven workflows, hard-won pitfalls, and patterns from actually running a Ghost Pro newsletter and migrating an entire Squarespace blog in an afternoon.

**Built by:** Joseph Voelbel


---


## Required Access

This skill uses Ghost's Admin API. Here's exactly what it does with your credentials:

**Reads:** Post list, member count, analytics, post content, image URLs.

**Writes:** Creates and updates posts, uploads images, schedules content, sends newsletters.

**Cannot do without owner-level access:** Theme uploads, staff management, billing, site settings.

**Recommended setup:** Create a dedicated integration key (Settings > Integrations) — this covers 80% of workflows with minimal scope. The sub-admin path (documented below) unlocks the remaining 20% when full workflow automation is needed.

The skill never stores credentials beyond the file you configure. No external calls outside your Ghost instance.


---


## Credentials Setup

Create a credentials file at `~/.openclaw/credentials/ghost-admin.json`:

```json
{
  "url": "https://your-site.ghost.io",
  "key": "id:secret"
}
```

Read it in any operation with:

```bash
cat ~/.openclaw/credentials/ghost-admin.json
```


---


## Two Access Paths

### Path 1 — Integration Token (Recommended)

Get your key: Ghost Admin > Settings > Integrations > Add custom integration > Admin API Key.

Covers: all post operations, image uploads, scheduling, newsletters, analytics, batch updates.

This is the right starting point for most agent workflows.


### Path 2 — Sub-Admin Account (Full Workflow)

For operations the API handles awkwardly (Lexical card insertions, visual tweaks, manual newsletter resend), create a dedicated agent email (e.g., ProtonMail) and invite it as a Ghost admin under Settings > Staff > Invite people.

Why this is more secure than using your owner account: the agent account is isolated and fully revocable. Your owner credentials stay separate. If you ever need to cut access, remove the agent staff account — owner account is untouched.

**Browser automation note:** Some operations require Ghost's admin UI rather than the API (theme uploads, settings changes). When needed, this skill uses OpenClaw's built-in `browser` tool to interact with the Ghost admin interface. See Workflow 14 in `references/workflows.md` for which operations fall into each category.


---


## Authentication

Ghost uses short-lived JWT tokens. Generate one before every API call — they expire in 5 minutes.

**Pure Node.js — no npm required:**

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

Use `Authorization: Ghost {token}` on all requests.


---


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

This is the killer feature — one API call publishes to the web and sends to all subscribers simultaneously. Do not publish first and try to send separately. Use Ghost admin to manually resend if you miss this.


### Create a draft

Same as above with `"status": "draft"`. No email sent.


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


---


## HTML Content

Always use `?source=html` in the request URL. Ghost accepts raw HTML in the `html` field.

**Standard article:** `<p>`, `<h2>`, `<h3>`, `<hr>`, `<blockquote>`, `<ul>`, `<ol>`


**Book-style literary typography** — ideal for fiction, essays, and long-form literary content:

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


**Email rules — critical:**

- JS is stripped in email delivery. No scripts or interactive elements.
- Subscribe widgets are web-only — stripped from email.
- Ghost wraps content in its own email template. Don't add headers or footers.
- The `email_segment` field only fires on first publish. It must be in the same API call as `"status": "published"`.


---


## Full Automation Setup

See `references/workflows.md` > Workflow 14 for the complete guide to automated Ghost operations, including:

- Ghost's two-tier permission model (integration token vs. owner-level)
- Five documented API limits with root causes and solutions
- Site header customization as an alternative when theme uploads aren't available
- Known API field behaviors (`?source=html`, Lexical vs HTML, `updated_at` locking)


## Migration Workflows

See `references/workflows.md` for full migration playbooks:

- Squarespace XML export > Ghost batch import (proven — full blog migrated in one afternoon)
- WordPress XML migration
- Substack CSV + HTML migration
- Batch feature image updates
- DOCX > book-style Ghost posts with YouTube embeds


## API Reference

See `references/api.md` for complete endpoint documentation, error codes, and token generation details.


---


## Common Pitfalls

- `409 on PUT` — must include `updated_at` from a fresh fetch
- Email not sending — `email_segment` only fires on first publish; use Ghost admin to resend
- Rate limiting — add 500ms delay between calls in batch scripts
- Token expired mid-batch — regenerate every 50 posts in long operations
