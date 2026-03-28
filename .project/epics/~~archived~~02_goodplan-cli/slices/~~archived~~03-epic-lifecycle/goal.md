# Epic Lifecycle

## What We're Building
Full epic entity lifecycle: create, list, show, activate, complete, abandon, and all intermediate phase transitions (explore, define-architecture, refine-architecture, define-slices, refine-slices). Also includes the minimal submit-plan, submit-refinement, and submit-implementation commands — thin wrappers that verify file presence in the state tree and trigger the corresponding state event. These are needed by slices 03-04 verification and are simple enough to include here. This slice also adds the cache layer (`loadState` with `.state-cache.json`) and concurrent modification detection in `commitState`, deferred from slice 02 to manage scope.

Note: This is the most complex entity lifecycle (~20 transition rows). Epic has 12+ statuses including the explore→architecture→slicing phase chain. This complexity is accepted because epic is the first full entity lifecycle and proves the transition pattern for all subsequent entities. `submit-refine-slices` is also included in this slice (alongside submit-plan/submit-refinement/submit-implementation) because `epic:activate` requires `slices-refined` status, which is only reachable via COMPLETE_REFINE_SLICES — making it necessary for slice 03's own activation guard tests.

## Behavior
1. `echo '{"name":"my-epic","goal":"Build X"}' | goodplan epic:create` creates epic.json, adds to epics/overview.json, creates the epic directory tree (architecture/, research/, brainstorm/, prototypes/). Entity creation uses stdin JSON per commands-api.md.
2. `goodplan epic:list --json` returns overview.json items.
3. `goodplan epic:show --epic my-epic --json` returns full epic.json content.
4. `goodplan epic:explore --epic my-epic` transitions to exploring status.
5. Phase transitions: explore → define-architecture → refine-architecture → define-slices → refine-slices → ready for activation. Each transition validates the previous phase is complete.
6. `goodplan epic:activate --epic my-epic` sets project.json activeEpic, validates verification criteria exist and no other epic is active.
7. `goodplan epic:abandon --epic my-epic --reason "Changed direction"` transitions to abandoned from any non-terminal state.
8. All transitions append to activity-log.jsonl.
9. Guards: one active epic (STATE_EPIC_ALREADY_ACTIVE), verification criteria required for activation (STATE_MISSING_VERIFICATIONS), epic:add-verification and epic:update-verification commands.
9a. `echo '{"verificationResults":[{"index":0,"passed":true,"notes":"All slices complete"}]}' | goodplan epic:complete --epic my-epic` transitions active epic to completed status. Guard: all verificationResults in stdin payload have `passed: true` (STATE_VERIFICATION_FAILED if any passed: false).
10. `goodplan submit-plan --slice <name>` verifies plan.md exists in state tree (hasChild check), triggers COMPLETE_PLAN. Thin wrapper — no context bundling.
11. `goodplan submit-refinement --slice <name>` (with scores stdin JSON) triggers COMPLETE_REFINEMENT_ROUND. Also supports `--quest`.
11a. `goodplan submit-refine-slices --epic <name>` triggers COMPLETE_REFINE_SLICES, advancing epic to `slices-refined`. Needed to reach `slices-refined` state required by `epic:activate`.
12. `goodplan submit-implementation --slice <name>` triggers COMPLETE_IMPLEMENTATION. Also supports `--quest`.
13. `loadState()` caches assembled state in `.state-cache.json`; subsequent calls read from cache.
14. `commitState()` detects concurrent modification — if files changed between assembleState and commitState, returns DATA_CONCURRENT_MODIFICATION error.

## Success Criteria
- [ ] `echo '{"name":"my-epic","goal":"Test"}' | goodplan epic:create --json` — creates .project/epics/my-epic/ with epic.json + subdirectories, updates epics/overview.json
- [ ] `goodplan epic:list --json` — returns items array with the created epic
- [ ] `goodplan epic:show --epic my-epic --json` — returns full epic entity
- [ ] `goodplan epic:explore --epic my-epic` — status transitions to `exploring`
- [ ] CLI phase chain: `epic:explore`, `epic:define-architecture`, `epic:refine-architecture`, `epic:define-slices`, `epic:refine-slices` — each BEGIN_* command advances status to the corresponding *ing state
- [ ] Unit test phase chain: COMPLETE_* skip paths exercised via `reduce()` directly (not CLI-testable until slice 05 provides submit-* commands)
- [ ] `goodplan epic:activate --epic my-epic` without verification criteria — exit 3, STATE_MISSING_VERIFICATIONS
- [ ] `goodplan epic:add-verification --epic my-epic` (with stdin JSON) — adds verification entry
- [ ] `goodplan epic:activate --epic my-epic` with criteria — sets activeEpic in project.json
- [ ] Create second epic, attempt activate — exit 3, STATE_EPIC_ALREADY_ACTIVE
- [ ] `goodplan epic:abandon --epic my-epic --reason "test"` — status transitions to abandoned
- [ ] Activity log has entries for every transition — verify with `cat .project/activity-log.jsonl | wc -l`
- [ ] (unit test) Skip path: trigger COMPLETE_EXPLORE event on a `created` epic via `reduce()` — status transitions directly to `explored`, skipping the exploring phase
- [ ] (unit test) COMPLETE_SLICING: exercised via `reduce()` with fixture state pre-populated with slice entries (slice entities don't exist until slice 04, so CLI-level verification of real `sliceCount` requires slice 04)
- [ ] `goodplan submit-plan --slice 01-auth --json` after manually writing plan.md — triggers COMPLETE_PLAN, slice transitions to plan-created
- [ ] `goodplan submit-implementation --slice 01-auth --json` — triggers COMPLETE_IMPLEMENTATION
- [ ] `echo '{}' | goodplan submit-refine-slices --epic my-epic --json` after `epic:refine-slices` — triggers COMPLETE_REFINE_SLICES, epic transitions to `slices-refined`
- [ ] `.state-cache.json` created after first `loadState()`; second call reads from cache
- [ ] Delete `.state-cache.json`, run status — falls back to full `assembleState()`
- [ ] (unit test) Concurrent modification: externally modify a file between assembleState and commitState — returns DATA_CONCURRENT_MODIFICATION (timing-sensitive; CLI-level integration check deferred to slice 08 fitness functions)
- [ ] `echo '{"verificationResults":[{"index":0,"passed":true,"notes":"All slices complete"}]}' | goodplan epic:complete --epic my-epic --json` — transitions active epic to `completed` status, clears activeEpic in project.json
- [ ] Binary: `bun run build && echo '{"name":"bin-test","goal":"test"}' | ./goodplan epic:create --json` — works in compiled binary

## Verification
1. Initialize project: `goodplan init --name test-project`.
2. Create epic: `echo '{"name":"my-epic","goal":"Build a thing"}' | goodplan epic:create`.
3. Walk through phase chain in two tracks:
   **(a) CLI track** — run these commands and verify status advances to the *ing state:
   - `goodplan epic:explore --epic my-epic` → status: `exploring`
   - `goodplan epic:define-architecture --epic my-epic` → status: `defining-architecture`
   - `goodplan epic:refine-architecture --epic my-epic` → status: `refining-architecture`
   - `goodplan epic:define-slices --epic my-epic` → status: `defining-slices`
   - `goodplan epic:refine-slices --epic my-epic` → status: `refining-slices`
   (Note: `epic:refine-slices` triggers `BEGIN_REFINE_SLICES → refining-slices` — this is a CLI command listed in "In scope" alongside the other phase commands.)
   Then advance to `slices-refined` via: `echo '{}' | goodplan submit-refine-slices --epic my-epic --json` → status: `slices-refined`
   **(b) Unit test track** — COMPLETE_* skip paths exercised via `reduce()` directly (not CLI-testable via full phase chain). These unit tests cover all skip paths — see Success Criteria for the full list:
   - `reduce(epicWithStatus("created"), { type: "COMPLETE_EXPLORE" })` → `explored`
   - `reduce(epicWithStatus("explored"), { type: "COMPLETE_ARCHITECTURE" })` → `architecture-defined`
   - `reduce(epicWithStatus("architecture-defined"), { type: "COMPLETE_REFINE_ARCHITECTURE" })` → `architecture-refined`
   - `reduce(epicWithStatus("architecture-refined"), { type: "COMPLETE_SLICING" })` → `slices-defined` (use fixture state with pre-populated slice entries for `sliceCount`)
   - `reduce(epicWithStatus("slices-defined"), { type: "COMPLETE_REFINE_SLICES" })` → `slices-refined`
4. Add verification criteria, then activate: `goodplan epic:add-verification --epic my-epic` (with stdin JSON), then `goodplan epic:activate --epic my-epic` — requires `slices-refined` status from step 3a.
5. Attempt second epic activation — verify guard rejects it (STATE_EPIC_ALREADY_ACTIVE).
6. List and show epics — verify correct output.
7. Abandon — verify terminal state.
8a. Complete epic: `echo '{"verificationResults":[{"index":0,"passed":true,"notes":"All slices complete"}]}' | goodplan epic:complete --epic my-epic --json` — verify status transitions to `completed`.
8b. (Unit test) Concurrent modification: call `reduce()` or data layer directly with simulated external file change — verify DATA_CONCURRENT_MODIFICATION error.
9. Test submit-plan: create a slice, begin planning, manually write plan.md, `submit-plan --slice <name>` — verify transition.
10. Compile and repeat key commands against binary.

## Scope Boundaries
**In scope:** Epic entity transitions (all statuses in EpicStatus enum from transition-tables.md), epic CRUD commands, epic phase commands (explore, define-architecture, refine-architecture, define-slices, refine-slices), `epic:complete` command (COMPLETE_EPIC transition), activation guards, verification management (add/update), abandon. All epic-related state machine transition rows (including COMPLETE_EXPLORE, COMPLETE_ARCHITECTURE, etc. in the reducer — these are exercised via unit tests and skip paths in this slice). RPC routing for epic commands. list/show commands (read-only, bypass RPC → data layer direct). Skip paths for explore and architecture are in scope. Minimal submit-plan, submit-refinement, submit-implementation, and submit-refine-slices CLI commands (thin wrappers: verify file in state tree, trigger state event). `submit-refine-slices` is included here (rather than slice 05) because `epic:activate` requires `slices-refined` status, which is only reachable via COMPLETE_REFINE_SLICES. `loadState()` with `.state-cache.json` cache. Concurrent modification detection in `commitState()`. Transition tables are exported from their respective state machine modules (e.g., `export const epicTransitions: Transition[]`) to enable fitness function enumeration in slice 08.
**Out of scope:** Slice lifecycle (slice 04), quest lifecycle (slice 05), context bundling/start-* commands (slice 05), submit-explore/submit-architecture/submit-slices/submit-refine-architecture CLI commands (slice 05 — though the state machine handlers for their events are implemented here), decisions and learnings rollup (slice 06).
