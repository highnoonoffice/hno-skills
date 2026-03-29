# Ghost Publishing Pro — Webhook Bridge

An OpenClaw-native webhook bridge that listens for Ghost events and translates them into actions — without Zapier, Make, or any third-party service.

Ghost fires webhooks when things happen on your site. This bridge catches those events and maps them to whatever you want: post to Telegram, create a draft from RSS, tag a post, ping Slack, trigger another API.

---

## How It Works

Ghost sends a POST request to your webhook URL when an event fires. You run a lightweight Python listener (via the OpenClaw gateway or any open port) that receives the payload, validates it, and executes the mapped action.

```
Ghost event → POST to your listener → listener validates → executes action
```

No third-party service. No API key duplication. Runs on the same machine as OpenClaw.

---

## Step 1: Register a Webhook in Ghost

Ghost Admin → Settings → Integrations → Add custom integration → Webhooks → Add webhook.

Available Ghost webhook events:

| Event | Fires when... |
|-------|--------------|
| `post.published` | A post is published |
| `post.unpublished` | A post is unpublished |
| `post.updated` | A post is updated |
| `post.deleted` | A post is deleted |
| `page.published` | A page is published |
| `member.added` | A new member signs up |
| `member.updated` | A member's data changes |
| `member.deleted` | A member is removed |

Set the target URL to wherever your listener is running, e.g. `http://your-machine.local:8765/ghost-webhook`.

---

## Step 2: Run the Listener

A minimal Python listener using only stdlib — no Flask, no npm:

```python
#!/usr/bin/env python3
"""
Ghost webhook bridge — stdlib only, no dependencies.
Listens for Ghost events and dispatches to action handlers.
"""

import json
import hmac
import hashlib
from http.server import HTTPServer, BaseHTTPRequestHandler

# ── Config ────────────────────────────────────────────────────────────────────
PORT = 8765
WEBHOOK_SECRET = "your-webhook-secret"  # set in Ghost Admin when registering webhook

# ── Action handlers — add your own here ──────────────────────────────────────
def on_post_published(payload):
    post = payload.get("post", {}).get("current", {})
    title = post.get("title", "Untitled")
    url = post.get("url", "")
    print(f"[ghost-bridge] Post published: {title} → {url}")
    # Add your action here:
    # - Send Telegram message
    # - Create tweet draft
    # - Add tag via Admin API
    # - Trigger another OpenClaw cron

def on_member_added(payload):
    member = payload.get("member", {}).get("current", {})
    email = member.get("email", "unknown")
    print(f"[ghost-bridge] New member: {email}")
    # Add your action here:
    # - Send welcome Telegram ping
    # - Log to spreadsheet
    # - Add to external CRM

HANDLERS = {
    "post.published": on_post_published,
    "member.added": on_member_added,
    # add more event: handler pairs here
}

# ── Webhook validation ────────────────────────────────────────────────────────
def verify_signature(body: bytes, signature_header: str) -> bool:
    """Ghost signs webhooks with HMAC-SHA256. Verify before acting."""
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)

# ── HTTP handler ──────────────────────────────────────────────────────────────
class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/ghost-webhook":
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        sig = self.headers.get("X-Ghost-Signature", "")

        if WEBHOOK_SECRET and not verify_signature(body, sig):
            print("[ghost-bridge] Invalid signature — rejected")
            self.send_response(401)
            self.end_headers()
            return

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            return

        # Ghost sends the event type in the payload root key
        event = None
        for key in payload:
            if "." in key:
                event = key
                break
        # Fallback: Ghost also sends X-Ghost-Event header
        if not event:
            event = self.headers.get("X-Ghost-Event", "")

        handler = HANDLERS.get(event)
        if handler:
            try:
                handler(payload)
            except Exception as e:
                print(f"[ghost-bridge] Handler error for {event}: {e}")

        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        pass  # suppress default access log noise

# ── Start ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"[ghost-bridge] Listening on port {PORT}")
    HTTPServer(("0.0.0.0", PORT), WebhookHandler).serve_forever()
```

Run it:

```bash
python3 references/webhook-bridge.py
```

Keep it running as a background process or wire it to launchd for persistence.

---

## Step 3: Add Action Handlers

Each handler receives the full Ghost webhook payload. Common patterns:

**Send a Telegram message when a post is published:**

```python
import urllib.request

def on_post_published(payload):
    post = payload.get("post", {}).get("current", {})
    title = post.get("title", "")
    url = post.get("url", "")
    msg = f"New post published: {title}\n{url}"

    bot_token = "YOUR_BOT_TOKEN"
    chat_id = "YOUR_CHAT_ID"
    urllib.request.urlopen(
        f"https://api.telegram.org/bot{bot_token}/sendMessage"
        f"?chat_id={chat_id}&text={urllib.parse.quote(msg)}"
    )
```

**Add a tag to every newly published post via Ghost Admin API:**

```python
import requests, json, time, hashlib, hmac as _hmac, base64

def get_ghost_token():
    creds = json.load(open('/Users/you/.openclaw/credentials/ghost-admin.json'))
    id_, secret = creds['key'].split(':')
    header = base64.urlsafe_b64encode(json.dumps({"alg":"HS256","typ":"JWT","kid":id_}).encode()).rstrip(b'=').decode()
    now = int(time.time())
    payload = base64.urlsafe_b64encode(json.dumps({"iat":now,"exp":now+300,"aud":"/admin/"}).encode()).rstrip(b'=').decode()
    sig_input = f"{header}.{payload}".encode()
    sig = base64.urlsafe_b64encode(_hmac.new(bytes.fromhex(secret), sig_input, hashlib.sha256).digest()).rstrip(b'=').decode()
    return f"{header}.{payload}.{sig}"

def on_post_published(payload):
    post = payload.get("post", {}).get("current", {})
    post_id = post.get("id")
    updated_at = post.get("updated_at")
    existing_tags = [{"id": t["id"]} for t in post.get("tags", [])]
    existing_tags.append({"name": "auto-tagged"})  # creates tag if it doesn't exist

    creds = json.load(open('/Users/you/.openclaw/credentials/ghost-admin.json'))
    headers = {"Authorization": f"Ghost {get_ghost_token()}"}
    requests.put(
        f'{creds["url"]}/ghost/api/admin/posts/{post_id}/',
        headers=headers,
        json={"posts": [{"id": post_id, "updated_at": updated_at, "tags": existing_tags}]}
    )
```

**Create a Ghost draft from an RSS feed item:**

```python
import urllib.request, xml.etree.ElementTree as ET

def poll_rss_and_draft(rss_url: str):
    """Call this on a schedule (cron) to check RSS and create drafts for new items."""
    creds = json.load(open('/Users/you/.openclaw/credentials/ghost-admin.json'))
    headers = {"Authorization": f"Ghost {get_ghost_token()}", "Content-Type": "application/json"}

    feed = urllib.request.urlopen(rss_url).read()
    root = ET.fromstring(feed)
    for item in root.findall(".//item")[:5]:  # latest 5
        title = item.findtext("title", "")
        link = item.findtext("link", "")
        desc = item.findtext("description", "")
        html = f'<p><a href="{link}">{link}</a></p><p>{desc}</p>'

        requests.post(
            f'{creds["url"]}/ghost/api/admin/posts/?source=html',
            headers=headers,
            json={"posts": [{"title": title, "html": html, "status": "draft", "tags": [{"name": "rss-import"}]}]}
        )
```

---

## Running as a Persistent Service (launchd)

To keep the bridge alive across restarts, create a launchd plist:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.hno.ghost-webhook-bridge</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/Users/you/hno-skills/ghost-publishing-pro/references/webhook-bridge.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/ghost-bridge.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ghost-bridge-err.log</string>
</dict>
</plist>
```

Save to `~/Library/LaunchAgents/com.hno.ghost-webhook-bridge.plist` and load:

```bash
launchctl load ~/Library/LaunchAgents/com.hno.ghost-webhook-bridge.plist
```

---

## Security Notes

- Always set a `WEBHOOK_SECRET` in Ghost Admin when registering the webhook — it signs every request with HMAC-SHA256. The bridge validates this before executing any action.
- Never expose the listener port publicly without a reverse proxy (nginx/Caddy) with HTTPS. For local-only use (same machine as OpenClaw), `0.0.0.0:8765` is fine.
- The listener never touches credentials directly — action handlers load them as needed per call.
- To revoke: delete the webhook in Ghost Admin → Settings → Integrations. The bridge stops receiving events immediately.
