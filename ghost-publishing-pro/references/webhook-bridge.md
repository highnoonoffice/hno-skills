---
title: "Ghost Publishing Pro — Webhook Bridge"
created: 2026-03-18
modified: 2026-04-08
tags: [ghost, webhook, automation]
status: active
---

# Ghost Publishing Pro — Webhook Bridge

An OpenClaw-native webhook bridge that listens for Ghost events and routes them into actions — Telegram alerts, Slack pings, cross-site syndication, and more — without Zapier, Make, or any third-party service.

## What It Does

Ghost fires webhooks on events: `post.published`, `post.updated`, `member.created`, `member.deleted`, and others. This bridge listens for those events on a local HTTP port, verifies the payload signature, and runs whatever action you configure — send a Telegram message, trigger a cross-post, update a memory file, or call any other OpenClaw tool.

## Supported Triggers

| Ghost Event | Description |
|---|---|
| `post.published` | Fires when a post goes from draft → published |
| `post.updated` | Fires on any post save |
| `member.created` | New subscriber joined |
| `member.deleted` | Subscriber left |
| `member.updated` | Subscriber data changed |

## Supported Actions

- Telegram notification (post title, URL, subscriber count)
- Slack ping
- Cross-post to a second Ghost site
- Append to a memory file
- Any shell command or OpenClaw tool call

## Setup Overview

1. Register a webhook in Ghost Admin → Settings → Integrations → Add custom integration → Webhooks
2. Set the target URL to your local bridge endpoint (e.g. `http://your-machine.local:8765/ghost-webhook`)
3. Copy the webhook signing key Ghost provides
4. Store it in `~/.openclaw/credentials/ghost-webhook.json` as `{ "secret": "..." }`
5. Run the bridge script

## Full Implementation

The complete Python bridge script (signature verification, event routing, all action handlers) is available in the GitHub repository:

**https://github.com/highnoonoffice/hno-skills/tree/main/ghost-publishing-pro/references**

The script uses only Python standard library modules — no pip installs required.

## Notes

- The bridge runs on localhost only by default. Expose via a reverse proxy or tunnel (ngrok, Cloudflare Tunnel) if Ghost is on an external host.
- Signature verification uses Ghost's standard webhook signing — no external dependencies.
- Restart the bridge after changing action handlers. No hot-reload.
