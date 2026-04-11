---
name: ghost-publishing-pro
version: 1.5.1
description: "Skip the CMS. Write, format, and publish Ghost posts directly from your AI workflow using the Admin API — no browser, no copy/paste, no context switching."
homepage: https://github.com/highnoonoffice/hno-skills
source: https://github.com/highnoonoffice/hno-skills/tree/main/ghost-publishing-pro
credentials:
  - name: ghost-admin.json
    description: "JSON file at ~/.openclaw/credentials/ghost-admin.json with two fields: url (your Ghost site URL) and key (Admin API key in id:secret format — Ghost Admin > Settings > Integrations > Add custom integration)"
    required: true
binaries:
  - node
  - curl
license: MIT
metadata: ~
---

# Ghost Publishing Pro

### Before You Install

This skill has three hard requirements:

- **Node.js** installed locally (`node --version` to verify)
- **curl** installed (`curl --version` to verify — standard on macOS/Linux)
- **Ghost Admin API key** stored at `~/.openclaw/credentials/ghost-admin.json`

If those three aren't ready, start with the **Credentials Setup** section below. Everything else in this skill assumes they're in place.

---

A full Ghost CMS publishing skill built from real production use — not a generic API wrapper.

This contains proven workflows, hard-won pitfalls, and patterns from actually running a Ghost Pro newsletter and migrating an entire Squarespace blog in an afternoon.

### Dependencies

Most workflows use only Node.js built-ins (`crypto`, `fs`, `https`) and `curl` — no npm packages required.

The **Squarespace/WordPress XML migration** workflow optionally uses one npm package:

```bash
npm install fast-xml-parser
```

Install this only if you are running a migration script. All other workflows (publish, update, schedule, image upload, analytics) require no third-party packages.

### Required Access

This skill uses Ghost's Admin API. Here's exactly what it does with your credentials:

**Reads:** Post list, member count, analytics, post content, image URLs.

**Writes:** Creates and updates posts, uploads images, schedules content, sends newsletters.

**Recommended setup:** Create a dedicated integration key (Settings > Integrations > Add custom integration > Admin API Key). This covers the full publishing workflow with minimal scope.

The skill never stores credentials beyond the file you configure. No external calls outside your Ghost instance.

### Security Model

This skill is designed around minimal-scope credential use. Here's exactly how credential access is scoped and why it's safe:

**Use a dedicated integration key, not your owner credentials.** Ghost Admin → Settings → Integrations → Add custom integration → copy the Admin API Key. This key is isolated to the integration, fully revocable, and scoped to post/image/member operations — your owner account is never exposed.

**The credentials file is read-only at runtime.** The skill reads `~/.openclaw/credentials/ghost-admin.json` to generate a short-lived JWT (5-minute expiry). Nothing is written back to the file. Tokens are captured to shell variables, never logged or persisted.

**No external calls outside your Ghost instance.** Every API call targets your Ghost domain only. No third-party services, no telemetry, no data leaves your site.

**Revocation is instant.** If you need to cut access, delete the integration in Ghost Admin → Settings → Integrations. All tokens derived from that key immediately stop working.

Keep the credentials file out of shared folders and version control. Restrict access to your user account only using your OS file permission settings.

### What This Skill Won't Do

Ghost's Admin API integration tokens cannot access certain owner-level operations:

- **Staff management and billing** — owner-only, no API path
- **Site settings / code injection** — API token returns `403 NoPermissionError` by design
- **Redirects and routes files** — `GET/POST /ghost/api/admin/redirects/` returns `403` with integration tokens. Must upload via Ghost Admin → Settings → Labs → Beta features → Redirects upload button

Theme management (upload + activation) is fully supported via the Admin API — see Workflow 15 below.

If you hit a `NoPermissionError` on settings write endpoints, that is expected Ghost behavior — not a bug.

### Credentials Setup

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

Get your key: Ghost Admin > Settings > Integrations > Add custom integration > Admin API Key.

Covers: all post operations, image uploads, scheduling, newsletters, analytics, batch updates.

### Authentication

Ghost uses short-lived JWT tokens. Generate one before every API call — they expire in 5 minutes.

**Pure Node.js — no npm required.**

Token generation uses Node.js built-ins (`crypto`, `fs`) and the Admin API key format (`id:secret`). The full implementation is in `references/api.md` under Authentication — copy the token generation script into your workflow, capture the output to a shell variable, and pass it as `Authorization: Ghost {token}` on all requests.

Tokens expire in 5 minutes. Regenerate before each API call or every 50 posts in batch operations.

### Core Operations

**Publish a post + send as newsletter (one call)**

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

**Create a draft**

Same as above with `"status": "draft"`. No email sent.

**Update an existing post**

```bash
# 1. Fetch post to get updated_at (required)
curl -s "{url}/ghost/api/admin/posts/{id}/" -H "Authorization: Ghost {token}"

# 2. Update with updated_at included
curl -s -X PUT "{url}/ghost/api/admin/posts/{id}/?source=html" \
  -H "Authorization: Ghost {token}" \
  -H "Content-Type: application/json" \
  -d '{"posts":[{"html":"<p>New content</p>","updated_at":"{fetched_updated_at}"}]}'
```

**List posts**

```bash
curl -s "{url}/ghost/api/admin/posts/?limit=15&filter=status:draft&fields=id,title,slug,status,updated_at" \
  -H "Authorization: Ghost {token}"
```

**Upload image**

```bash
curl -s -X POST "{url}/ghost/api/admin/images/upload/" \
  -H "Authorization: Ghost {token}" \
  -F "file=@/path/to/image.jpg" \
  -F "purpose=image"
# Returns URL — use as feature_image value
```

**Schedule a post**

Add `"status": "scheduled"` and `"published_at": "2026-03-20T18:00:00.000Z"` (UTC).

### HTML Content

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

**⚠️ Ghost theme iframe compatibility — known issue:**

Do NOT use the aspect-ratio CSS wrapper trick in Ghost HTML cards:

```html
<!-- BROKEN in most Ghost themes — do not use -->
<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;">
  <iframe style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>
</div>
```

Ghost theme content column CSS conflicts with this pattern, causing iframes to render as blank or clipped on the live page. Use fixed height instead:

```html
<!-- CORRECT — use aspect-ratio directly on the iframe, no wrapper needed -->
<iframe src="https://www.youtube.com/embed/{VIDEO_ID}"
  style="width:100%;aspect-ratio:16/9;border:0;display:block;"
  allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
  allowfullscreen></iframe>
```

**Email rules — critical:**

- JS is stripped in email delivery. No scripts or interactive elements.
- Subscribe widgets are web-only — stripped from email.
- Ghost wraps content in its own email template. Don't add headers or footers.
- The `email_segment` field only fires on first publish. It must be in the same API call as `"status": "published"`.

### Migration Workflows

See `references/workflows.md` for full migration playbooks:

- Squarespace XML export > Ghost batch import (proven — full blog migrated in one afternoon)
- WordPress XML migration
- Substack CSV + HTML migration
- Batch feature image updates
- DOCX > book-style Ghost posts with YouTube embeds
- Native audio card embedding (upload MP3, embed as Ghost audio card)
- Theme management (JWT upload where supported; Ghost Admin fallback)
- **Site audit** — scan all published posts for missing feature images, excerpts, meta descriptions, tags, stale slugs, and untouched content (Workflow 14)
- **Content performance intelligence** — three-section report: email performance (open rate, click rate, CTO, divergence analysis), web-only post health + amplification candidates, pages health snapshot. Audience snapshot with free/paid subscriber split. (Workflow 15)

See `references/api.md` for complete endpoint documentation, error codes, and token generation details.

### Common Pitfalls

- `409 on PUT` — must include `updated_at` from a fresh fetch
- Email not sending — `email_segment` only fires on first publish; use Ghost admin to resend
- Rate limiting — add 500ms delay between calls in batch scripts
- Token expired mid-batch — regenerate every 50 posts in long operations
- `tags` in `fields` param causes `400 BadRequestError` — use `&include=tags` instead
- External script tag in code injection pointing to a local/LAN hostname will silently fail on the live HTTPS site — mixed content + Private Network Access policy blocks it. All search/widget JS must be inline in the code injection block.
- `PUT /admin/settings/` always returns `403` with integration tokens — site settings require owner access in Ghost Admin
- `GET /admin/integrations/` also returns `403` — get Content API key from site HTML source instead (`data-key=` attribute on portal/search script tags)
- **Custom theme: `{{content}}` must be triple-braced** — in any custom `.hbs` template, always use `{{{content}}}` (three braces). Double-braced `{{content}}` escapes the HTML and renders `undefined` instead of the post body.
- **Custom excerpts drive search** — Ghost's Content API `fields=excerpt` returns the custom excerpt, not body text. If a post needs to surface in client-side search for a keyword, that keyword must appear in the custom excerpt.
- **Links inside HTML cards in Lexical are double-escaped** — regex on `"url":"..."` fields won't find them. Use `json.dumps(lexical)` → string replace → `json.loads()` to safely find and replace any URL pattern inside embedded HTML.
- **Ghost's sitemap is always clean** — Ghost Pro auto-generates sitemaps using the configured site URL. No manual sitemap editing needed.
- **Squarespace migration leaves /blog/ links** — batch imports preserve old internal link paths with the `/blog/` prefix. After any Squarespace import, audit all posts for `/blog/` references and fix them via the API.
- **`POST /admin/redirects/upload/` returns `403`** — redirect rules must be uploaded manually via Ghost Admin → Settings → Labs → Redirects upload button. The API endpoint is blocked for integration tokens by design.

### Read-Next / Related Articles Pattern

When building a "Continue Reading" block at the bottom of a post, always pull real feature image URLs from the Ghost API first — never use placeholder divs or icon blocks.

**Correct pattern:**
```python
# Fetch feature images before building the block
for slug in related_slugs:
    resp = requests.get(f'{BASE}/posts/slug/{slug}/', params={'fields': 'title,slug,feature_image'}, headers=...)
    img_url = resp.json()['posts'][0]['feature_image']
```

**HTML structure — use `align-items:center` not `align-items:flex-start`:**
```html
<div class="jv-read-next" style="margin:40px 0 0;padding:24px 0 0;border-top:1px solid rgba(0,0,0,0.15);">
  <div style="font-size:0.62rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(0,0,0,0.35);margin-bottom:4px;">Continue Reading</div>
  <a href="{URL}" style="display:flex;gap:14px;align-items:center;text-decoration:none;color:inherit;padding:14px 0;border-bottom:1px solid rgba(0,0,0,0.07);transition:opacity 0.15s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
    <img src="{FEATURE_IMAGE_URL}" alt="{TITLE}" style="width:68px;height:52px;object-fit:cover;border-radius:3px;flex-shrink:0;border:1px solid rgba(0,0,0,0.08);">
    <div style="flex:1;min-width:0;">
      <div style="font-size:0.72rem;font-weight:600;color:#111;margin-bottom:4px;line-height:1.35;letter-spacing:0.01em;">{TITLE}</div>
      <div style="font-size:0.68rem;color:rgba(0,0,0,0.45);line-height:1.45;font-weight:300;">{EXCERPT}</div>
    </div>
  </a>
</div>
```

Key rules:
- `align-items:center` — keeps text vertically centered against the thumbnail
- `align-items:flex-start` causes text to float at top, looks broken
- Always use real Ghost feature images — never placeholder divs or colored icon blocks
- Pull image URLs from the API immediately before building the block

### License

MIT. Copyright (c) 2026 @highnoonoffice. Retain this notice in any distributed version.
