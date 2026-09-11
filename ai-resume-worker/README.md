# ai-resume-worker

Cloudflare Worker that adds a reasoning layer to the "Ask This Resume" widget
on josephvoelbel.com/ai-resume. The widget still does keyword retrieval
client-side against `data/resume-qa.json` (unchanged); this Worker takes the
widget's top-5 matches plus the visitor's question and asks Claude Haiku to
reason a real answer grounded only in that context, instead of printing the
single nearest-neighbor entry verbatim.

## Security note before you do anything else

**Do not paste your Anthropic API key into any chat, including with Claude
Code.** Set it with the `wrangler secret put` command below, run directly in
your own terminal — it prompts you to type or paste the key right there, and
it never has to leave your machine or appear in any conversation.

## One-time setup (run these yourself, in order)

All of this needs your own Cloudflare account and your own Anthropic API key.
Nothing here has been run yet — Anders (Claude Code) doesn't have Cloudflare
access and didn't provision anything.

```bash
cd ai-resume-worker

# 1. Log into Cloudflare (opens a browser window)
npx wrangler login

# 2. Create the KV namespace used for rate limiting + the daily cost cap
npx wrangler kv namespace create AI_RESUME_KV
# This prints something like:
#   [[kv_namespaces]]
#   binding = "AI_RESUME_KV"
#   id = "abcd1234..."
# Copy that "id" value into wrangler.toml, replacing
# REPLACE_WITH_KV_NAMESPACE_ID.

# 3. Set your Anthropic API key as a Worker secret (prompts interactively,
#    type/paste it here, not anywhere else)
npx wrangler secret put ANTHROPIC_API_KEY

# 4. Deploy
npx wrangler deploy
```

Step 4 prints your Worker's URL, something like:

```
https://ai-resume-worker.<your-subdomain>.workers.dev
```

## After deploy

1. Open `widget-ghost-injection.js` in this folder.
2. Replace the placeholder:
   ```js
   var WORKER_URL='https://REPLACE-WITH-YOUR-WORKER-SUBDOMAIN.workers.dev/chat';
   ```
   with your real Worker URL plus `/chat`, e.g.
   `https://ai-resume-worker.yoursubdomain.workers.dev/chat`.
3. Copy the entire contents of `widget-ghost-injection.js`.
4. In Ghost Admin, find script index 14 (or whichever script tag currently
   holds the "Ask This Resume" widget in code injection) and replace it with
   this file's contents.
5. Load josephvoelbel.com/ai-resume, ask a question, confirm you get a real
   answer back (not the old single-entry verbatim behavior).

## What's guarding cost and abuse

- **Per-IP rate limit:** 5 requests per IP per rolling 10-minute bucket, via
  a KV counter keyed on `CF-Connecting-IP`. The 6th request in that window
  gets a 429 with a "slow down" message instead of hitting Anthropic.
- **Daily ceiling:** a single KV counter caps total Anthropic calls at 500
  per UTC day, across all visitors combined. Once hit, the Worker stops
  calling Anthropic entirely for the rest of the day and returns a static
  "at its daily limit" message instead. This bounds the API bill no matter
  what traffic does.
- Both counters are plain KV read-then-write, not atomic — under real
  concurrent requests from the same IP in the same window, the limit can
  slip by a request or two. That's an accepted tradeoff for a personal
  resume site's traffic. If it ever needs to be exact, move to a Durable
  Object or Cloudflare's native Rate Limiting product instead of hand-rolled
  KV counting.
- Requests with an empty context array or a question over 500 characters are
  rejected before any Anthropic call.
- CORS is restricted to `https://josephvoelbel.com` and
  `https://www.josephvoelbel.com`. Note this only stops normal browsers —
  a scripted client can forge the `Origin` header, which is exactly why the
  rate limit and daily ceiling above (not CORS) are the real guard against
  cost abuse.

## Testing before you trust it

`npx wrangler dev` runs the Worker locally with hot reload and prints a
local URL. You can point `curl` at it to sanity check the endpoint before
touching the live widget:

```bash
curl -i -X POST http://localhost:8787/chat \
  -H "Content-Type: application/json" \
  -H "Origin: https://josephvoelbel.com" \
  -d '{"question":"What does Joseph do at Thomson Reuters?","context":[{"question":"What is Joseph'\''s current job?","answer":"Joseph is a Senior Instructional Designer and AI Transformation Lead at Thomson Reuters."}]}'
```

You should get back `{"answer": "..."}`. Try it 6 times in under 10 minutes
from the same machine to confirm the 6th comes back with the 429 slow-down
message — that's the rate limit working. Anders wrote this test but could
not run it (no Cloudflare account, no Anthropic key in this environment) —
please actually run it once before pointing the live widget at this Worker.

## Model ID

`wrangler.toml` sets `ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"`, the
current Haiku model ID as of when this was written. Anders could not verify
this against a live `GET /v1/models` call (no API key available in that
session), so before relying on this in production, confirm it still works —
either a successful test call, or check Anthropic's docs. It's a `var`, not
baked into the code, so you can update it and redeploy without touching
`index.js`.

## Files

- `index.js` — the Worker.
- `wrangler.toml` — Worker config. Fill in the KV namespace id before deploy.
- `widget-ghost-injection.js` — the full replacement for the widget's
  `<script>` in Ghost code injection. Only `ask()` changed from the current
  live version: it now sends the top 5 scoring resume-bank entries to the
  Worker instead of printing the single best match verbatim, and drops the
  per-entry "confidence:" line since that stopped being meaningful once an
  answer is synthesized across multiple entries. `tokenize`, `scoreEntry`,
  `load`, `renderChips`, and `build` are untouched.
