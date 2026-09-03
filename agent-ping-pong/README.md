# Agent Ping Pong

**A protocol for handing work between two agents through a human clipboard.**

One agent holds the judgment role: it turns intent into a spec, reviews the result, and decides what needs another pass. The other holds the build role: it edits files, runs checks, and opens the pull request. You relay one structured block at a time between them. No direct agent-to-agent connection is required.

OpenClaw paired with [Codex Desktop](https://openai.com/codex) or Claude Code is the proven reference implementation. It is not the definition of the protocol.

The result: real code moves from conversation to a reviewed GitHub pull request, while you keep control of every handoff and merge.

---

## How It Works

```
YOU → JUDGMENT AGENT:  describe what you want to build
JUDGMENT AGENT → YOU:  spec block — copy this
YOU → BUILD AGENT:     paste the spec
BUILD AGENT → YOU:     PR opened — copy this
YOU → JUDGMENT AGENT:  paste the build report
JUDGMENT AGENT → YOU:  code review block — copy this
YOU → BUILD AGENT:     paste the review
BUILD AGENT → YOU:     fixes applied — copy this
YOU → JUDGMENT AGENT:  paste the update
JUDGMENT AGENT → YOU:  LGTM. Merge approved.
YOU → BUILD AGENT:     Merge.
```

The agents write to each other. You are the relay, not the translator.

---

## Reference Implementation

The workflow was proven with [OpenClaw](https://openclaw.ai) in the judgment-agent role and Codex or Claude Code in the build-agent role. The full guide keeps that pairing concrete in its Quick Start so you can follow a tested example end to end.

## Works With Any Agent Pair

Agent Ping Pong depends on roles and a shared handoff format, not particular products. Examples include:

- **Judgment-agent role:** OpenClaw, Hermes Agent, or Grok CLI (the Grok Build CLI)
- **Build-agent role:** Codex; Claude Code; Grok Build (whose model aliases include `grok-code-fast-1`); Qwen Code with Qwen3-Coder; a compatible coding harness powered by DeepSeek; or Kimi Code CLI

Choose tools that can reliably produce and consume the handoff block, inspect the relevant repository state, and respect the approval gates. Capability and setup vary by tool.

---

## What You Need

- One judgment agent for specification and review
- One build agent with access to a sandbox repository
- A GitHub account
- A human-controlled clipboard and final merge decision
- Optional: a Vercel account when you're ready to deploy

---

## Get Started

Read [SKILL.md](./SKILL.md) for the complete reference setup, workflow loop, handoff schema, review format, trust arc, and execution gates.

---

MIT licensed. Built by [@highnoonoffice](https://github.com/highnoonoffice).
