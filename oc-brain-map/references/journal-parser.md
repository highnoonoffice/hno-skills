---
title: "OC Brain Map — Journal Parser Script"
created: 2026-03-17
modified: 2026-03-20
tags: [brain-map, journal, parser, node-script]
status: active
---

# Journal Parser — `scripts/build-brain-map.js`

Two-pass node discovery:
- **Pass 1 — Filesystem scan:** every `.md` file in your vault becomes a node, regardless of journal mentions. Nothing is invisible.
- **Pass 2 — Journal parsing:** extracts co-access relationships from `memory/journal/*.md` session files, builds edges, increments access counts.

Copy this script to `scripts/build-brain-map.js` in your vault or dashboard repo. Set `WORKSPACE_DIR` and `OUTPUT_PATH` via environment variables if needed.

---

## Script

```javascript
#!/usr/bin/env node
/**
 * OC Brain Map — Journal Parser + Filesystem Scanner
 * v2.5.0 — Two-pass node discovery:
 *   Pass 1: Scan vault filesystem — every .md file becomes a node
 *   Pass 2: Parse memory/journal/*.md — extract co-access edges + access counts
 */

const fs = require('fs');
const path = require('path');

// --- CONFIG ---
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.join(process.env.HOME, '.openclaw/vault');
const JOURNAL_DIR = path.join(WORKSPACE_DIR, 'memory/journal');
const OUTPUT_PATH = process.env.OUTPUT_PATH || path.join(process.cwd(), 'data/brain-map-graph.json');

// Directories to exclude from filesystem scan
const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', '.next', '.venv', '.venv-docx',
  'archive', '_git_stage'
  // Add your dashboard app directory here if it lives inside WORKSPACE_DIR
]);

// --- SESSION TYPE KEYWORDS ---
const SESSION_TYPE_KEYWORDS = {
  'strategy': ['strategy', 'direction', 'roadmap', 'planning', 'product', 'business'],
  'memory': ['memory', 'soul', 'identity', 'voice', 'self', 'journal', 'logging'],
  'publishing': ['publish', 'article', 'newsletter', 'draft', 'content', 'youtube', 'audio'],
  'infrastructure': ['deploy', 'build', 'api', 'route', 'server', 'cron', 'script', 'github'],
  'research': ['research', 'analysis', 'audit', 'skill'],
  'general': []
};

// --- NODE GROUP CLASSIFICATION ---
const CORE_FILES = new Set(['MEMORY.md', 'SOUL.md', 'USER.md', 'IDENTITY.md', 'AGENTS.md', 'TOOLS.md', 'HEARTBEAT.md', 'BOOTSTRAP.md']);
const GROUP_RULES = [
  { prefix: 'memory/', group: 'memory' },
  { prefix: 'PublishingPipeline/', group: 'publishing' },
  { prefix: 'drafts/', group: 'publishing' },
  { prefix: 'articles/', group: 'publishing' },
  { prefix: 'tools/', group: 'infrastructure' },
  { prefix: 'workflows/', group: 'infrastructure' },
  { prefix: 'prompts/', group: 'infrastructure' },
  { prefix: 'scripts/', group: 'infrastructure' },
  { prefix: '.learnings/', group: 'infrastructure' },
  { prefix: 'skills/', group: 'skills' },
];

function classifyGroup(filePath) {
  const basename = path.basename(filePath);
  if (CORE_FILES.has(basename) && !filePath.includes('/')) return 'core';
  for (const rule of GROUP_RULES) {
    if (filePath.startsWith(rule.prefix)) return rule.group;
  }
  return 'general';
}

function classifySessionType(text) {
  const lower = text.toLowerCase();
  for (const [type, keywords] of Object.entries(SESSION_TYPE_KEYWORDS)) {
    if (type === 'general') continue;
    if (keywords.some(k => lower.includes(k))) return type;
  }
  return 'general';
}

// --- UPSTREAM TIER (for flow dot direction) ---
const TIER = { core: 5, memory: 4, publishing: 2, infrastructure: 2, skills: 1, general: 0 };

// --- PASS 1: FILESYSTEM SCAN ---
function walkVault(dir, base) {
  const results = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }

  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.name !== '.learnings') continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(base, fullPath);
    if (entry.isDirectory()) {
      results.push(...walkVault(fullPath, base));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(relPath);
    }
  }
  return results;
}

console.log(`Scanning vault: ${WORKSPACE_DIR}`);
const allVaultFiles = walkVault(WORKSPACE_DIR, WORKSPACE_DIR);
console.log(`  Filesystem scan: ${allVaultFiles.length} .md files found`);

// Build initial node map from filesystem
const nodeMap = {};
for (const filePath of allVaultFiles) {
  nodeMap[filePath] = {
    id: filePath,
    group: classifyGroup(filePath),
    accessCount: 0,
    path: filePath,
    source: 'filesystem',
  };
}

// --- PASS 2: JOURNAL PARSING ---
const edgeMap = {};
let sessionCount = 0;

if (!fs.existsSync(JOURNAL_DIR)) {
  console.log('  No journal directory found — skipping edge extraction');
} else {
  const journalFiles = fs.readdirSync(JOURNAL_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
    .sort();

  console.log(`  Journal files: ${journalFiles.length}`);

  const mdPattern = /(?:^|\s|["'`(\/])([A-Z][A-Z0-9_-]*\.md|[\w\/\.\-]+\.md)(?:\s|["'`),.\]]|$)/gm;

  for (const jFile of journalFiles) {
    const content = fs.readFileSync(path.join(JOURNAL_DIR, jFile), 'utf8');
    const sessionDate = jFile.replace('.md', '');
    const sessionBlocks = content.split(/(?=^## Session)/m).filter(b => b.trim());

    for (const block of sessionBlocks) {
      const refs = new Set();
      let match;
      mdPattern.lastIndex = 0;

      while ((match = mdPattern.exec(block)) !== null) {
        const f = match[1];
        if (f.includes('://')) continue;
        if (f === 'YYYY-MM-DD.md') continue;
        if (f.startsWith('node_modules') || f.includes('dist/')) continue;
        refs.add(f);
      }

      if (refs.size === 0) continue;
      sessionCount++;

      const sessionType = classifySessionType(block);
      const refsArr = [...refs];

      // Increment access counts
      for (const ref of refsArr) {
        if (nodeMap[ref]) {
          nodeMap[ref].accessCount++;
          nodeMap[ref].source = 'journal';
        } else {
          // Mentioned in journal but not on filesystem — add anyway
          nodeMap[ref] = {
            id: ref,
            group: classifyGroup(ref),
            accessCount: 1,
            path: ref,
            source: 'journal-only',
          };
        }
      }

      // Build co-access edges
      for (let i = 0; i < refsArr.length; i++) {
        for (let j = i + 1; j < refsArr.length; j++) {
          const [a, b] = [refsArr[i], refsArr[j]].sort();
          const key = `${a}|||${b}`;
          if (!edgeMap[key]) {
            edgeMap[key] = { source: a, target: b, weight: 0, sessionType, sessions: [] };
          }
          edgeMap[key].weight++;
          if (!edgeMap[key].sessions.includes(sessionDate)) {
            edgeMap[key].sessions.push(sessionDate);
          }
        }
      }
    }
  }
}

// --- FLOW DIRECTION ---
function getTier(nodeId) {
  const node = nodeMap[nodeId];
  if (!node) return 0;
  return TIER[node.group] || 0;
}

const edges = Object.values(edgeMap).map(edge => {
  const aTier = getTier(edge.source) + (nodeMap[edge.source]?.accessCount || 0) * 0.01;
  const bTier = getTier(edge.target) + (nodeMap[edge.target]?.accessCount || 0) * 0.01;
  if (aTier >= bTier) return edge;
  return { ...edge, source: edge.target, target: edge.source };
});

// --- OUTPUT ---
const nodes = Object.values(nodeMap);
const graph = {
  nodes,
  edges,
  generated: new Date().toISOString(),
  sessionCount,
  meta: {
    filesystemNodes: nodes.filter(n => n.source === 'filesystem').length,
    journalNodes: nodes.filter(n => n.source === 'journal').length,
    journalOnlyNodes: nodes.filter(n => n.source === 'journal-only').length,
    totalFiles: nodes.length,
  }
};

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(graph, null, 2));

console.log(`\n✓ Brain map graph written: ${OUTPUT_PATH}`);
console.log(`  Total nodes: ${nodes.length}`);
console.log(`  Filesystem-only: ${graph.meta.filesystemNodes}`);
console.log(`  Journal-active: ${graph.meta.journalNodes}`);
console.log(`  Edges: ${edges.length}`);
console.log(`  Sessions processed: ${sessionCount}`);
```

---

## Improving Edge Quality

Filesystem scan guarantees all nodes. Edges are only as rich as your journal data.

Use the `--files` flag in your journal writer to explicitly list every `.md` file accessed in a session:

```bash
node scripts/journal-writer.js \
  --summary "Built the Brain Map rebuild endpoint and filesystem scan" \
  --files "memory/working.md,memory/recent.md,AGENTS.md,IDENTITY.md,scripts/build-brain-map.js"
```

Every read, write, or edit on a `.md` file during a session should be in that list. The more explicit the tracking, the richer the co-access graph becomes over time.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `WORKSPACE_DIR` | `~/.openclaw/vault` | Root of your OpenClaw workspace |
| `OUTPUT_PATH` | `data/brain-map-graph.json` in cwd | Where to write the graph JSON |
