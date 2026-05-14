---
description: Spawn the epic-implementer agent as a background session for a given marketplaces-platform epic (86-96). Reads the epic spec + story files, plans by dependency, branches, implements story by story, runs tests, opens a PR.
argument-hint: <epic-number>
---

Spawn the `epic-implementer` agent as a background session to implement Epic **$ARGUMENTS** of the marketplaces platform plan.

Steps:

1. Resolve the epic file for Epic **$ARGUMENTS**:
   - Glob: `docs/prd/epics/epic-$ARGUMENTS-*.md`
   - There should be exactly one match (e.g. `epic-86-marketplaces-as-entities.md`)
   - If zero or multiple, stop and tell me which epic IDs do exist

2. Verify the epic's stories directory is populated:
   - `docs/prd/epics/stories/epic-$ARGUMENTS/` should exist with one `story-$ARGUMENTS.Y-*.md` per story listed in the epic's Stories index
   - If missing, stop — the per-story specs need to be in place before the agent can plan

3. Print a summary:
   - Epic title (first line of the epic file)
   - Story count
   - Priority + total points (from the frontmatter / Stories index)
   - Any cross-epic dependencies the strategy doc flags (e.g. Epic 87 needs 86 merged first)

4. Spawn the implementer.
   - Invoke the `epic-implementer` subagent via the Agent tool with:
     - `description`: `Implement Epic $ARGUMENTS`
     - `subagent_type`: `epic-implementer`
     - `run_in_background`: `true`
     - `prompt`: `Implement Epic $ARGUMENTS per its spec at docs/prd/epics/epic-$ARGUMENTS-<slug>.md. Read MARKETPLACES_STRATEGY.md first, then the epic spec, then every story file under docs/prd/epics/stories/epic-$ARGUMENTS/. Plan by dependency order, branch as epic-$ARGUMENTS-<slug>, implement story by story with typecheck+tests after each, open a PR when the epic's Definition of Done is green. Report back via TaskUpdate.`
   - Report the agent ID back so I can monitor or message it.

5. Remind me how to monitor:
   - Open the agents view in another terminal: `claude agents`
   - Or attach to the background session there with `Enter`
   - Cancel with `Ctrl+X` if the agent goes off-rails
