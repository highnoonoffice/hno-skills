---
name: brain-map-visualizer
version: 3.1.2
description: "Visualize how attention moves across your agent's projects. Every markdown file is a node grouped by an Attention Pocket — an active focus area shaped by session history. First click reorbits the graph around that file's cognitive neighborhood. Second click opens the file. Built on D3.js + React. Local only."
homepage: https://github.com/highnoonoffice/hno-skills
source: https://github.com/highnoonoffice/hno-skills/tree/main/oc-brain-map
license: MIT
metadata: ~
---

# Brain Map Visualizer

The Brain Map Visualizer renders your agent's cognition as an interactive force-directed graph organized around Attention Pockets — project-level groupings that define how files relate to each other in context.

Markdown files are nodes. Sessions build the edges. The graph reflects not just which files were accessed, but which files were accessed together, and in what project context. A file that is central in one Attention Pocket may be peripheral in another. That context-dependence is the core insight the graph exposes.

First click on any node reorbits the graph around it: the layout reorganizes to show that file's cognitive neighborhood within its Attention Pocket. Nearby nodes share frequent co-access in the same sessions. Distant nodes rarely overlap. Second click opens the file.

Works for any OpenClaw agent with a vault of markdown files and a session journal history.

---

## What This Skill Builds

A D3.js force-directed graph embedded in a React component, designed for any Next.js dashboard app or standalone React host. The skill parses session journals to extract co-access relationships between vault files, attributes those relationships to Attention Pockets, and renders them as an interactive graph with attention-flow visualization.

**Nodes** — every markdown file in your vault, grouped and color-coded by Attention Pocket.

**Edges** — co-access relationships between files. An edge exists when two files appear in the same session journal. Edge weight reflects how many sessions they were co-accessed. Session type (planning, coding, publishing, etc.) is auto-classified from journal keywords and encoded as edge color.

**Graph behavior** — the layout reflects attention flow and session patterns. Files that are co-accessed frequently in the same project context stay close. Files with weak or no shared context drift apart and dim.

**Reorbit** — first click on any node shifts the graph from project view to file-centric cognitive view centered on that node. The rest of the graph reorganizes by co-access strength relative to that file.

---

## Attention Model

**Attention Pocket**
A project-level grouping of files based on active focus and session attribution. Attention Pockets are color-coded in the graph and represent distinct cognitive domains (Core Identity, Memory, Publishing, Infrastructure, Skills, General). A file belongs to the Attention Pocket that its directory structure maps to.

**Attention Flow**
The movement of activity between files and across pockets over time. Represented in the graph as animated flow dots traveling along edges. Dot speed is proportional to co-access weight. Direction is upstream to downstream, determined by file tier hierarchy.

**Session Influence**
The graph structure is built from repeated co-access across sessions, not from single-session snapshots. A strong edge between two files means they have appeared together across multiple sessions in similar project contexts. The graph is a cumulative record of where attention has been, not a real-time snapshot.

**Context-Dependence**
The same file can occupy different positions depending on the active Attention Pocket. `working.md` may be the gravitational center of a project-focused view and peripheral in a memory-focused view. This is expected behavior. The reorbit interaction makes this visible.

---

## Reorbit Interaction

The graph has two interaction modes: project view and file-centric view.

**Project view (default)**
All nodes rendered with full weight according to global co-access frequency. Color-coded by Attention Pocket. Flow dots show system-wide attention movement.

**First click — reorbit**
Clicking any node does not open the file. It recenters the graph around that node and reorganizes all other nodes based on co-access strength relative to the selected node:

- Strongly co-accessed nodes pull close
- Weakly co-accessed nodes drift outward and dim
- The surrounding cluster is that file's cognitive neighborhood within its Attention Pocket

This shift reveals how a file behaves in context, not just how often it is accessed.

**Second click — open file**
Clicking the already-focused node opens its contents in the reader panel. The graph resets to project view when the reader panel closes.

**Click different node while focused**
Refocuses to the new node without resetting first.

The reorbit model means clicking is never destructive to the current view. Project view is always one close-reader-panel action away from restoration.

---

## Additional Features

**Enhanced Tooltips**
Node hover: file path, access count, Attention Pocket, co-access session count. Edge hover: session type, source/target names, co-access count, session dates.

**Edge Filter**
Toggle minimum co-access weight threshold (default 2x, options: all / 2x / 3x / 5x). Reduces visual noise on dense graphs.

**Graph Freeze**
When the simulation cools, nodes lock in place. No ongoing jitter. Drag to reposition any node; it releases on mouse-up.

**Rebuild Button**
Triggers a full journal rescan and graph data refresh via the parser API endpoint. Shows spinner and status feedback.

---

## Prerequisites

- OpenClaw agent with a vault directory containing markdown files
- Session journals in `memory/journal/YYYY-MM-DD.md` format (each entry references vault files)
- A Next.js dashboard app or equivalent React host — or serve standalone with `npx serve`
- Node.js 18+ for the data extraction script
- `d3` and `@types/d3` installed in your frontend project

---

## Bootstrapping Without Journal History

If you have been running an agent but have not written structured journal files, bootstrap from session history:

Pull session transcripts or conversation logs, run them through a summarization script, and output one `memory/journal/YYYY-MM-DD.md` per session. The parser only needs `.md` file references in the text. Format does not matter.

Bootstrap prompt for your agent:

> "Read my session history from [source] and generate a journal entry for each session at `memory/journal/YYYY-MM-DD.md`. Summarize what we worked on and list the markdown files we accessed."

The graph builds from whatever journal history exists and gets richer over time as more sessions are logged.

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

See `references/graph-schema.md` for the full spec.

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

## Attention Pockets — Color Mapping

| Pocket | Color | Files |
|---|---|---|
| Core Identity | Gold `#c8a84b` | MEMORY.md, SOUL.md, USER.md, IDENTITY.md, AGENTS.md, TOOLS.md |
| Memory | Purple `#a78bfa` | memory/*.md |
| Publishing | Green `#22c55e` | PublishingPipeline/*, drafts/* |
| Infrastructure | Blue `#60a5fa` | tools/*, workflows/*, prompts/*, scripts/* |
| Skills | Orange `#f97316` | skills/* |
| General | Gray `#6b7280` | Everything else |

---

## Edge Colors — Session Type

Session type is auto-classified from journal text keywords:

| Session Type | Color | Keywords |
|---|---|---|
| Strategy / Planning | Gold | strategy, roadmap, planning, product, business |
| Memory / Identity | Purple | memory, identity, voice, self |
| Publishing / Content | Green | publish, article, draft, content |
| Infrastructure / Code | Blue | deploy, build, API, route, server, cron |
| Research / Analysis | Orange | research, analysis, audit, skill |
| General / Mixed | Gray | fallback |

---

## Flow Dot Animation

One SVG circle per edge. Rendered inside the main `<g>` group so zoom and pan apply automatically.

- **Speed:** `0.00025 + weight * 0.00006` — heavier edges produce faster dots
- **Direction:** upstream to downstream; core identity files are always upstream
- **Glow:** SVG feGaussianBlur filter

### Upstream Tier Hierarchy

```
core identity: 5
memory: 4
publishing / infrastructure: 2
skills: 1
journal / general: 0
```

Higher tier is upstream. Ties broken by access count.

---

## Security

**Scope:** The skill reads markdown files in your vault directory and session journals to build a graph. It writes one JSON file (`brain-map-graph.json`) as output. No network calls are made beyond fetching graph data from your own local API route. No credentials are requested, stored, or transmitted.

**Filesystem access:** The journal parser reads `.md` files recursively under your configured vault directory and writes one output file. Scope is intentional and bounded. Run the parser only from a trusted working directory.

**Tooltip rendering:** The graph component renders tooltips as structured React elements (filename, group, session counts). No `dangerouslySetInnerHTML` or raw HTML injection is used anywhere in the component.

**API access control:** The route serving graph data supports optional token-based access control:

```bash
BRAIN_MAP_SECRET=your-secret-key-here
```

Pass the key in component requests:

```typescript
fetch('/api/brain-map/graph', {
  headers: { 'x-brain-map-key': process.env.NEXT_PUBLIC_BRAIN_MAP_SECRET }
})
```

If `BRAIN_MAP_SECRET` is not set, the route is open — suitable for localhost development only. Set the secret for any networked deployment.

---

## Known Limitations

- Journal summaries reference files inconsistently — graph data improves as journaling explicitly names files.
- Graph rebuilds are not real-time; run the parser script to refresh.
- Reader panel (second click to open file) requires a `/api/read-file` endpoint in the host app.

---

## References

- `references/journal-parser.md` — Node.js script to extract co-access data from session journals
- `references/component.md` — Full `BrainMapGraph.tsx` React + D3 component
- `references/graph-schema.md` — Graph JSON spec and Next.js API route

---

## License

MIT. Copyright (c) 2026 @highnoonoffice. Retain this notice in any distributed version.
