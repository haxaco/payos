---
description: Print a one-line status per Epic 86-96. Combines: story specs present, git branches that match an epic naming pattern, open PRs from the epic-implementer agents.
---

Report current status of the marketplaces-platform epics (86-96).

Steps:

1. Confirm the strategy doc + epic files are present:
   - `docs/prd/MARKETPLACES_STRATEGY.md` exists
   - For NN in 86..96: glob `docs/prd/epics/epic-$NN-*.md` and read the first line (the title)

2. For each epic NN in 86..96, gather:
   - **Title** — first H1 from the epic file
   - **Priority + Points** — from the epic file's metadata block
   - **Story count** — `ls docs/prd/epics/stories/epic-$NN/ | wc -l`
   - **Active branch** — `git branch --list "epic-$NN-*"` (matches the epic-implementer's naming convention)
   - **Remote branch** — `git ls-remote --heads origin "epic-$NN-*" | head -1` if any
   - **Open PR** — `gh pr list --search "Epic $NN in:title" --json number,title,url,isDraft,state` to find the PR if opened

3. For each Linear linkage we already know (Epic 86: SLY-538..544, 546, 548, 553; Epic 88: SLY-545, 547, 551, 554; Epic 90: SLY-549, 555; Epic 92: SLY-550; Epic 95: SLY-552), confirm those are listed in the story file frontmatter (don't hit the Linear API — just sanity-check the file).

4. Print a concise status table:

   ```
   Epic  Title                                Stories  Branch              PR                          Linear seeded
   ----  -----                                -------  ------              --                          -------------
    86   Marketplaces as Entities             10       epic-86-…           https://github…/pr/N        10/10
    87   KYM Trust Layer                      12       —                   —                            0/12
    …
   ```

5. Highlight blockers:
   - Any epic where the branch exists but the implementer hasn't reported in (TaskList for stale in-progress agents)
   - Any epic where the strategy says "depends on Epic X" and X isn't merged yet
   - Any Linear issue keys referenced in story files that don't match the known mapping (could indicate stale seed)

6. Suggest the next epic to start, based on dependencies in MARKETPLACES_STRATEGY.md's Suggested Sequencing section. Don't auto-start it — just suggest the next `/start-epic <NN>` command to run.
