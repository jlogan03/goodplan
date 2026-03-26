# Merged Review: Phase 1 — Task Entity & Schema (Iteration 1)

**Scores:** Generalist 9/10 | Software Architecture 8/10 | TypeScript 9/10

## Overall Assessment

Strong implementation. All plan tasks complete, cross-file integration clean (7 exhaustive switches, schema registry, reducer handler record, init handler all updated). Code reuse follows established epic/quest/slice patterns. Types compile cleanly under strict mode. Build/lint/tests pass (1021/1022; pre-existing failure).

---

## CRITICAL Issues

None.

---

## IMPORTANT Issues

### IMP-1: Lazy overview test doesn't exercise the lazy path
**Source:** Generalist
**File:** `tests/unit/state/task.test.ts:118-134`

The test "lazily creates tasks/overview.json for existing projects without it" calls `initProject()`, which now creates `tasks/overview.json` via INIT_PROJECT. The lazy-creation code path in `task-create.ts:33-39` (where `overview === undefined`) is never reached — the test passes trivially. To actually validate the feature, construct a state that has `project.json` but no `tasks/overview.json` (simulating a pre-task-feature project).

**Resolution:** DIRECTLY_ACTIONABLE

---

### IMP-2: CONVERT_TASK duplicates quest/epic entity JSON shapes — extract shared builders
**Source:** Software Architecture
**File:** `src/core/state/transitions/task-lifecycle.ts:133`

`handleConvertTask` duplicates quest.json fields (line 136–143) and epic.json fields (lines 148–159 + subdirectories 163–178) from `quest-create.ts` / `epic-create.ts`. The no-recursive-reduce constraint (INV-003) makes inlining architecturally correct, but the duplicated shapes create a maintenance risk: if `questSchema` or `epicSchema` gains a required field, `handleConvertTask` must be updated in lockstep or will produce invalid entities.

Recommended fix: extract `buildInitialQuestJson(name, goal, ts)` and `buildInitialEpicJson(name, goal, ts)` builder functions into `helpers.ts`, usable by both create handlers and `handleConvertTask`.

**Resolution:** DIRECTLY_ACTIONABLE

---

## MINOR Issues

### MIN-1: `updateTaskOverviewStatus` does not set `completed` timestamp on terminal transitions
**Source:** Software Architecture
**File:** `src/core/state/transitions/helpers.ts:438`

When tasks transition to `dropped` or `converted`, `updateTaskOverviewStatus` updates `status` but leaves `completed` as `null`. Existing patterns (quest, epic, slice) set `completed` on terminal transitions for lifecycle tracking. This prevents `task:list --filter=all` from showing when tasks were resolved.

**Resolution:** DIRECTLY_ACTIONABLE

---

### MIN-2: `addEpicToOverview` silently returns unchanged state if overview is missing
**Source:** Software Architecture
**File:** `src/core/state/transitions/helpers.ts:404`

The helper silently returns `state` when `epics/overview.json` is undefined. `handleCreateEpic` instead returns `STATE_INVALID_TRANSITION` in this case. The `handleConvertTask` guard at lines 103–110 makes the silent fallback unreachable in practice, but future callers could use `addEpicToOverview` without guarding. Either return an error matching the `handleCreateEpic` pattern, or add a doc comment requiring callers to guard overview existence.

**Resolution:** DIRECTLY_ACTIONABLE

---

### MIN-3: `title` field on `overviewItemSchema` missing `.min(1)` constraint
**Source:** TypeScript
**File:** `src/schemas/entities/overview.ts:8`

`title: z.string().optional()` — other string fields in the schema (e.g., `name`, `status`, `epic`) use `.min(1)`. Should be `z.string().min(1).optional()` to reject empty-string titles that pass validation but are meaningless for display.

**Resolution:** DIRECTLY_ACTIONABLE

---

### MIN-4: `addEpicToOverview` and `updateTaskOverviewStatus` accept `status: string` instead of typed enum
**Source:** TypeScript (two findings, merged — pre-existing pattern)
**Files:** `src/core/state/transitions/helpers.ts:406`, `helpers.ts:431`

Both helpers use `status: string`. Using `EpicStatus` / `TaskStatus` respectively would catch typos at compile time. Note: `addQuestToOverview` (line 367) has the same pattern — this is pre-existing, not introduced by this phase. Fix all three together or none.

**Resolution:** DIRECTLY_ACTIONABLE

---

### MIN-5: Schema registry ordering inconsistency
**Source:** Generalist
**File:** `src/core/data/schema-registry.ts:31-32`

`tasks/overview.json` and `tasks/[^/]+/task.json` entries are placed after the "Entity JSON" comment block rather than grouped with other overview patterns under the "Overview JSON" comment (lines 23–25). Functionally correct (first-match wins, patterns are unambiguous) but breaks visual grouping convention.

**Resolution:** DIRECTLY_ACTIONABLE

---

### MIN-6: `as const` assertions on string literals are unnecessary and inconsistent
**Source:** Generalist
**Files:** `src/core/state/transitions/task-create.ts:48`, `task-lifecycle.ts:55,124`

`"open" as const`, `"dropped" as const`, `"converted" as const` are redundant — string literals in typed object literals don't need `as const`. Other handlers (e.g., `epic-create.ts`) omit them. Harmless but inconsistent.

**Resolution:** DIRECTLY_ACTIONABLE

---

### MIN-7: Transition tables doc not updated with task transitions
**Source:** Software Architecture
**File:** `.project/architecture/transition-tables.md:1`

`transition-tables.md` is the declared source of truth for the state machine but has no task section. May be deferred to a later phase.

**Resolution:** DIRECTLY_ACTIONABLE

---

## Contradictions Resolved

**TypeScript reviewer flagged `context` field asymmetry as IMPORTANT** — downgraded to informational note within the same review after analysis confirmed the bridging logic (`context: event.context ?? {}`) is correct and intentional. Not included as an actionable issue.

---

## RESEARCH_NEEDED

None.

---

## Unresolved (USER_INPUT required)

None.
