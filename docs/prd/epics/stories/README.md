# Epic Stories — Per-File Specs

Each epic file in `docs/prd/epics/epic-NN-*.md` carries the epic-level spec (summary, motivation, scope, DoD, references) and a **Stories Index** table.

The story specs themselves live here, one file per story:

```
docs/prd/epics/stories/
├── epic-86/
│   ├── story-86.1-marketplaces-tables.md
│   ├── story-86.2-x402-marketplace-id-column.md
│   └── …
├── epic-87/
│   └── …
└── …
```

## When to use this layout

The per-file layout is used for **new epics from Epic 86 onward** (the marketplaces platform + identity-first amplifier work). Older epics (Epic 73 and earlier) keep stories inline — those won't be retroactively split.

Inline-per-epic remains valid for small epics (≤5 stories). Per-file is preferred when:

- The epic exceeds ~8 stories
- Stories will be linked individually from Linear / partner conversations / external docs
- Multiple parallel contributors need to grab one story without context-loading the full epic file

## Story file structure

Each story file follows this template:

```markdown
# Story NN.Y: <Imperative Title>

**Status:** Planned | 🚧 In Progress | ✅ Complete
**Epic:** [Epic NN — Title](../../epic-NN-…md)
**Points:** X
**Priority:** P0 | P1 | P2
**Dependencies:** Story NN.Y, …

---

<2–4 sentence narrative describing what + why.>

```code optional```

## Acceptance

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] …

## Technical notes

<Non-obvious decisions, gotchas, integration points, file paths.>

## Dependencies

<Explicit list referencing other story IDs, prior epics, or external systems.>
```

## Linear linkage

When a Linear issue exists for a story, add a `**Linear:** SLY-NNN` line beneath `**Status:**`. Otherwise omit. The Linear issue body should link back to its story spec file in this repo.

## Slug conventions

Filenames: `story-<epic>.<n>-<short-slug>.md`. Slug is a 2–4-word kebab-case summary derived from the story title (no special chars). Aim for ≤50 chars total.
