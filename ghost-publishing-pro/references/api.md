# Ghost Admin API Reference

## Authentication

Ghost Admin API keys have the format `{id}:{secret}` (split on first `:`).

Tokens expire in 5 minutes. Regenerate before every API call.

**Generate token — pure Node.js (no npm required):**
```js
const crypto = require('crypto');
const key = 'id:secret';
const [id, secret] = key.split(':');
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT',kid:id})).toString('base64url');
const now = Math.floor(Date.now()/1000);
const payload = Buffer.from(JSON.stringify({iat:now,exp:now+300,aud:'/admin/'})).toString('base64url');
const sig = crypto.createHmac('sha256',Buffer.from(secret,'hex')).update(header+'.'+payload).digest('base64url');
const token = header+'.'+payload+'.'+sig;
```

Run inline with credentials file:
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

## Error codes

- `401` — expired/invalid token (regenerate)
- `404` — resource not found
- `409` — `updated_at` mismatch on PUT (re-fetch and retry)
- `422` — validation error (check required fields, HTML validity)
- `429` — rate limited (add delays between calls)
