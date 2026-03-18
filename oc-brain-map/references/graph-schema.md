---
title: "OC Brain Map — Graph Schema & API Route"
created: 2026-03-17
modified: 2026-03-17
tags: [brain-map, schema, api, nextjs]
status: active
---

# Graph Schema & API Route

## `brain-map-graph.json` — Full Schema

```typescript
interface GraphData {
  nodes: Node[];
  edges: Edge[];
  generated: string;   // ISO timestamp of last parser run
  sessionCount: number;
}

interface Node {
  id: string;          // Relative path from vault root, e.g. "MEMORY.md", "memory/recent.md"
  group: NodeGroup;
  accessCount: number; // Number of sessions this file appeared in
  path: string;        // Same as id (kept for component compatibility)
}

type NodeGroup =
  | 'core'             // MEMORY.md, SOUL.md, USER.md, IDENTITY.md, AGENTS.md, TOOLS.md
  | 'memory'           // memory/*.md
  | 'publishing'       // PublishingPipeline/*, drafts/*
  | 'infrastructure'   // tools/*, workflows/*, prompts/*, scripts/*
  | 'skills'           // skills/*
  | 'journal'          // memory/journal/*
  | 'general';         // everything else

interface Edge {
  source: string;      // upstream file id
  target: string;      // downstream file id
  weight: number;      // co-access count (number of sessions both files appeared)
  sessionType: SessionType;
  sessions: string[];  // date strings of sessions where co-access occurred (YYYY-MM-DD)
}

type SessionType =
  | 'strategy'
  | 'memory'
  | 'publishing'
  | 'infrastructure'
  | 'research'
  | 'general';
```

## Example JSON

```json
{
  "nodes": [
    { "id": "MEMORY.md", "group": "core", "accessCount": 7, "path": "MEMORY.md" },
    { "id": "memory/recent.md", "group": "memory", "accessCount": 5, "path": "memory/recent.md" },
    { "id": "SOUL.md", "group": "core", "accessCount": 3, "path": "SOUL.md" }
  ],
  "edges": [
    {
      "source": "MEMORY.md",
      "target": "memory/recent.md",
      "weight": 5,
      "sessionType": "memory",
      "sessions": ["2026-03-14", "2026-03-15", "2026-03-16", "2026-03-17"]
    },
    {
      "source": "MEMORY.md",
      "target": "SOUL.md",
      "weight": 3,
      "sessionType": "memory",
      "sessions": ["2026-03-14", "2026-03-15", "2026-03-16"]
    }
  ],
  "generated": "2026-03-17T23:00:00.000Z",
  "sessionCount": 37
}
```

---

## Next.js API Route

Place at `app/api/brain-map/graph/route.ts` in your Mission Control (or any Next.js 13+ app):

```typescript
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const GRAPH_PATH = path.join(process.cwd(), 'data/brain-map-graph.json');

export async function GET() {
  try {
    if (!fs.existsSync(GRAPH_PATH)) {
      return NextResponse.json(
        { error: 'Graph data not found. Run scripts/build-brain-map.js first.' },
        { status: 404 }
      );
    }
    const raw = fs.readFileSync(GRAPH_PATH, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to read graph data', detail: String(err) },
      { status: 500 }
    );
  }
}
```

---

## Rebuild API Route (Optional)

To trigger a graph rebuild from the UI, add a POST handler. This requires `scripts/build-brain-map.js` to exist in your vault or app root.

```typescript
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  try {
    const vaultDir = process.env.VAULT_DIR || `${process.env.HOME}/.openclaw/vault`;
    const { stdout, stderr } = await execAsync(
      `node ${vaultDir}/scripts/build-brain-map.js`,
      { env: { ...process.env, VAULT_DIR: vaultDir } }
    );
    return NextResponse.json({ success: true, output: stdout, errors: stderr });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
```

---

## Notes

- The API route does not cache (`Cache-Control: no-store`) — graph data rebuilds are infrequent and the file is small.
- If using the rebuild POST route, the builder script runs synchronously in the request handler. For large vaults, consider spawning a background process or triggering via cron instead.
