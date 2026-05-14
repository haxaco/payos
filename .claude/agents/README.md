# Project-Local Claude Code Agents

Project-scoped custom Claude Code subagent definitions, version-controlled with the repo so teammates get the same agents on clone.

## What's here

| Agent | Purpose | Color |
|---|---|---|
| [`epic-implementer.md`](./epic-implementer.md) | Autonomously implements a single Sly platform PRD epic (86–96) end-to-end. Plans by story dependency, branches, commits per story, opens a PR. | cyan |
| [`test-validator.md`](./test-validator.md) | Validates a branch / commit range / PR by running the full Sly test matrix (typecheck, unit, integration, RLS audit). Reports regressions + coverage gaps. Read-mostly — does NOT modify production code. | yellow |
| [`frontend-designer.md`](./frontend-designer.md) | UI + design work in `apps/web/` only (never `payos-ui/`). Next.js App Router + Server Components + Tailwind + shadcn. Can spot-check changes visually via the Claude in Chrome MCP. | purple |

## Companion slash commands

In [`.claude/commands/`](../commands/):

| Command | What it does |
|---|---|
| `/start-epic <NN>` | Resolves Epic NN's spec + stories, then spawns the `epic-implementer` agent in the background to implement it. |
| `/marketplace-status` | Prints one-line status per Epic 86–96: story specs present, active branches, open PRs, Linear-seeded story count. |

## Invocation patterns

The cleanest workflow for "I want to watch multiple agents work in parallel" is to spawn each one as a **background session** so they show up in Claude Code's `agents` view.

### Spawn a single epic as a background session

```bash
# from any terminal in this repo
claude --agent epic-implementer "implement Epic 86 per docs/prd/epics/epic-86-marketplaces-as-entities.md"
```

Once running, press `/bg` inside the session to background it. The session keeps running and appears in the agents view.

> The CLI flag for "start in background directly" may be `--bg` in your Claude Code version — verify with `claude --help`. The `/bg` slash command in-session works reliably either way.

### Open the agents view

In any terminal:

```bash
claude agents
```

Shows every background session you've spawned, with status (working / idle / needs input / completed / failed / stopped), the agent's auto-generated summary line, PR status if it opened one, and timestamps. Keys:

- `Space` — peek at output / send a reply without leaving the table
- `Enter` or `→` — attach to that session full-screen
- `←` — detach (session keeps running)
- `Ctrl+T` — pin/unpin
- `Ctrl+R` — rename
- `Ctrl+X` — stop (press again to delete)
- `Shift+↑/↓` — reorder rows

### Spawn multiple epics in parallel

The marketplaces platform plan has 11 epics. Suggested initial fan-out from `docs/prd/MARKETPLACES_STRATEGY.md`:

1. **Start Epic 86 alone first** — it's the structural foundation; everything else depends on it. Wait for its PR to merge.
2. **Then fan out to Epics 87 + 89 + 92 in parallel** — these don't block each other; 87 and 89 both need 86's `marketplaces` table, 92 is independent.
3. **Then 88 + 90 + 93 + 94 + 96.**
4. **91 last** — depends on most of the others.
5. **95 is discovery-phase** — block on partner pilot conversations, don't queue it as a normal implementation run.

```bash
# After Epic 86 PR merges to main:
claude --agent epic-implementer "implement Epic 87 per docs/prd/epics/epic-87-kym-trust-layer.md"
claude --agent epic-implementer "implement Epic 89 per docs/prd/epics/epic-89-marketplace-discovery-api.md"
claude --agent epic-implementer "implement Epic 92 per docs/prd/epics/epic-92-score-gated-x402-endpoints.md"
# /bg each one as you switch terminals; check `claude agents` to monitor
```

## What the epic-implementer agent does

See [`epic-implementer.md`](./epic-implementer.md) for the full system prompt. Quick summary:

1. Reads the strategy doc + epic file + every story file under `docs/prd/epics/stories/epic-NN/`
2. Builds a dependency DAG from each story's `**Dependencies:**` block
3. Creates a feature branch `epic-NN-<slug>`
4. Implements stories in dependency order, commits per story, runs typecheck + tests after each
5. Verifies the epic's full Definition of Done
6. Opens a PR; reports back with the URL + per-story summary
7. **Never pushes to main, never `--no-verify`, never bypasses hooks.**

## Frontmatter reference

Each agent file uses the schema documented at https://code.claude.com/docs/en/subagents.md. Key fields used by `epic-implementer`:

| Field | Value | Why |
|---|---|---|
| `tools` | Read, Edit, Write, Bash, Grep, Glob, Agent, ToolSearch, TaskCreate, TaskUpdate, TaskList, TaskGet, Monitor | Minimum needed for plan / write / test / commit / monitor / delegate |
| `model` | `opus` | Quality matters more than cost for autonomous spec-driven epic work; switch to `sonnet` later if cost/throughput becomes a constraint |
| `permissionMode` | `acceptEdits` | Auto-approve file edits; Bash still prompts (safety) |
| `maxTurns` | 200 | Plenty of headroom for a multi-story epic |
| `background` | `true` | Spawn as background session by default |
| `isolation` | `worktree` | Per-agent git checkout — clean parallel, no merge collisions while running |
| `memory` | `project` | Learnings persist across runs of this agent in this repo |

## Project-local vs user-wide

These definitions are **project-local** (`.claude/agents/`) so they ship with the repo. Project-local takes precedence over `~/.claude/agents/<same-name>.md` if both exist. Add personal overrides at the user level if needed.

## Don't commit

- `.claude/settings.local.json` (personal overrides, gitignored already)
- Anything containing secrets

## How the three agents compose

Think of them as a small team with one role each:

- **`epic-implementer`** — writes the code. Plans the epic, branches, implements each story, commits, opens the PR.
- **`test-validator`** — verifies the code. Runs the full test matrix on the implementer's branch / PR, identifies regressions + coverage gaps. Does NOT fix anything; reports.
- **`frontend-designer`** — handles the UI half. Most epics are backend; some (86 Console tab, 90 Explorer UI, 91 branded viewers) have significant `apps/web` surface. The implementer can delegate the UI subset to `frontend-designer` via the Agent tool, or you spawn `frontend-designer` directly for design-only tasks.

Typical handoff for a big epic:

1. `/start-epic 90` → `epic-implementer` runs backend + structural work, branches as `epic-90-marketplace-explorer-ui`
2. `epic-implementer` delegates the page/component subset to a `frontend-designer` subagent
3. Once the PR opens, you (or a coordinator) spawn `test-validator` against the PR for an independent review
4. Human reads `test-validator`'s structured report → decides merge / fix / block

## Out of scope (for now)

- A separate `coordinator` agent. The human or any interactive Claude Code session you run today *is* the coordinator. Add a coordinator agent later only if you find yourself running the same hand-off-to-implementer sequence repeatedly.
- A `pr-reviewer` agent (distinct from `test-validator`: reviews diff for code quality / architecture / security rather than running tests). Symmetric complement, easy to add later if `test-validator`'s scope grows uncomfortable.
- Agent teams (`SendMessage` cross-agent comms). Gated behind `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`; skip until the feature is stable.
