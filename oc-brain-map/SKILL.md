---
name: oc-brain-map
version: 1.0.0
description: Visualize your OpenClaw agent's cognition as a live, interactive D3.js force-directed graph. Parses session journal files to build a co-access matrix — which markdown files appear together per session — then renders that as a navigable node graph. Every vault file is a node. Frequency becomes proximity. Click any node to reorganize its orbit. Flow dots travel edges showing co-access direction and frequency. Includes a Node.js journal parser script, Next.js API route, and a full React + D3 component (BrainMapGraph.tsx). Works for any OpenClaw agent with a markdown vault and session journal history. Zero vertical specificity.
homepage: https://github.com/highnoonoffice/hno-skills
source: https://github.com/highnoonoffice/hno-skills/tree/main/oc-brain-map
license: MIT
metadata:
---

# OC Brain Map

**Visualize your agent's cognition as a live, interactive force-directed graph.**

Every markdown file in your vault is a node. Every time two files appear in the same session journal, an edge forms between them. Frequency becomes proximity — files accessed together drift together. Watch your memory architecture map itself.

---

## What This Skill Builds

A D3.js force-directed graph embedded in a React component (designed for Mission Control or any Next.js app). It parses your agent's session journals to extract co-access relationships between vault files, then renders them as an interactive graph with:

- **Click-to-focus** — click any node, the graph reorganizes its orbit around it
- **Flow dots** — luminescent dots travel edges showing co-access direction and frequency
- **Color-coded groups** — Core Identity, Memory, Publishing, Infrastructure, Skills, General
- **Live tooltips** — file path, access count, group, co-access sessions on hover

Zero vertical specificity. Works for any OpenClaw agent with a markdown vault and session journal history.

---

## Prerequisites

- OpenClaw agent with a vault directory containing markdown files
- Session journals in `memory/journal/YYYY-MM-DD.md` format (each entry references vault files)
- Mission Control (Next.js app) or equivalent React host — or serve standalone with `npx serve`
- Node.js 18+ for the data extraction script
- `d3` and `@types/d3` installed in your frontend project

---

## Installation

### Step 1 — Copy the data extraction script

Copy `references/journal-parser.md` into a Node.js script at `scripts/build-brain-map.js` in your vault (or Mission Control repo). The script:

1. Scans `memory/journal/*.md` for `.md` file references
2. Builds a co-access matrix (which files appear together per session)
3. Classifies each session by type (strategy, memory, publishing, infrastructure, research, general)
4. Outputs `data/brain-map-graph.json`

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

Copy `BrainMapGraph.tsx` from `references/component.md` into your `components/` directory. Import and render it in any page or tab:

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

| Session Type | Color | Keywords |
|---|---|---|
| Strategy / Planning | Gold | strategy, direction, roadmap, planning, HNO, product, business |
| Memory / Identity | Purple | memory, SOUL, identity, voice, self, Magnus |
| Publishing / Content | Green | Ghost, publish, article, newsletter, draft, Borges, stories, YouTube |
| Infrastructure / Code | Blue | Mission Control, deploy, build, GitHub, PR, API, route, launchd |
| Research / Analysis | Orange | research, analysis, audit, ClawHub, skill |
| General / Mixed | Gray | fallback |

---

## Interaction Model

| Action | Result |
|---|---|
| Click node | Node becomes gravitational center; simulation restarts at alpha 0.8; connected nodes pull in; unconnected drift outward and dim |
| Click same node again | Opens file in reader panel; graph resets to default |
| Click different node while focused | Refocuses to new node |
| Hover node | Tooltip: filename, path, access count, group, interaction hint |
| Hover edge | Tooltip: session type, source/target, co-access count, session dates |
| Scroll / drag background | Zoom and pan |
| Drag node | Temporarily fix position; releases on mouse-up |

---

## Flow Dot Animation

One SVG circle per edge, rendered inside the main `<g>` group so zoom/pan applies automatically.

- **Speed:** `0.00025 + weight * 0.00006` — heavier edges = faster dots
- **Phase offset:** `i * 0.413` per edge for visual variety
- **Direction:** upstream → downstream (core identity files are always upstream)
- **Glow:** SVG feGaussianBlur filter
- **Opacity:** 0.55 default, 0.9 on focused edge, 0 on unconnected edge

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

- Journal summaries reference files inconsistently — graph data is accurate but sparse until journaling habitually names files explicitly. Expected to improve over time.
- Graph rebuilds are not real-time; run the parser script to refresh.
- Reader panel (double-click to open file) requires a `/api/read-file` endpoint in your host app.

---

## References

- `references/journal-parser.md` — Node.js script to extract co-access data from journal files
- `references/component.md` — Full `BrainMapGraph.tsx` React + D3 component
- `references/graph-schema.md` — Graph JSON spec + Next.js API route

---

## License

MIT — use, modify, ship.
