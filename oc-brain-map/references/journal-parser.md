---
title: "OC Brain Map — Journal Parser Script"
created: 2026-03-17
modified: 2026-03-17
tags: [brain-map, journal, parser, node-script]
status: active
---

# Journal Parser — `scripts/build-brain-map.js`

Parses `memory/journal/*.md` session files, extracts `.md` file references per session, builds a co-access matrix, classifies session types, and writes `data/brain-map-graph.json`.

Copy this script to `scripts/build-brain-map.js` in your vault or Mission Control repo. Adjust `WORKSPACE_DIR` and `OUTPUT_PATH` for your environment.

---

## Script

```javascript
#!/usr/bin/env node
/**
 * OC Brain Map — Journal Parser
 * Scans memory/journal/*.md, extracts .md file references per session,
 * builds co-access matrix, outputs data/brain-map-graph.json
 */

const fs = require('fs');
const path = require('path');

// --- CONFIG ---
// WORKSPACE_DIR: path to your OpenClaw workspace (default: ~/.openclaw/vault)
// This is the root directory OpenClaw uses for your agent's markdown files.
// Override via environment variable: WORKSPACE_DIR=/path/to/workspace
// OUTPUT_PATH: where to write the graph JSON (default: data/brain-map-graph.json in cwd)
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || process.env.WORKSPACE_DIR || path.join(process.env.HOME, '.openclaw/vault');
const JOURNAL_DIR = path.join(WORKSPACE_DIR, 'memory/journal');
const OUTPUT_PATH = process.env.OUTPUT_PATH || path.join(process.cwd(), 'data/brain-map-graph.json');

// --- SESSION TYPE KEYWORDS ---
const SESSION_TYPE_KEYWORDS = {
  'strategy': ['strategy', 'direction', 'roadmap', 'planning', 'hno', 'product', 'business', 'retailwire', 'icp', 'client'],
  'memory': ['memory', 'soul', 'identity', 'voice', 'self', 'magnus', 'journal', 'logging'],
  'publishing': ['ghost', 'publish', 'article', 'newsletter', 'draft', 'borges', 'stories', 'youtube', 'audio'],
  'infrastructure': ['mission control', 'deploy', 'build', 'github', 'pr', 'api', 'route', 'launchd', 'server', 'cron', 'script'],
  'research': ['research', 'analysis', 'audit', 'clawhub', 'skill', 'cadmus', 'replicate'],
  'general': []
};

// --- NODE GROUP CLASSIFICATION ---
const CORE_FILES = new Set(['MEMORY.md', 'SOUL.md', 'USER.md', 'IDENTITY.md', 'AGENTS.md', 'TOOLS.md', 'HEARTBEAT.md', 'BOOTSTRAP.md']);
const MEMORY_PREFIXES = ['memory/'];
const PUBLISHING_PREFIXES = ['PublishingPipeline/', 'drafts/', 'articles/'];
const INFRA_PREFIXES = ['tools/', 'workflows/', 'prompts/', 'scripts/'];
const SKILL_PREFIXES = ['skills/'];

function classifyGroup(filePath) {
  const basename = path.basename(filePath);
  if (CORE_FILES.has(basename) && !filePath.includes('/')) return 'core';
  for (const p of MEMORY_PREFIXES) if (filePath.startsWith(p)) return 'memory';
  for (const p of PUBLISHING_PREFIXES) if (filePath.startsWith(p)) return 'publishing';
  for (const p of INFRA_PREFIXES) if (filePath.startsWith(p)) return 'infrastructure';
  for (const p of SKILL_PREFIXES) if (filePath.startsWith(p)) return 'skills';
  if (filePath.startsWith('memory/journal/')) return 'journal';
  return 'general';
}

function classifySessionType(text) {
  const lower = text.toLowerCase();
  for (const [type, keywords] of Object.entries(SESSION_TYPE_KEYWORDS)) {
    if (type === 'general') continue;
    if (keywords.some(kw => lower.includes(kw))) return type;
  }
  return 'general';
}

function extractMdRefs(text) {
  // Match markdown file references like memory/recent.md, MEMORY.md, etc.
  // Restricted to safe path characters — no .. traversal, no absolute paths
  const pattern = /(?:^|[\s`'"([\]])([A-Za-z0-9_\-][A-Za-z0-9_\-./]*\.md)(?=[^A-Za-z0-9_\-./]|$)/gm;
  const refs = new Set();
  let match;
  while ((match = pattern.test(text) && pattern.lastIndex, match = pattern.run(text)) !== null) {
    const ref = match[1].trim();
    if (ref.length < 4) continue;
    if (ref.startsWith('http')) continue;
    if (ref.includes('..')) continue;   // block traversal paths
    if (ref.startsWith('/')) continue;  // block absolute paths
    refs.add(ref);
  }
  return Array.from(refs);
}

function getTierForGroup(group) {
  const tiers = { core: 5, memory: 4, publishing: 2, infrastructure: 2, skills: 1, general: 0, journal: 0 };
  return tiers[group] || 0;
}

async function main() {
  if (!fs.existsSync(JOURNAL_DIR)) {
    console.error(`Journal directory not found: ${JOURNAL_DIR}`);
    process.exit(1);
  }

  const journalFiles = fs.readdirSync(JOURNAL_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  process.stdout.write(`Found ${journalFiles.length} journal files\n`);

  // Per-file stats
  const accessCounts = {};   // file -> total sessions it appeared in
  // Co-access matrix: file_a + file_b -> { weight, sessionType, sessions }
  const edgeMap = {};        // `${a}|||${b}` -> { weight, sessionType, sessions }

  const sessions = [];

  for (const jf of journalFiles) {
    const fullPath = path.join(JOURNAL_DIR, jf);
    const text = fs.readFileSync(fullPath, 'utf8');
    const refs = extractMdRefs(text);
    const sessionType = classifySessionType(text);
    const dateStr = jf.replace('.md', '');

    // Deduplicate refs per session
    const uniqueRefs = [...new Set(refs)];

    for (const ref of uniqueRefs) {
      accessCounts[ref] = (accessCounts[ref] || 0) + 1;
    }

    // Build co-access pairs
    for (let i = 0; i < uniqueRefs.length; i++) {
      for (let j = i + 1; j < uniqueRefs.length; j++) {
        const a = uniqueRefs[i] < uniqueRefs[j] ? uniqueRefs[i] : uniqueRefs[j];
        const b = uniqueRefs[i] < uniqueRefs[j] ? uniqueRefs[j] : uniqueRefs[i];
        const key = `${a}|||${b}`;
        if (!edgeMap[key]) {
          edgeMap[key] = { weight: 0, sessionType, sessions: [] };
        }
        edgeMap[key].weight += 1;
        if (!edgeMap[key].sessions.includes(dateStr)) {
          edgeMap[key].sessions.push(dateStr);
        }
        // Use most recent session type (or most common — here we use first)
      }
    }

    sessions.push({ date: dateStr, refs: uniqueRefs, sessionType });
  }

  // Build nodes
  const nodes = Object.entries(accessCounts).map(([id, accessCount]) => {
    const group = classifyGroup(id);
    return { id, group, accessCount, path: id };
  });

  // Build edges — determine direction from upstream tier
  const edges = Object.entries(edgeMap).map(([key, data]) => {
    const [a, b] = key.split('|||');
    const groupA = classifyGroup(a);
    const groupB = classifyGroup(b);
    const tierA = getTierForGroup(groupA);
    const tierB = getTierForGroup(groupB);
    const acA = accessCounts[a] || 0;
    const acB = accessCounts[b] || 0;

    // Source = upstream (higher tier, then higher access count)
    let source, target;
    if (tierA > tierB || (tierA === tierB && acA >= acB)) {
      source = a; target = b;
    } else {
      source = b; target = a;
    }

    return {
      source,
      target,
      weight: data.weight,
      sessionType: data.sessionType,
      sessions: data.sessions
    };
  });

  const output = {
    nodes,
    edges,
    generated: new Date().toISOString(),
    sessionCount: sessions.length
  };

  // Write output
  const outPath = OUTPUT_PATH;
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  process.stdout.write(`Brain map written to: ${outPath}\n`);
  process.stdout.write(`Nodes: ${nodes.length} | Edges: ${edges.length} | Sessions: ${sessions.length}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
```

---

## Usage

```bash
# Default — reads workspace at ~/.openclaw/vault, writes to ./data/brain-map-graph.json
node scripts/build-brain-map.js

# Custom workspace
WORKSPACE_DIR=/path/to/vault node scripts/build-brain-map.js

# Custom output
OUTPUT_PATH=/path/to/output/brain-map-graph.json node scripts/build-brain-map.js
```

---

## Output

Writes `data/brain-map-graph.json`. See `references/graph-schema.md` for the full format spec.

---

## Notes

- The regex extracts `.md` file references from free text — it catches inline mentions, backtick code, parenthetical paths, etc.
- Sessions with very few refs (1 file) produce no edges — that's expected and correct.
- If journal files are missing or sparse, the graph will be small but valid.
- Graph data improves naturally as journaling explicitly names files in summaries.
