---
name: magbox
version: 0.1.0
description: "Two computers, one agent, files flowing both ways — with a record of every hand-off."
homepage: https://github.com/highnoonoffice/hno-skills
source: https://github.com/highnoonoffice/hno-skills
license: MIT
metadata: ~
config:
  - MAGBOX_TO_AGENT — directory where human uploads land (default ~/Inbox)
  - MAGBOX_FROM_AGENT — directory the agent writes into for the human (default ~/Outbox)
  - MAGBOX_PORT — listen port (default 9900)
  - MAGBOX_BIND — bind host (default 0.0.0.0 for LAN; 127.0.0.1 to lock to localhost)
---

# MagBox

You have two machines and an agent. You need files moving both directions, and you want to see what went each way. Chat apps mangle documents, split long text into uncopyable fragments, and keep no ledger. A shared folder has no record and no browser view. MagBox is the small piece in between: a two-way file bridge on your own network, with a visible history of every hand-off.

Two rivers flow through it:

- **Drop to Agent** — the human uploads a file. It lands in the agent's inbox. A hidden tray at the bottom of the page shows everything you've sent.
- **Drop from Agent** — the agent drops a file for the human. The human opens a visual grid (image thumbnails, file icons, size, and time) and downloads it.

Both directions are timestamped and browsable, so the record of what moved is the product, not an afterthought.

## The Core Value

The agent produced something and the human needs it off the machine cleanly. Or the human has a file on their laptop that the agent (running on the desktop) needs. MagBox handles both without leaving the local network, without an account, and without a chat client chewing up the file. The bidirectional history means either side can answer "what did we hand each other, and when."

## When the Agent Should Reach For MagBox

This is the decision layer. The server is plumbing; this is the skill.

- **Non-sensitive file the human needs off the box** → write it to the `from-agent` directory, then hand back the MagBox URL plus a `MEDIA:` line so it also attaches in chat. Best default for documents, images, audio, video, exports.
- **A copy-pasteable block that a chat client would split or corrupt** (long hand-offs, code, structured text) → write it to a `.txt` in the `from-agent` directory and hand back the URL. One clean copy instead of a fractured fence.
- **Sensitive content** (keys, tokens, passwords, anything private) → local directory ONLY. Never MagBox, never chat. MagBox is unauthenticated by design (see Security).
- **A quick inline answer** → just say it in chat. Do not route trivial text through MagBox.

## Hard Rules

- **Never overwrite.** Before writing a file for the human, list the directory first. If the name exists, append `-v2`, `-v3`. A hand-off should never silently clobber the last one.
- **Hand back the hostname, not a hard IP.** Use `http://<hostname>:<port>/...`. LAN IPs change with DHCP and break the link. The server prints the hostname form on startup for this reason.
- **The human may not be on the LAN.** MagBox only works when the human's device is on the same network. If they signal they can't reach it (on a phone away from home, on cellular), fall back: produce a short artifact inline, or split a long one deliberately with a warning. Do not hand a URL to someone who can't open it.
- **Confirm before deleting.** Clearing either directory is destructive. Preview, then confirm.

## Setup

1. Put `scripts/magbox-server.js` somewhere stable on the host.
2. Pick your two directories (defaults: `~/Inbox` for to-agent, `~/Outbox` for from-agent) or set the env overrides.
3. Install the service:
   - macOS: edit and load `templates/magbox.plist` (see the header comment in the file).
   - Linux: edit and enable `templates/magbox.service`.
4. Verify it is up: open `http://<hostname>:9900/` in a browser. You should see the Drop from Agent grid. `/to` is the Drop to Agent page.

## Security — Read This

MagBox has **no authentication**. That is intentional and correct for a private LAN: the network boundary is the access control. Anyone who can reach the port can read and write the two directories.

- Safe: a home or trusted local network, bound to the LAN.
- Not safe: a public IP, a shared/coworking network, or any port-forward to the internet. Do not deploy it there. If you need remote access, put it behind a VPN (for example Tailscale) and keep the bind local — never expose the raw port.

This boundary is a feature on the right network and a vulnerability on the wrong one. Know which one you are on before you start it.

## What This Skill Deliberately Does Not Do

No accounts, no cloud sync, no HTTPS, no per-file permissions. Those turn a sharp local tool into a service with an ops burden. The strong version is: two directories, two clean views, a visible history, and the routing discipline above. That is the whole skill.
