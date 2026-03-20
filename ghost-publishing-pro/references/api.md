# Ghost Admin API Reference

## Authentication

Ghost Admin API keys have the format `{id}:{secret}` (split on first `:`).

Tokens expire in 5 minutes. Regenerate before every API call.

**Generate token — pure Node.js (no npm required):**
Save this as `scripts/ghost-token.js` in your workspace:

```js
// ghost-token.js — Generate a Ghost Admin JWT from credentials file
// Usage: node scripts/ghost-token.js
// Output: prints token only (capture to TOKEN variable)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const credsPath = path.join(process.env.HOME, '.openclaw/credentials/ghost-admin.json');
const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
const [id, secret] = creds.key.split(':');

const now = Math.floor(Date.now() / 1000);
const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id })).toString('base64url');
const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' })).toString('base64url');
const sig = crypto.createHmac('sha256', Buffer.from(secret, 'hex')).update(header + '.' + payload).digest('base64url');

process.stdout.write(header + '.' + payload + '.' + sig);
```

Capture in shell:
```bash
TOKEN=$(node scripts/ghost-token.js)
GHOST_URL=$(node -e "const c=require(process.env.HOME+'/.openclaw/credentials/ghost-admin.json');process.stdout.write(c.url)")
```

**Request header:** `Authorization: Ghost {token}`
**Base URL:** `https://{ghost-domain}/ghost/api/admin/`
**Version header:** `Accept-Version: v5.0`

---

## Posts

### Create post
`POST /posts/?source=html`

```json
{
  "posts": [{
    "title": "Post title",
    "html": "<p>Content</p>",
    "status": "draft",
    "slug": "custom-slug",
    "custom_excerpt": "Optional excerpt",
    "feature_image": "https://url-to-image.jpg",
    "tags": [{"name": "tag-name"}],
    "email_segment": "all"
  }]
}
```

**status:** `draft` | `published` | `scheduled`
**email_segment:** `all` | `free` | `paid` (only fires when status=published)

### Publish + send email (one call)
```json
{
  "posts": [{
    "title": "Title",
    "html": "<p>Body</p>",
    "status": "published",
    "email_segment": "all"
  }]
}
```

### Update post
`PUT /posts/{id}/?source=html`

Must include `updated_at` from current post (optimistic locking). Re-fetch post first if uncertain.

```json
{
  "posts": [{
    "html": "<p>Updated content</p>",
    "updated_at": "2026-03-16T18:00:00.000Z"
  }]
}
```

### Get post by ID
`GET /posts/{id}/`

### Get post by slug
`GET /posts/slug/{slug}/`

### List posts
`GET /posts/?limit=15&page=1&filter=status:draft&fields=id,title,slug,status,updated_at`

Filter options: `status:draft`, `status:published`, `tag:name`

### Delete post
`DELETE /posts/{id}/`

---

## Pages

Identical to posts — replace `/posts/` with `/pages/`.

---

## Images

### Upload image
`POST /images/upload/` (multipart/form-data)

```bash
curl -X POST "{url}/ghost/api/admin/images/upload/" \
  -H "Authorization: Ghost {token}" \
  -F "file=@/path/to/image.jpg" \
  -F "purpose=image"
```

Returns: `{ "images": [{ "url": "https://..." }] }`

purpose options: `image` | `profile_image` | `icon`

---

## Tags

`GET /tags/?limit=all` — list all tags
`POST /tags/` — create: `{ "tags": [{ "name": "tag" }] }`

---

## Members / Subscribers

`GET /members/?limit=1` — check `meta.pagination.total` for subscriber count
`GET /members/?limit=15&filter=subscribed:true` — list subscribers

---

## Site info
`GET /site/` — returns title, description, url, version

---

## Batch operations

Ghost API has no native batch endpoint. Loop with a delay:
```js
for (const post of posts) {
  await apiCall(post);
  await new Promise(r => setTimeout(r, 500)); // 500ms between calls
}
```

---

## Backdate a post on publish

Set `published_at` to any past date in the same PUT call:

```json
{
  "posts": [{
    "id": "post-id",
    "status": "published",
    "published_at": "2023-07-12T12:00:00.000Z",
    "updated_at": "{fresh-updated_at}"
  }]
}
```

This prevents the post from surfacing as "new" on the site. Always fetch a fresh `updated_at` immediately before the PUT.

---

## Set feature image from body image

```json
{ "feature_image": "https://your-site.ghost.io/content/images/2026/02/image.jpg" }
```

Include in the same PUT call as status/published_at. No separate upload step needed if the image already exists in Ghost's content store.

---

## Bulk draft audit

Fetch all drafts with HTML for content review:

```
GET /posts/?limit=all&filter=status:draft&fields=id,title,slug,published_at,created_at,updated_at,html
```

Note: `tags` is NOT a valid `fields` param — use `&include=tags` as a separate param if you need tag data.

---

## Content API (public — read-only)

For client-side JS (e.g., homepage search), use the public Content API instead of Admin JWT:

**Key location:** Embedded in your site's HTML source — look for `data-key=` in script tags.

```bash
curl "https://your-site.ghost.io/ghost/api/content/posts/?key=YOUR_KEY&limit=all&fields=title,slug,excerpt,feature_image"
```

Safe to use in browser JS — read-only, published posts only. No JWT needed.
Do NOT use the Admin key in client-side code.

---

## Themes

Theme upload and activation requires owner-level access. Use Ghost Admin → Design → Upload theme for reliable deployment.

On newer Ghost Pro versions, the Admin API may accept theme upload via standard JWT:

```bash
# Test JWT theme upload — works on some Ghost Pro versions
curl -s -X POST "{url}/ghost/api/admin/themes/upload/" \
  -H "Authorization: Ghost {token}" \
  -F "file=@/path/to/theme.zip"
```

If it returns `200` — JWT works, activate with:
```bash
curl -s -X PUT "{url}/ghost/api/admin/themes/{theme-name}/activate/" \
  -H "Authorization: Ghost {token}"
```

If `403` — use Ghost Admin directly.

---

## Permission walls — do not re-attempt via API

These operations require owner-level access and have no API workaround:

| Operation | Why blocked | Workaround |
|-----------|------------|------------|
| `PUT /admin/settings/` (code injection) | Integration tokens read-only on settings | Use Ghost Admin directly |
| `GET /admin/integrations/` | Integration tokens cannot list integrations | Extract Content key from site HTML source |

---

## Code injection (owner-only)

Ghost site settings including code injection require owner-level access. Integration tokens return `403` on `PUT /admin/settings/`. This is expected Ghost behavior. Use Ghost Admin directly for code injection changes.

---

## Homepage search bar pattern

For client-side search across all published posts — inject into Ghost Site footer:

```html
<script>
(function(){
  var KEY='your-content-api-key';
  var GHOST='https://your-site.ghost.io';
  // Lazy-load all posts on first input focus
  // Filter client-side on every keystroke
  // Place above .site-title using insertBefore
})();
</script>
```

Key points:
- Use Content API key (safe for client-side), not Admin key
- Do NOT use an external script tag pointing to a LAN/private hostname — browsers block it (mixed content + Private Network Access policy)
- All CSS/JS must be inline in the code injection block
- Placement: `title.parentNode.insertBefore(wrap, title)` inserts ABOVE the site title

---

## Error codes

- `401` — expired/invalid token (regenerate)
- `404` — resource not found
- `409` — `updated_at` mismatch on PUT (re-fetch and retry)
- `422` — validation error (check required fields, HTML validity)
- `429` — rate limited (add delays between calls)
- `403 NoPermissionError` on settings write — integration token limitation, use browser fallback
