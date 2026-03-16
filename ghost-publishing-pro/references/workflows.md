# Ghost Publishing Workflows

Proven workflows from real production use on a Ghost Pro site.

---

## Credentials Setup

**Credentials file:** `~/.openclaw/credentials/ghost-admin.json`
```json
{
  "url": "https://your-site.ghost.io",
  "key": "id:secret"
}
```

Read with: `cat ~/.openclaw/credentials/ghost-admin.json`

**Two access paths:**
1. **API (primary)** — Admin API key for all programmatic operations
2. **Browser (fallback)** — Ghost admin UI at `{url}/ghost` when API is insufficient (e.g., visual editor tweaks, Lexical card insertions the API doesn't support cleanly)

**Sub-admin setup** — Best practice for agent access:
- Create a dedicated email for the agent (e.g., a ProtonMail address)
- Invite that email as a Ghost admin (Settings → Staff → Invite people)
- Agent has full admin access but owner account stays separate
- If API key is compromised, revoke without affecting owner account
- Browser automation can log in as the agent account independently

---

## Workflow 1: Write and Publish a New Article

1. Generate JWT token (see api.md)
2. POST to `/posts/?source=html` with:
   - `status: "draft"` to start
   - Full HTML content (see HTML Content Guidelines below)
   - Tags, excerpt, feature_image if ready
3. Review in Ghost admin browser if needed
4. Update post: PUT with `status: "published"` and `email_segment: "all"` to publish + send newsletter simultaneously

**Critical:** Ghost publish + newsletter send is ONE action. Don't publish first then try to send separately — you'll need to use Ghost admin to resend, which is clunky.

---

## Workflow 2: Migrate from Squarespace (Proven — full blog migrated in one afternoon)

**What you'll need:**
- Squarespace XML export (Settings → Advanced → Import/Export)
- Node.js script to parse and batch import

**The migration script pattern (Node.js):**
```js
const { XMLParser } = require('fast-xml-parser');
// Parse items from channel.item array
// For each post: clean HTML, generate slug, set published_at from pubDate
// POST to Ghost API with 500ms delay between calls
```

**Key cleanup steps:**
1. Strip Squarespace wrapper divs and widget markup
2. Convert Squarespace image URLs → either re-upload to Ghost or keep external
3. Clean slugs (remove date prefixes like `/2015/10/25/`, normalize to hyphen-case)
4. Set `published_at` from original post date to preserve chronology
5. Map categories → Ghost tags

**WordPress migration:** Same pattern, different XML schema. WordPress uses `<wp:post_name>` for slugs, `<content:encoded>` for HTML body.

**Substack migration:** Export CSV + HTML files from Substack dashboard. Parse CSV for metadata, read HTML files for content. Same batch POST pattern.

---

## Workflow 3: Batch Update Existing Posts

Use case: Update feature images, fix formatting across many posts, add tags, change slugs.

```js
// 1. Fetch all posts with pagination
GET /posts/?limit=15&page=1&fields=id,title,slug,status,updated_at,feature_image

// 2. Loop through pages until meta.pagination.next is null

// 3. For each post that needs updating:
PUT /posts/{id}/ with updated_at from fetched post
// 500ms delay between calls
```

**Always include `updated_at`** from the fetched post — Ghost uses optimistic locking and will 409 without it.

---

## Workflow 4: Upload Image and Set as Feature Image

```bash
# 1. Upload image
curl -X POST "{url}/ghost/api/admin/images/upload/" \
  -H "Authorization: Ghost {token}" \
  -F "file=@/path/to/image.jpg" \
  -F "purpose=image"
# Returns image URL

# 2. Set on post
curl -X PUT "{url}/ghost/api/admin/posts/{id}/?source=html" \
  -H "Authorization: Ghost {token}" \
  -H "Content-Type: application/json" \
  -d '{"posts":[{"feature_image":"https://returned-url","updated_at":"..."}]}'
```

---

## HTML Content Guidelines

Ghost accepts raw HTML via `?source=html`. Inject a full HTML string as the `html` field.

**Standard structure:**
```html
<p>Opening paragraph.</p>

<h2>Section heading</h2>

<p>Body paragraph.</p>

<hr>

<p>Closing paragraph.</p>
```

**Book-style typography** (for literary/fiction content):
```html
<div style="font-family: Georgia, serif; text-align: justify; hyphens: auto; -webkit-hyphens: auto; lang='en'">
  <p style="text-indent: 2em; margin-bottom: 0; margin-top: 0;">First paragraph of story.</p>
  <p style="text-indent: 2em; margin-bottom: 0; margin-top: 0;">Second paragraph — no gap between paragraphs, indent only.</p>
</div>
```

Key book-style rules:
- `text-align: justify` + `hyphens: auto` — justified text with hyphenation
- `text-indent: 2em` on paragraphs — indent instead of gap
- `margin-bottom: 0; margin-top: 0` — no paragraph spacing
- Wrap in `lang="en"` for hyphenation to work
- `font-family: Georgia, serif` for book feel

**YouTube embed (responsive):**
```html
<figure class="kg-card kg-embed-card">
  <iframe width="560" height="315"
    src="https://www.youtube-nocookie.com/embed/{VIDEO_ID}"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen>
  </iframe>
</figure>
```

**Email newsletter rules (critical):**
- JS is stripped in Ghost email delivery — no interactive elements
- Subscribe widgets are web-only — stripped from email
- Ghost wraps articles in its own email template — don't add email headers/footers in HTML
- Keep email-safe: no `<script>`, no `position: fixed`, no complex CSS
- Ghost email send is one-shot — publish + `email_segment` in the same API call

**Footer template (standard newsletter CTA):**
```html
<hr>
<p><em>If you're reading this on the web, you can get articles straight to your inbox — 
no spam, unsubscribe anytime.</em></p>
```

---

## Workflow 5: DOCX Fiction/Essay Collection Batch Import

Use case: Import a collection of stories or essays from a DOCX as individual Ghost posts with book-style formatting.

**Source:** DOCX converted to HTML, then parsed piece by piece.

**Story detection:** Each piece starts with an `<h2>` tag (title). Split the full HTML on `<h2>` boundaries.

**Per-post structure:**
```html
<!-- Inline title -->
<h1 style="font-family: Georgia, serif; text-align: center;">{TITLE}</h1>
<h3 style="text-align: center; color: #666;">{AUTHOR NAME}</h3>
<hr>

<!-- Book-style body -->
<div style="font-family: Georgia, serif; text-align: justify; hyphens: auto; -webkit-hyphens: auto;" lang="en">
  {PARAGRAPHS with text-indent styling}
</div>

<!-- YouTube embed if applicable -->
{EMBED}

<!-- Footer -->
<hr>
<p><em>Footer text here.</em></p>
```

**Tags:** Match your collection name and content type (e.g., `["Fiction", "Short Stories"]`)

**Slug pattern:** `story-title` or `story-title-author-name`

**Status:** `draft` initially — review before publishing.

---

## Common Pitfalls

- **409 on PUT** — Always re-fetch post to get current `updated_at` before updating
- **Email not sending** — `email_segment` only fires on first publish. If post was already published, use Ghost admin to send manually
- **HTML rendering wrong** — Always use `?source=html` parameter on POST/PUT
- **Token expired mid-batch** — Regenerate token every 50 posts in long batch operations
- **Rate limiting** — Add 500ms delay between API calls in batch scripts; Ghost will 429 without it
- **Image upload fails** — Check file size (under 10MB), format (JPG/PNG/GIF/WebP), and that purpose field is set

---

## Workflow 6: YouTube Video Post (Thumbnail + Embed)

Use case: Publish a post built around a YouTube video — custom thumbnail as feature image, embedded player, structured content around it.

**Step 1: Upload your custom thumbnail as the feature image**
```bash
curl -s -X POST "{url}/ghost/api/admin/images/upload/" \
  -H "Authorization: Ghost {token}" \
  -F "file=@/path/to/thumbnail-1280x720.jpg" \
  -F "purpose=image"
# Copy the returned URL
```

**Step 2: Create the post with embed + feature image**
```json
{
  "posts": [{
    "title": "Video Title",
    "html": "<p>Intro paragraph setting up the video.</p>\n\n<figure class=\"kg-card kg-embed-card\"><iframe width=\"560\" height=\"315\" src=\"https://www.youtube-nocookie.com/embed/{VIDEO_ID}\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture\" allowfullscreen></iframe></figure>\n\n<p>Description or transcript excerpt below the video.</p>",
    "feature_image": "https://your-ghost-site.com/content/images/returned-thumbnail-url.jpg",
    "status": "published",
    "email_segment": "all",
    "tags": [{"name": "Video"}]
  }]
}
```

**YouTube embed rules:**
- Use `youtube-nocookie.com` not `youtube.com` — avoids cookie consent banners
- `kg-card kg-embed-card` classes tell Ghost to render it as an embed card (proper responsive sizing)
- Thumbnail dimensions: 1280×720 (16:9) — Ghost crops to this for feature image display
- The embed renders in email but autoplay is blocked — acceptable behavior

---

## Workflow 7: Content Formatting Recipes

Copy-paste HTML patterns for common Ghost content needs.

**Pull quote:**
```html
<blockquote style="border-left: 4px solid #c8a84b; padding-left: 1em; font-style: italic; color: #555;">
  The sentence you want to emphasize.
</blockquote>
```

**Callout box:**
```html
<div style="background: #f9f5e7; border: 1px solid #e8d5a3; border-radius: 4px; padding: 1em 1.25em; margin: 1.5em 0;">
  <strong>Note:</strong> Your callout text here.
</div>
```

**Section separator (thematic break):**
```html
<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 2em 0;">
```

**Image with caption:**
```html
<figure>
  <img src="https://image-url.jpg" alt="Description">
  <figcaption style="text-align: center; font-size: 0.85em; color: #888; margin-top: 0.5em;">Caption text here.</figcaption>
</figure>
```

**Footnote-style aside:**
```html
<p style="font-size: 0.85em; color: #777; border-top: 1px solid #eee; padding-top: 0.75em; margin-top: 2em;">
  ¹ Footnote or clarification text here.
</p>
```

**Two-column layout (web-only — stripped in email):**
```html
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5em;">
  <div><p>Left column content.</p></div>
  <div><p>Right column content.</p></div>
</div>
```

---

## Workflow 8: Newsletter Strategy Patterns

Hard-won Ghost email lessons from production use.

**The one-shot rule:**
`email_segment` only fires on the FIRST time a post is published. If you publish without it and then try to add it — Ghost won't send. You must use Ghost admin to manually trigger a resend, and even then it's unreliable. Always include `email_segment` in the same call that sets `status: "published"`.

**Email-safe content:**
Ghost sends HTML email through its own template wrapper. What gets stripped:
- All `<script>` tags
- `position: fixed` and `position: sticky`
- Subscribe portal widgets (`##subscribe##`)
- Custom fonts loaded via `@font-face`
- External CSS files

What works in email:
- Inline styles
- Standard HTML (p, h2, h3, ul, ol, blockquote, hr, img)
- YouTube embeds (renders as linked thumbnail in most clients)
- Web fonts from Google Fonts loaded inline

**Subscriber segments:**
- `"email_segment": "all"` — free + paid subscribers
- `"email_segment": "free"` — free tier only
- `"email_segment": "paid"` — paid subscribers only
- Omit `email_segment` entirely — no email sent (web publish only)

**Member-only content:**
Set `"visibility": "members"` on a post to restrict it to logged-in members. `"visibility": "paid"` restricts to paying subscribers. Default is `"public"`.

**Scheduling for time zones:**
Ghost stores and sends in UTC. If your audience is US-based and you want delivery at 9AM Eastern, set `published_at` to `T14:00:00.000Z` (EST) or `T13:00:00.000Z` (EDT).

**Subject line:**
Ghost uses the post title as the email subject. Keep titles under 60 characters for mobile preview. Avoid ALL CAPS and excessive punctuation — triggers spam filters.

---

## Workflow 9: Ghost + OpenClaw Integration Patterns

How to wire Ghost into agent workflows so publishing becomes automatic.

**Cron-based publishing schedule:**
Create a cron job in OpenClaw that checks a drafts queue and publishes on a schedule:
```
# Check for scheduled posts every morning
openclaw cron add "ghost-publish-check" "0 9 * * *" "Check Ghost drafts queue and publish any posts due today"
```

In the cron prompt, instruct the agent to:
1. Fetch posts filtered by `status:scheduled` and `published_at` in today's range
2. Verify content looks correct
3. Update status to `published` with `email_segment` if newsletter delivery is intended

**Memory file for publishing cadence:**
Keep a `memory/publishing.md` file that tracks:
```markdown
## Publishing Log
- Last published: 2026-03-16 — "Post Title"
- Next scheduled: 2026-03-23
- Subscriber count: 847 (as of 2026-03-16)
- Total posts: 12
```

Update this after every publish. Use it to avoid gaps and track cadence.

**Ghost as a CMS for other content:**
Ghost pages (not posts) work well as persistent content stores — about pages, landing pages, link-in-bio pages. Create/update via API the same way as posts. Pages don't appear in the feed and don't trigger emails.

**Batch operations from a working file:**
Keep a `memory/ghost-queue.md` with pending posts in structured format:
```markdown
## Queue
- [ ] Title: "Post Title" | Tags: Bitcoin, Essay | Status: draft | Notes: needs intro
- [x] Title: "Published Post" | Published: 2026-03-10
```

Agent reads the queue, drafts or publishes each item, marks done.

---

## Workflow 10: Analytics & Insights

**What the Admin API gives you:**
```bash
# Subscriber count
GET /members/?limit=1
# → meta.pagination.total = total member count

# Active subscribers only
GET /members/?limit=1&filter=subscribed:true

# Post engagement (basic)
GET /posts/{id}/?fields=id,title,email_recipient_filter,email,published_at
# → email.opened_count, email.clicked_count (if email was sent)

# Recent posts with metadata
GET /posts/?limit=10&fields=id,title,published_at,slug,feature_image,tags
```

**What the Admin API does NOT give you:**
- Page views and unique visitors
- Traffic sources / referrers
- Post-level view counts (these are in Ghost's native analytics dashboard only)
- Conversion rates (free → paid)

Ghost's traffic analytics are dashboard-only and not exposed via any API. They use a proprietary tracking system.

**Workaround — Playwright browser scrape:**
To pull traffic data programmatically, authenticate to Ghost admin via browser automation and scrape the analytics dashboard:
```js
// Rough pattern — adapt to your Ghost version
await page.goto('https://your-site.ghost.io/ghost/#/dashboard');
await page.waitForSelector('[data-test-dashboard-stats]');
const stats = await page.evaluate(() => {
  // Extract stats from DOM
});
```

This is fragile (Ghost updates the dashboard UI periodically) but works. Cache the results to a local JSON file and refresh on demand rather than on every session.

**Lightweight alternative:**
Use a third-party analytics tool (Plausible, Fathom, or even Google Analytics) alongside Ghost. These give you real traffic data via their own APIs and are more reliable than scraping Ghost's dashboard. Ghost supports adding custom tracking scripts via Settings → Code injection.

**Subscriber growth tracking:**
Poll `/members/?limit=1` on a schedule and log the total to a memory file. Simple, reliable, tells you the most important metric.
```bash
# Run weekly, append to memory/ghost-analytics.md

---

## Workflow 11: Ghost Webhooks + Automation (Zapier / Make / n8n)

Ghost fires outbound webhooks on key events. Wire these to automation platforms to trigger downstream workflows automatically.

**Set up a webhook in Ghost:**
Ghost Admin → Settings → Integrations → Add custom integration → Webhooks tab → Add webhook

**Available webhook events:**
- `post.published` — fires when a post goes live
- `post.unpublished` — fires when a post is taken down
- `member.added` — new subscriber joined
- `member.deleted` — subscriber unsubscribed
- `member.edited` — subscriber updated (tier change, email change)
- `page.published` — page published

**Webhook payload (post.published example):**
```json
{
  "post": {
    "current": {
      "id": "...",
      "title": "Post Title",
      "url": "https://your-site.ghost.io/post-slug/",
      "published_at": "2026-03-16T18:00:00.000Z",
      "tags": [...],
      "feature_image": "https://..."
    }
  }
}
```

**Common automation patterns:**

**n8n — auto-post to Twitter/X when published:**
- Trigger: Webhook node (receives Ghost post.published)
- Action: Twitter node → compose tweet from title + URL
- Add delay node (5 min) to let Ghost CDN cache the post first

**Zapier — notify Slack when new subscriber joins:**
- Trigger: Webhooks by Zapier (catches member.added)
- Action: Slack message to #subscribers channel with member email

**Make — cross-post to LinkedIn:**
- Trigger: Webhooks module (post.published)
- Action: HTTP module → LinkedIn API → create post with excerpt + link

**OpenClaw cron as webhook receiver:**
You can point Ghost webhooks at your OpenClaw gateway (if externally accessible) to trigger agent actions directly on publish events.

---

## Workflow 12: SEO & Metadata Control

Ghost exposes full SEO metadata via the Admin API. Control everything programmatically.

**Fields available on posts/pages:**
```json
{
  "posts": [{
    "title": "Post Title",
    "slug": "custom-url-slug",
    "custom_excerpt": "This appears in feed cards and social previews (150 chars max)",
    "meta_title": "SEO Title (overrides post title in <title> tag)",
    "meta_description": "SEO meta description (150-160 chars, appears in search results)",
    "og_title": "Open Graph title (Facebook, LinkedIn share preview)",
    "og_description": "Open Graph description",
    "og_image": "https://url-to-og-image-1200x630.jpg",
    "twitter_title": "Twitter card title",
    "twitter_description": "Twitter card description",
    "twitter_image": "https://url-to-twitter-image.jpg",
    "canonical_url": "https://original-source-if-syndicated.com/post"
  }]
}
```

**Slug rules:**
- Ghost auto-generates slugs from titles — override with `slug` field
- Lowercase, hyphens only, no special characters
- Ghost appends `-2`, `-3` etc. on duplicates
- Changing a slug breaks existing links — set it right the first time or add redirects

**Feature image vs OG image:**
- `feature_image` — shown in the post and feed cards
- `og_image` — used for social sharing previews (defaults to feature_image if not set)
- Recommended: set both explicitly. OG image optimal size: 1200×630px

**Canonical URL:**
Use when syndicating content from another platform. Tells search engines the original source. Prevents duplicate content penalties.
```json
{ "canonical_url": "https://medium.com/original-post-url" }
```

**Batch SEO audit + fix:**
```js
// Fetch all posts missing meta descriptions
const posts = await fetch('/posts/?limit=all&filter=meta_description:null&fields=id,title,slug,custom_excerpt');
// For each: generate meta_description from custom_excerpt or title
// PUT update with meta_description filled
```

---

## Workflow 13: Multi-Site Management

Running more than one Ghost site? Structure credentials and agent workflows to handle both cleanly.

**Multi-site credentials file:**
```json
{
  "sites": {
    "primary": {
      "url": "https://site-one.ghost.io",
      "key": "id:secret"
    },
    "secondary": {
      "url": "https://site-two.ghost.io",
      "key": "id:secret"
    }
  }
}
```

Store at `~/.openclaw/credentials/ghost-sites.json`

**Token generation per site:**
```bash
node -e "
const crypto=require('crypto');
const sites=JSON.parse(require('fs').readFileSync(process.env.HOME+'/.openclaw/credentials/ghost-sites.json','utf8'));
const site=sites.sites['primary']; // change to 'secondary' as needed
const [id,secret]=site.key.split(':');
const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT',kid:id})).toString('base64url');
const n=Math.floor(Date.now()/1000);
const p=Buffer.from(JSON.stringify({iat:n,exp:n+300,aud:'/admin/'})).toString('base64url');
const s=crypto.createHmac('sha256',Buffer.from(secret,'hex')).update(h+'.'+p).digest('base64url');
console.log(JSON.stringify({token:h+'.'+p+'.'+s,url:site.url}));
"
```

**Cross-post the same content to multiple sites:**
```js
const sites = ['primary', 'secondary'];
for (const siteName of sites) {
  const site = config.sites[siteName];
  const token = generateToken(site.key);
  await fetch(`${site.url}/ghost/api/admin/posts/?source=html`, {
    method: 'POST',
    headers: { 'Authorization': `Ghost ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ posts: [postData] })
  });
  await new Promise(r => setTimeout(r, 1000)); // 1s between sites
}
```

**Per-site memory tracking:**
Keep separate publishing logs per site in memory:
```markdown
## Site: Primary (site-one.ghost.io)
- Subscribers: 847
- Last published: 2026-03-16

## Site: Secondary (site-two.ghost.io)
- Subscribers: 234
- Last published: 2026-03-10
```


---

## Workflow 14: Autonomous Agent Operations — Permission Walls & Workarounds

This section documents real operational constraints discovered through production use. These are not theoretical — each one was hit, tested, and resolved.

### Ghost Permission Model (Critical to Understand)

Ghost has a two-tier authentication model:

**Integration tokens** (Admin API key from Settings → Integrations):
- Can: create/update/delete posts and pages, upload images, manage tags, read members, read site info
- Cannot: upload themes, modify site settings, access other integrations, list integrations, change code injection

**Owner-level authentication** (browser session or owner password):
- Required for: theme uploads, settings changes, code injection, staff management, billing

**Implication for agents:** Integration tokens cover the full publishing workflow but cannot modify the site's structure, theme, or global settings. These operations require browser automation with an authenticated session.

---

### Constraint 1: Theme Upload — Owner-Only

**Symptom:** `LIMIT_UNEXPECTED_FILE` or `NoPermissionError` on `POST /ghost/api/admin/themes/upload/`

**Root cause:** Theme uploads require owner-level auth. Integration tokens will always fail this endpoint regardless of field names, multipart encoding, or content type.

**Workaround options:**
1. Use browser automation with owner credentials to upload via Ghost Admin UI
2. Use Code Injection as a structural workaround (see Workflow 14.4 below)

---

### Constraint 2: Site Settings — Owner-Only

**Symptom:** `NoPermissionError` on `PUT /ghost/api/admin/settings/`

**Root cause:** Settings (including code injection, navigation, branding) require owner auth.

**Workaround:** Use browser automation to navigate to Ghost Admin → Settings → Code Injection and type/paste content via the CM6 editor.

**Browser automation pattern for Code Injection:**
```js
// Click the Open button for Code Injection section
// Then target the CM6 editor
document.querySelector('.cm-editor .cm-content').click()
// Use keyboard: Meta+a to select all, then type replacement
// Save with: document.querySelector('button[text="Save"]').click()
```

---

### Constraint 3: Ghost Admin API — Integration Listing Blocked

**Symptom:** `NoPermissionError` on `GET /ghost/api/admin/integrations/`

**Root cause:** Integrations (including Content API keys) can only be listed by owners.

**Workaround:** Content API key can be retrieved from Ghost Admin → Settings → Integrations → your integration → Content API Key field. Store it in credentials file for use in public-facing fetch calls.

---

### Constraint 4: HttpOnly Session Cookies

**Symptom:** `document.cookie` returns empty string in browser context even when authenticated

**Root cause:** Ghost sets session cookies as `HttpOnly` — inaccessible from JavaScript for security reasons.

**Implication:** Cannot extract session token from browser to make authenticated API calls from an external process. Must use the browser session directly (via browser automation) or use the Admin API key.

---

### Constraint 5: Ghost Dropzone Upload Widget

**Symptom:** File upload via `input[type=file]` selector returns `ok: true` but file doesn't process

**Root cause:** Ghost's theme upload dropzone renders the `<input type=file>` element dynamically. Standard file input targeting works when the input exists statically, but Ghost's React-managed dropzone widget may not process programmatically injected files consistently.

**Workaround:** Target the file input after triggering the dropzone's click handler, or use the API endpoint directly (if permissions allow).

---

### Workflow 14.4: Code Injection as a Structural Workaround

**Use case:** When a Ghost page template is missing context (e.g., `page.hbs` missing `{{#page}}` wrapper) and theme upload is not possible via automation, Code Injection can render content client-side.

**Pattern:** Inject a `<script>` tag in Site Header Code Injection that:
1. Checks `window.location.pathname` to target only the affected page
2. Fires on `DOMContentLoaded`
3. Locates the target element (e.g., `.post-body`)
4. Sets `innerHTML` to the hardcoded or API-fetched content

**Example:**
```html
<script>
if (location.pathname === '/your-page/') {
  document.addEventListener('DOMContentLoaded', function() {
    var b = document.querySelector('.post-body');
    if (b) {
      b.innerHTML = '<p>Your content here...</p>';
    }
  });
}
</script>
```

**Trade-offs:**
- Content changes require updating both the Ghost page AND the Code Injection script
- Runs on every page load (minimal performance impact for small payloads)
- Survives theme changes — persists in Code Injection independent of theme

**When to use:** Structural template bugs, missing context blocks, or emergency content injection when theme files cannot be updated via API.

**Long-term fix:** The correct solution remains fixing the theme template (add `{{#page}}...{{/page}}` context block to `page.hbs`) and uploading via Ghost Admin UI.

---

### Ghost API — Known Field Behaviors

**`?source=html` parameter:**
- Required when posting HTML content to the `html` field
- Without it, Ghost ignores the `html` field entirely and stores empty content
- Always append to POST/PUT URL: `/ghost/api/admin/posts/?source=html`

**Lexical vs HTML:**
- Ghost stores content in Lexical (its own JSON format) internally
- When you POST `html` with `?source=html`, Ghost converts it to Lexical
- The `html` field on GET responses is Ghost's rendered output from Lexical
- HTML cards in Lexical (`{"type":"html","html":"..."}`) are rendered differently than native content — theme must support `kg-card` classes

**`updated_at` on PUT:**
- Always fetch the current `updated_at` before updating a post
- Ghost uses optimistic locking — stale `updated_at` returns 409
- Pattern: GET → extract `updated_at` → PUT with same value

