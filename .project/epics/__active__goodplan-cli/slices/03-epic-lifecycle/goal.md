# Epic Lifecycle

## What We're Building
Full epic entity lifecycle: create, list, show, activate, abandon, and all intermediate phase transitions (explore, define-architecture, refine-architecture, define-slices, refine-slices). This is the first complete entity lifecycle through the stack — epic:create creates the epic directory structure (with architecture/, research/, brainstorm/ subdirectories), epic:activate enforces guards (one active epic, verification criteria), and the full explore→architecture→slicing phase chain works.

## Behavior
1. `goodplan epic:create --name my-epic --goal "Build X"` creates epic.json, adds to epics/overview.json, creates the epic directory tree (architecture/, research/, brainstorm/, prototypes/).
2. `goodplan epic:list --json` returns overview.json items.
3. `goodplan epic:show --epic my-epic --json` returns full epic.json content.
4. `goodplan epic:explore --epic my-epic` transitions to exploring status.
5. Phase transitions: explore → define-architecture → refine-architecture → define-slices → refine-slices → ready for activation. Each transition validates the previous phase is complete.
6. `goodplan epic:activate --epic my-epic` sets project.json activeEpic, validates verification criteria exist and no other epic is active.
7. `goodplan epic:abandon --epic my-epic --reason "Changed direction"` transitions to abandoned from any non-terminal state.
8. All transitions append to activity-log.jsonl.
9. Guards: one active epic (STATE_EPIC_ALREADY_ACTIVE), verification criteria required for activation (STATE_MISSING_VERIFICATIONS), epic:add-verification and epic:update-verification commands.

## Success Criteria
- [ ] `goodplan epic:create --name my-epic --goal "Test" --json` — creates .project/epics/my-epic/ with epic.json + subdirectories, updates epics/overview.json
- [ ] `goodplan epic:list --json` — returns items array with the created epic
- [ ] `goodplan epic:show --epic my-epic --json` — returns full epic entity
- [ ] `goodplan epic:explore --epic my-epic` — status transitions to `exploring`
- [ ] Full phase chain: explore → architecture → refine-architecture → slicing → refine-slices, each command advancing status
- [ ] `goodplan epic:activate --epic my-epic` without verification criteria — exit 3, STATE_MISSING_VERIFICATIONS
- [ ] `goodplan epic:add-verification --epic my-epic` (with stdin JSON) — adds verification entry
- [ ] `goodplan epic:activate --epic my-epic` with criteria — sets activeEpic in project.json
- [ ] Create second epic, attempt activate — exit 3, STATE_EPIC_ALREADY_ACTIVE
- [ ] `goodplan epic:abandon --epic my-epic --reason "test"` — status transitions to abandoned
- [ ] Activity log has entries for every transition — verify with `cat .project/activity-log.jsonl | wc -l`
- [ ] Binary: `bun run build && ./goodplan epic:create --name bin-test --goal "test" --json` — works in compiled binary

## Verification
1. Initialize project: `goodplan init --name test-project`.
2. Create epic: `goodplan epic:create --name my-epic --goal "Build a thing"`.
3. Walk through phase chain: explore, architecture, refine-architecture (with scores via stdin), slicing, refine-slices.
4. Add verification criteria, then activate.
5. Attempt second epic activation — verify guard rejects it.
6. List and show epics — verify correct output.
7. Abandon — verify terminal state.
8. Compile and repeat key commands against binary.

## Scope Boundaries
**In scope:** Epic entity transitions (all statuses in EpicStatus enum from transition-tables.md), epic CRUD commands, epic phase commands (explore, define-architecture, refine-architecture, define-slices, refine-slices), activation guards, verification management (add/update), abandon. All epic-related state machine transition rows. RPC routing for epic commands. list/show commands (read-only, bypass RPC → data layer direct).
**Out of scope:** Slice lifecycle (slice 04), quest lifecycle (slice 05), context bundling/start-*/submit-* (slice 05), decisions and learnings rollup (slice 06). Skip paths for explore and architecture (if architecture specifies them) are in scope.
