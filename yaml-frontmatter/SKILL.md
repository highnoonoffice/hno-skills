---
title: "YAML Front Matter Skill"
created: 2026-02-20
modified: 2026-02-20
tags: [skill, yaml, frontmatter, memory, vault]
status: active
---

# SKILL: YAML Front Matter Management

## Purpose
Ensure every Markdown file in the vault is created, updated, and read with valid, consistent YAML front matter. Front matter is the "book spine" — readable at a glance without opening the file.

## Rules

### 1. Creating New Files
Always open with valid YAML front matter:
```yaml
---
title: "Note Title"
created: YYYY-MM-DD
modified: YYYY-MM-DD
tags: []
status: draft
---
```
Merge any user-provided keys (title, priority, due, etc.) into this block.

### 2. Updating Existing Files
- **Preserve** all existing keys unless explicitly instructed otherwise.
- **Merge** new keys — add if missing, update if present.
- **Never** remove, reformat, or delete unmentioned keys.
- **Always** keep the YAML block at the top.
- If a merge could cause conflict, show proposed YAML before writing and ask for confirmation.

### 3. Reading / Searching
- Parse front matter for context: use `status`, `tags`, `due`, `priority` to filter and prioritize.
- Report specific values when asked: e.g., "What is the status and due date in [[Project X]]?"
- Support queries like: "Find all .md files where status: urgent and tags includes 'client'."

## Formatting Standards
| Key type | Format |
|---|---|
| Dates | `YYYY-MM-DD` |
| Lists/tags | `[item1, item2]` or `- item` block style |
| Simple strings | Unquoted unless special chars present |
| Complex strings | Quoted |
| Key names | Exact match to user's wording (e.g., `tags` not `tag`) |

## Default Keys
Unless otherwise specified, include on creation:
- `created` — ISO date of creation
- `modified` — ISO date of last edit (update on every write)
- `tags` — empty array by default
- `status` — `draft` by default

## Proactive Key Suggestions
- If a file looks like a task → suggest `status: todo` (with approval before writing)
- If a file looks like a decision → suggest `decision_date` and `outcome`
- If a file looks like a lesson → suggest `source` and `applies_to`

## Scope
Apply to all `.md` files in:
- Workspace root (`~/openclaw/workspace/`)
- `memory/` folder
- `skills/` folder
- Any vault path Joseph specifies

## Notes
- `modified` must be updated on every write operation.
- Never infer or fabricate front matter values — use what's known or leave as placeholder.
- This skill is always active. No trigger phrase required.
