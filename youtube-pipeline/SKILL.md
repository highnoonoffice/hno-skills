---
name: youtube-pipeline
description: Manage Joseph’s YouTube workflow: metadata edits, playlists, thumbnails, and safe batch operations. Use when Joseph says: "update titles", "retitle videos", "playlist audit", "upload thumbnails", "thumbnail batch", "YouTube Studio", "metadata overhaul", "pillar", or anything about channel organization.
---

# YouTube Pipeline (HNO)

Operate YouTube tasks with a bias toward consistency and low-risk batching.

## Core rules

- Consistency beats micro-optimization. Avoid random A/B thumbnail testing unless Joseph explicitly asks.
- Verify image dimensions before batch work.
- Expect throttling in YouTube Studio when uploading many thumbnails quickly.

## Thumbnails

1) Always confirm the target format
- YouTube thumbnails are 16:9. Master at 1280x720.

2) Dimension sanity check (before generating or uploading)
- Verify with Python/PIL or any reliable tool.

3) Upload cadence
- Upload one at a time. If Studio starts failing, slow down.

## Metadata and playlists

- Use pillar conventions for naming and organization (Joseph’s channel pillars).
- When doing mass edits, do a small sample first, confirm, then continue.

## Typical requests this skill should handle

- “Retitle all videos in playlist X to format Y”
- “Build a clean public playlist set (privating old curation lists)”
- “Generate a consistent thumbnail system and apply across a series”
- “Audit what’s public vs private and fix it”
