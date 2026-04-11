---
title: "YouTube Pipeline Skill"
created: 2026-03-06
modified: 2026-03-18T11:35:00-05:00
tags: [skill, youtube, thumbnails, playlists, metadata]
status: active
---

# YouTube Pipeline (HNO)

Manage Joseph's YouTube channel (@JosephVoelbel) — metadata edits, playlists, thumbnails, and safe batch operations. Use when Joseph says: "update titles", "retitle videos", "playlist audit", "upload thumbnails", "thumbnail batch", "YouTube Studio", "metadata overhaul", "pillar", or anything about channel organization.

---

## Channel Facts

- **Channel:** @JosephVoelbel | ID: `UCS2dBXOeR6ANEJG2UfmOYLA`
- **API Key:** `~/.openclaw/credentials/youtube-api.json`
- **Stats (as of 2026-03-06):** ~1,700 subscribers, 81 videos, 368K total views
- **YouTube API impressions/CTR/watch time:** requires OAuth — not worth setting up at current scale

---

## Five Public Playlists (Locked 2026-03-06)

| Playlist | Content |
|----------|---------|
| **Pay Attention** | Bitcoin, AI, HNO, Installing OpenClaw, Plastic Jesus, Mandela Effect, 108 |
| **NINETEEN STORIES** | All 19 stories by Joseph Voelbel |
| **Ficciones** | Complete Borges Ficciones narrations (20 videos) |
| **Philosophical Literary Excerpts** | All other literary narrations |
| **Essays, First Series — Emerson** | Emerson essays (10 of 12 complete) |

All curation playlists, Aged Quill intro, MIND MOJO, and Borges Appearances are privated.

---

## Title Format Convention (Locked)

- **Literature:** `Title by Author | Reading type`
- **19 Stories:** `Story Title | Joseph Voelbel`
- **HNO/Bitcoin/AI:** `Title | Joseph Voelbel`
- No series numbering. Always include Joseph Voelbel name on own work.

---

## Thumbnail System

Three pillars with distinct visual languages:
- **System A (Literature):** Borges/Ficciones aesthetic
- **System B (Fiction):** Near-black/indigo ground, warm accent, figure as silhouette, vast negative space, flat graphic handmade quality — woodblock/ink feel
- **System C (HNO/Signal):** TBD

**Hard rules:**
- Master dimensions: **1280×720** (16:9). YouTube crops to square in list view — design for 16:9, accept the crop.
- No text in FLUX prompts — all OST (over-screen text) added in post via Python/Pillow compositor
- Font stack: Times Bold (series name), STIXGeneralBolIta (story title), STIXTwoText-Italic (byline)
- Always verify source image dimensions before batch: `python3 -c "from PIL import Image; print(Image.open('file.jpg').size)"`
- FLUX requires `"aspect_ratio":"custom"` for non-square dims

**Tools:** `tools/ficciones-ost.py` — compositor for System A thumbnails (locked, only story title changes per video)

---

## Core Rules

- Consistency beats micro-optimization. No A/B thumbnail testing unless Joseph explicitly asks.
- For mass metadata edits: small sample first, confirm, then continue.
- YouTube Studio throttles thumbnail uploads — upload one at a time, slow down on failures.
- YouTube API playlist views ≠ sum of video views (Studio metric not in public API).

---

## Typical Requests

- "Retitle all videos in playlist X to format Y" — use YouTube Data API PATCH on each video
- "Upload thumbnails for [series]" — one at a time via YouTube API or Studio
- "Audit what's public vs private" — list all videos/playlists via API, compare
- "Generate thumbnail system for [series]" — FLUX for image, Pillow for text overlay
