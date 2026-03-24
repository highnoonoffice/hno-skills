---
name: second-brain-visualizer
version: 0.1.0
description: "Your brain wasn't designed to hold data. It was designed to produce it. Second Brain Visualizer turns your raw thought stream into emergent clusters — and reads what they mean."
homepage: https://github.com/highnoonoffice/hno-skills
source: https://github.com/highnoonoffice/hno-skills/tree/main/second-brain-visualizer
license: MIT-0
metadata: ~
---

# Second Brain Visualizer

Your brain wasn't designed to hold data. It was designed to produce it. We create ideas but we don't have to carry them.

Connect it to wherever you already dump your thoughts — Slack, Telegram, WhatsApp, a private channel you've had open for years. No new habit. No new app. The skill meets you where you are.

The input doesn't have to be clean. Voice to text, half a sentence, a joke you almost forgot, a project name with no context. Your agent reads through the noise. The signal is in there — it just needed someone to look.

That's where the value compounds. One note is a note. Fifty notes are a habit. A year of notes is a portrait. The Second Brain Visualizer clusters your atoms over time and when you click one of those clusters, it doesn't show you a list — it tells you what it found.

A note-taking app stores what you put in. This reads what it means and generates insights.

**Status:** v0.1.0 — working prototype. Not yet published to ClawHub. Core pipeline proven, iterations ahead before public release.

### What It Builds

**Parser** (`references/parser.js`) — reads your second brain markdown ledger, extracts atoms into a structured JSON file.

**Clustering engine** (`references/cluster.js`) — passes the full atom corpus to an LLM with an intent-based clustering prompt. Groups atoms by affinity of intent, not keyword overlap. Outputs emergent clusters with status (ESTABLISHED / FORMING / FADING), confidence scores, time spread, emerging signals, tensions, and notable absences.

**React component** (`references/component.tsx`) — D3 force-directed graph on top. Nodes sized by atom count × time spread. Click any node to expand: base insight, LLM-generated insight in gold, full atom list below. Tensions, emerging signals, and absences below that.

### The Clustering Prompt

The core IP. Intent-based, not keyword-based. Full prompt in `references/cluster.js`.

Key principles:
- Read for intent, not literal content. A joke about LLMs may be a probe into AI agency.
- Group atoms by affinity of intent — two atoms belong together if they reach toward the same underlying question, even if they use completely different language.
- Let the corpus determine cluster count (min 3, max 10). A cluster must earn its existence.
- Name clusters by underlying drive, not domain. Not "Technology." Something like "The Legitimacy Project."
- Track tensions — where the person is arguing with themselves across notes.
- Track absences — what they used to think about and stopped.
- time_spread is the anti-recency-bias mechanic. Wide spread = load-bearing belief. Narrow = situational.

### Atom Schema

Each atom in the ledger:

```
### ts: <unix_timestamp>
- **date:** YYYY-MM-DDTHH:MM:SS UTC
- **raw:** verbatim text (voice to text, misspelled, incomplete — all valid)
- **type:** thought | task | strategy | creative | life | meta | idea-jar | visual | link
- **tags:** freeform, comma-separated
- **signal:** hot | warm | cool
- **actionable:** yes | no
- **nextAction:** optional single-sentence move
```

### Cluster Output Schema

```json
{
  "clusters": [
    {
      "id": "stable-kebab-id",
      "name": "Sharp specific name capturing underlying drive",
      "insight": "One sentence: what does this pattern reveal?",
      "atom_ids": ["sb-1234", "sb-5678"],
      "confidence": 0.87,
      "status": "ESTABLISHED",
      "time_spread": 4
    }
  ],
  "emerging_signals": ["sb-9999"],
  "tensions": [
    {
      "name": "Tension name",
      "atom_ids": ["sb-1", "sb-2"],
      "description": "What the person is working out"
    }
  ],
  "absences": ["Theme that went quiet"]
}
```

### First Run Results (2026-03-24)

85 atoms, 8 clusters, 8 emerging signals, 4 tensions:

| Cluster | Status | Atoms | Spread |
|---|---|---|---|
| The Permanently Awake Librarian | ESTABLISHED | 7 | 2w |
| Language as Load-Bearing Structure | ESTABLISHED | 8 | 3w |
| The Legitimacy Project | ESTABLISHED | 8 | 3w |
| Agent Failure as Intelligence | ESTABLISHED | 7 | 4w |
| Friction as Design Oracle | FORMING | 5 | 4w |
| Craft as Moral Position | ESTABLISHED | 7 | 3w |
| The Protagonist Problem | ESTABLISHED | 7 | 4w |
| Deliberate Presence as Counterculture | FORMING | 6 | 2w |

### Prerequisites

- OpenClaw agent with a vault markdown ledger (second brain atoms in the format above)
- Node.js 18+
- A Next.js dashboard or equivalent React host
- `d3` and `@types/d3` installed
- OpenClaw gateway running locally (for insight generation calls)

### Roadmap

- [ ] Full-graph view with all atoms as sub-nodes per cluster
- [ ] Cluster diff across runs (what emerged, merged, faded)
- [ ] Configurable ingestion sources beyond Slack
- [ ] Cluster history timeline
- [ ] ClawHub publish (targeting v1.0.0 after 5+ iterations)

### License

MIT-0. Copyright (c) 2026 @highnoonoffice. No attribution required.
