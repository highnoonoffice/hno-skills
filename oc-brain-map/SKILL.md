---
name: brain-map-visualizer
version: 2.5.1
description: "Visualize your OpenClaw's cognition as a live, interactive, force-directed graph. Every markdown file in your workspace is a node. The closer to center, the more often it gets accessed. Moving dots show information flow: upstream files feed downstream ones. Watch cognition happen. Built on D3.js + React. Zero vertical specificity."
homepage: https://github.com/highnoonoffice/hno-skills
source: https://github.com/highnoonoffice/hno-skills/tree/main/oc-brain-map
license: MIT
metadata:
---

# Brain Map Visualizer

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

## Don't Have Journal Entries Yet?

No problem. If you've been running an OpenClaw agent but haven't been writing structured journal files, you can bootstrap them from your session history.

The pattern: pull your session transcripts or conversation logs, run them through a summarization script (or ask your agent to do it), and output one `memory/journal/YYYY-MM-DD.md` file per session. The parser only needs `.md` file references in the text — it doesn't care about format.

A simple bootstrap prompt for your agent:

> "Read my session history from [source] and generate a journal entry for each session at `memory/journal/YYYY-MM-DD.md`. Each entry should summarize what we worked on and reference the markdown files we accessed."

Once you have even a handful of journal files, the graph starts building. It gets richer over time as the journaling habit names files explicitly.

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

## Security

**Scope:** This skill reads markdown files in your vault directory and session journals to build a graph. It writes one JSON file (`brain-map-graph.json`) as output. No network calls are made beyond fetching the graph data from your own API route. No credentials are requested, stored, or transmitted.

**Tooltip rendering:** The interactive graph component renders tooltips as structured React elements (filename, group, session counts). No `dangerouslySetInnerHTML` or raw HTML injection is used anywhere in the component.

**Filesystem access:** The journal parser script (`references/journal-parser.md`) reads `.md` files recursively under your configured vault directory. It writes one output file. The read scope is intentional — this is what builds the graph. Run it only from a trusted working directory.

**API access control:** The route that serves graph data (`app/api/brain-map/graph/route.ts`) supports optional token-based access control via environment variable:

```bash
# In your .env.local or deployment environment
BRAIN_MAP_SECRET=your-secret-key-here
```

Then pass the key in requests from your component:

```typescript
fetch('/api/brain-map/graph', {
  headers: { 'x-brain-map-key': process.env.NEXT_PUBLIC_BRAIN_MAP_SECRET }
})
```

If `BRAIN_MAP_SECRET` is not set, the route is open — suitable for localhost development only. For any networked deployment, set the secret.

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
