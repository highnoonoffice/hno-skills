---
title: "MagBox — Deployment Notes"
created: 2026-09-09
modified: 2026-09-09
tags: [magbox, deploy, reference]
status: active
---

# MagBox Deployment

## Directories

MagBox uses two directories, one per river:

- **To Agent** (`MAGBOX_TO_AGENT`, default `~/Inbox`) — the human uploads here; the agent reads from here.
- **From Agent** (`MAGBOX_FROM_AGENT`, default `~/Outbox`) — the agent writes here; the human downloads from here.

Keep them separate. Pointing both at one directory collapses the two-way history into a single pile and defeats the ledger.

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/` or `/from` | Drop from Agent (dark visual grid) |
| GET | `/to` | Drop to Agent (white drop page + sent tray) |
| GET | `/api/from` | JSON list of from-agent files |
| GET | `/api/to/list` | JSON list of to-agent files (the sent tray) |
| GET/HEAD | `/dl/from/<name>` | Download a from-agent file (range-aware) |
| GET/HEAD | `/dl/to/<name>` | Download a to-agent file |
| POST | `/api/to` | Upload from human to agent (multipart) |

## Env Overrides

- `MAGBOX_PORT` — default `9900`
- `MAGBOX_BIND` — default `0.0.0.0` (LAN). Set `127.0.0.1` to restrict to the local host only.
- `MAGBOX_TO_AGENT` — to-agent directory
- `MAGBOX_FROM_AGENT` — from-agent directory

## Health Check

```
curl -s http://localhost:9900/api/from
```

Returns a JSON array (possibly empty). A connection refused means the service is not running — check the launchd/systemd log.

## Media Streaming

The download routes answer HEAD and byte-range requests, so browsers can stream and seek video and audio in place rather than forcing a full download first. No extra config needed.

## Range-Request Note

Large media is streamed with partial responses. If a media file will not play in-browser, confirm the client sent a Range header and that the file extension maps to a known content type in the server's MIME table; unknown types fall back to a generic binary type and download instead of playing.
