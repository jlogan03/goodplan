# Goal: Rename /complete-slice to /complete

## What

Rename the `/complete-slice` skill to `/complete` and extend it to handle completing slices, side quests, and initiatives. Scope is inferred from context.

## Why

The skill currently only handles slices and side quests. With the introduction of initiatives, it needs to handle initiative completion as well — including learnings rollup, research/brainstorm/prototype promotion to project-level directories, and renaming from `__active__` to `~~archived~~`.

The name `/complete-slice` is misleading since it already handles side quests, and will now handle initiatives too.

## Key Design Decisions

### Top-Level Architecture Updates

`/complete` already proposes architecture updates during slice/quest completion. With the two-layer architecture model (see initiatives-infrastructure goal), it now also writes approved updates to the top-level `.project/architecture/` so that top-level always reflects current reality. This is an extension of existing behavior, not a new step.

### Archive Numbering

When archiving (renaming to `~~archived~~`), include an incrementing completion-order number: `~~archived~~01_<name>`, `~~archived~~02_<name>`, etc. Count existing `~~archived~~` directories in the same container to determine the next number. Applies to initiatives; side quests optionally get the same treatment.

### Initiative Completion

When completing an initiative, reconcile the initiative's target architecture against the top-level (current) architecture. Any gaps between what the initiative planned and what was actually built should be surfaced — these are either incomplete work or intentional scope reductions to document.

## Success Criteria

1. Skill directory renamed from `complete-slice/` to `complete/` under `~/.claude/skills/`
2. All internal references updated (SKILL.md, references, etc.)
3. Skill handles three scope types: vertical slice, side quest, initiative
4. Slice and side quest completion updates top-level `.project/architecture/` when architecture changes are approved
5. Initiative completion includes:
   - Learnings rollup from all initiative slices to initiative-level and top-level `learnings.md`
   - Review of initiative's `research/`, `brainstorm/`, `prototypes/` — prompt user to promote broadly useful artifacts to project-level directories
   - Reconcile initiative target architecture against top-level current architecture — surface gaps
   - Rename initiative directory from `__active__<name>/` to `~~archived~~NN_<name>/` with incrementing number
6. Archive numbering: `~~archived~~NN_<name>` format with completion-order numbering
7. Existing slice/quest completion behavior unchanged (apart from top-level architecture writes)
8. All other skills that reference `/complete-slice` updated to reference `/complete`

## Dependencies

- Quest: archived-prefix-migration (must be done first — establishes `~~archived~~` convention)
- Quest: initiatives-infrastructure (initiative directory structure must exist)

## Out of Scope

- Maturity promotion suggestions (handled by maturity-context-loading quest)
- Fitness function checks (handled by maturity-context-loading quest)
