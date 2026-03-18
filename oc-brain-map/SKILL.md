---
name: brain-map-visualizer
version: 2.4.1
description: "Visualize your OpenClaw's cognition as a live, interactive, force-directed graph. Every markdown file in your workspace is a node. The closer to center, the more often it gets accessed. Moving dots show information flow: upstream files feed downstream ones. Watch cognition happen. Built on D3.js + React. Zero vertical specificity."
homepage: https://github.com/highnoonoffice/hno-skills
source: https://github.com/highnoonoffice/hno-skills/tree/main/oc-brain-map
license: MIT
metadata:
---

# Brain Map Visualizer

![Brain Map Visualizer in action](https://raw.githubusercontent.com/highnoonoffice/hno-skills/main/oc-brain-map/preview.jpg)

**Visualize your agent's cognition as a live, interactive force-directed graph.**

Every markdown file in your workspace is a node. Files accessed together in the same session drift toward each other. Click any node and the graph reorganizes its orbit around it — proximity shifts to show what lives in the same context. Moving dots show information flow: upstream files feed downstream ones. Watch cognition happen.

Double-click any node to open its contents. Works for any agent with a session journal and a vault of markdown files.

---

## What This Skill Builds

A D3.js force-directed graph embedded in a React component (designed for any Next.js dashboard app). It parses your agent's session journals to extract co-access relationships between vault files, then renders them as an interactive graph with:

- **Click-to-focus** — click any node, the graph reorganizes its orbit around it
- **Flow dots** — luminescent dots travel edges showing co-access direction and frequency
- **Color-coded groups** — Core Identity, Memory, Publishing, Infrastructure, Skills, General
- **Live tooltips** — file path, access count, group, co-access sessions on hover

Zero vertical specificity. Works for any OpenClaw agent with a markdown workspace and session journal history.

---

## Prerequisites

- OpenClaw agent with a vault directory containing markdown files
- Session journals in `memory/journal/YYYY-MM-DD.md` format (each entry references vault files)
- A Next.js dashboard app or equivalent React host — or serve standalone with `npx serve`
- Node.js 18+ for the data extraction script
- `d3` and `@types/d3` installed in your frontend project

---

## Optimized Journal Format (v2.4.0+)

The parser reads your journals to build the graph. The more explicitly you name files, the richer the signal. The recommended journal format puts structured sections first so the parser extracts clean signal without reading the full transcript:

```markdown
---
date: YYYY-MM-DD
tags: [journal, session-log]
work_types: [infrastructure, publishing, strategy, memory, research, creative, skills]
sessions:
  - session-id
---

## Summary
2-4 sentence summary of the session.

## Files Accessed
- MEMORY.md
- memory/recent.md
- memory/working.md
(explicit list of every vault .md file touched this session)

## What Shipped
## Decisions Made
## Open Threads

---
## Transcript
(full transcript appended last — parser stops reading after structured sections)
```

**Key fields:**
- `work_types` — drives edge color classification directly without keyword guessing
- `## Files Accessed` — explicit list is the primary parser signal. Name every file you touch.
- Transcript preserved at the bottom — full context available, doesn't pollute the graph signal

**Don't have journal entries yet?** Bootstrap from session history:

> "Read my session history from [source] and generate a journal entry for each session at `memory/journal/YYYY-MM-DD.md`. Each entry should list the markdown files accessed in a `## Files Accessed` section."

Once you have even a handful of journal files, the graph starts building. It gets richer over time.

---

## Installation

### Step 1 — Copy the data extraction script

Copy `references/journal-parser.md` into a Node.js script at `scripts/build-brain-map.js` in your workspace. Adjust `VAULT_DIR` and `OUTPUT_PATH` via environment variables if needed.

Run it:
```bash
node scripts/build-brain-map.js
```

### Step 2 — Wire the API route

In your Next.js app, add the API route from `references/graph-schema.md`. It serves `brain-map-graph.json` with no caching:

```
app/api/brain-map/graph/route.ts
```

### Step 3 — Add the React component

Copy `BrainMapGraph.tsx` from `references/component.md` into your `components/` directory:

```tsx
import BrainMapGraph from '@/components/BrainMapGraph';

export default function BrainMapTab() {
  return <BrainMapGraph />;
}
```

### Step 4 — Rebuild graph data

Run the parser script any time to refresh the graph. Add it to a cron job for weekly updates:

```bash
# Weekly brain map rebuild (Sunday midnight)
0 0 * * 0 cd /path/to/vault && node scripts/build-brain-map.js
```

---

## Graph Data Format

See `references/graph-schema.md` for the full spec. Short version:

```json
{
  "nodes": [
    { "id": "MEMORY.md", "group": "core", "accessCount": 7, "path": "MEMORY.md" }
  ],
  "edges": [
    {
      "source": "MEMORY.md",
      "target": "memory/recent.md",
      "weight": 5,
      "sessionType": "memory",
      "sessions": ["2026-03-14", "2026-03-15"]
    }
  ],
  "generated": "2026-03-17T23:00:00Z",
  "sessionCount": 37
}
```

---

## Node Color Groups

| Group | Color | Files |
|---|---|---|
| Core Identity | Gold `#c8a84b` | MEMORY.md, SOUL.md, USER.md, IDENTITY.md, AGENTS.md, TOOLS.md |
| Memory | Purple `#a78bfa` | memory/*.md |
| Publishing / Content | Green `#22c55e` | PublishingPipeline/*, drafts/* |
| Tools / Infrastructure | Blue `#60a5fa` | tools/*, workflows/*, prompts/*, scripts/* |
| Skills | Orange `#f97316` | skills/* |
| General | Gray `#6b7280` | Everything else |

---

## Edge Colors (Session Type)

Session type is auto-classified from journal text keywords:

| Session Type | Color | Example keywords |
|---|---|---|
| Strategy / Planning | Gold | strategy, roadmap, planning, product, business |
| Memory / Identity | Purple | memory, identity, voice, self |
| Publishing / Content | Green | publish, article, draft, content |
| Infrastructure / Code | Blue | deploy, build, API, route, server, cron |
| Research / Analysis | Orange | research, analysis, audit, skill |
| General / Mixed | Gray | fallback |

---

## Interaction Model

| Action | Result |
|---|---|
| Click node | Node becomes gravitational center; connected nodes pull in; unconnected drift outward and dim |
| Click same node again | Opens file in reader panel; graph resets to default |
| Click different node while focused | Refocuses to new node |
| Hover node | Tooltip: filename, path, access count, group |
| Hover edge | Tooltip: session type, source/target, co-access count, session dates |
| Scroll / drag background | Zoom and pan |
| Drag node | Temporarily fix position; releases on mouse-up |

---

## Flow Dot Animation

One SVG circle per edge, rendered inside the main `<g>` group so zoom/pan applies automatically.

- **Speed:** `0.00025 + weight * 0.00006` — heavier edges = faster dots
- **Direction:** upstream → downstream (core identity files are always upstream)
- **Glow:** SVG feGaussianBlur filter

### Upstream Tier Hierarchy

```
core identity: 5
memory: 4
publishing / infrastructure: 2
skills: 1
journal / general: 0
```

Higher tier = upstream. Ties broken by access count.

---

## Known Limitations

- Journal summaries reference files inconsistently — graph data improves naturally as journaling explicitly names files.
- Graph rebuilds are not real-time; run the parser script to refresh.
- Reader panel (double-click to open file) requires a `/api/read-file` endpoint in your host app.

---

## References

- `references/journal-parser.md` — Node.js script to extract co-access data from journal files
- `references/component.md` — Full `BrainMapGraph.tsx` React + D3 component
- `references/graph-schema.md` — Graph JSON spec + Next.js API route

---

## License

MIT. Copyright (c) 2026 @highnoonoffice. Retain this notice in any distributed version.
