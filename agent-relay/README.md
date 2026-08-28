# agent-relay

Shared handoff drop zone for Magnus → Anders/Cody workflows.

Magnus pushes [AGENT_HANDOFF] files here instead of inlining them in Telegram.
Agents pull from handoffs/ at session start when a handoff is waiting.

File naming: handoff-YYYY-MM-DD-<task-slug>.md
