# Merged Feedback — Round 2

Reviewers: software-architecture (8/10), tracer-bullet (9/10), architecture-alignment (7/10), risk-dependency (8/10)
Consensus score: **8/10** — round-1 criticals are resolved; 6 issues remain (0 critical, 6 important, 10 minor → deduplicated below to 6 important, 7 minor).

---

## Important Issues

**[IMPORTANT-1] Slice 04: Skill file list contains phantom paths and omits real files** *(architecture-alignment — unique)*

The listed skill files (`skills/iteration-loop/SKILL.md`, `skills/onboard-repo/SKILL.md`, `skills/shared/references/cli-interaction.md`, `skills/shared/references/context-api.md`) do not exist. Correct prefix is `skills/_shared/`, and `iteration-loop`/`onboard-repo` directories don't exist. Files confirmed to have `slices/` references that ARE in the repo but NOT in the list:
- `skills/create-slices/SKILL.md` and `skills/create-slices/references/guidance.md`
- `skills/project-status/SKILL.md` and `skills/project-status/references/status-logic.md`
- `skills/_shared/references/epic-conventions.md`
- `skills/_shared/references/state-and-activity-formats.md`
- `skills/complete/references/guidance.md`
- `skills/explore/references/explore-logic.md`

Fix: Grep `skills/` for `slices/` to produce the correct file list. Replace phantom paths. Re-count to validate the "11 files" claim.

---

**[IMPORTANT-2] Slice 03: Two stale `priorities.ts` path literals not covered by Behavior** *(architecture-alignment — unique)*

Slice 03 Behavior covers `entityDir()`, `resolveScope()`, and `learnings.ts`, but two additional stale paths in `priorities.ts` are missed:
1. `"slices/overview.json"` (line 66, `completeSources`) — after restructuring this file doesn't exist; context bundling for `complete` phase loads a nonexistent file.
2. `"slices"` (line 110, `refineSlicesSources`) — slice definitions now live at `epics/<epic>/slices/`, not `slices/`; this is a silent context degradation in `refine-slices` workflow.

Fix: Add Behavior items for both. `completeSources` path → navigate `epics/overview.json` `items[].slices[]`. `refineSlicesSources` directory → `epics/${target.epic}/slices`. Add grep verification steps.

---

**[IMPORTANT-3] Slice 01: `DeferredItem.targetEpic` optional field creates routing ambiguity** *(software-architecture — unique)*

`DeferredItem.targetEpic?: string` is optional, but `slice-complete.ts` deferred routing calls `getSlice(tree, item.targetSlice)` and `setSliceJson(tree, item.targetSlice, ...)` which after restructuring require an `epic` parameter. If `targetEpic` is `undefined`, routing has no epic to resolve the slice path.

Fix (choose one): (a) Make `targetEpic` required — all new deferred items always have epic context, and handle migration of existing items in slice 05. (b) Add a Behavior item specifying the `undefined` fallback — e.g., fall back to the completing slice's own epic, or skip with activity log warning.

---

**[IMPORTANT-4] Slice 01: `slice-complete.ts` path references not covered by any Behavior item** *(software-architecture — unique)*

Behavior item 14 covers `slice-submit.ts` (5 flat path references) but `slice-complete.ts` — the most complex handler — is not mentioned. It has ~10 flat `slices/` references: activity log scope strings (lines 59, 149), deferred routing (line 64), learnings source/read/write (lines 73, 82–83), and architecture-deltas read/write (lines 125–126).

Fix: Add Behavior item: "`slice-complete.ts` path references updated for nested layout: learnings.jsonl, architecture-deltas.jsonl, deferred routing, and activity log scope strings all use `epics/${epic}/slices/${name}` format."

---

**[IMPORTANT-5] Slice 05: `copyMigrationArtifacts()` change site not named in Behavior** *(risk-dependency — unique)*

`copyMigrationArtifacts()` in `src/core/rpc/migrate.ts` (line 527) uses `path.join(projectDir, "slices", slice.name)` as destination. Slice 05 describes `buildMigrationState()` changes but is ambiguous about `copyMigrationArtifacts()`. If missed, markdown artifacts land in the old flat path while JSON state lands in nested paths — inconsistent layout that passes `goodplan status --json` but breaks tools reading artifact paths.

Fix: Explicitly name `copyMigrationArtifacts()` as a change site in slice 05 Behavior alongside `buildMigrationState()`.

---

**[IMPORTANT-6] Slice 04: No runtime smoke test for skill path correctness** *(tracer-bullet — unique)*

Grep checks confirm `epics/<epic>/slices/` strings are present and `.project/slices/` strings are absent, but cannot catch semantic errors (e.g., unresolved variables, mismatched CLI output format). Skills are content files so this is lower severity than compiled code, but a single smoke test would close the gap.

Fix: After `bun run install:skills`, run `goodplan status --json` in a project with an active epic+slice and confirm the JSON output contains nested slice paths matching what skills expect.

---

## Minor Issues

**[MINOR-1] Slice 01: Missing verification grep for `slice-complete.ts` flat references** *(software-architecture)*

Verification items grep for `slices/overview.json` in state/data dirs but not for flat `slices/` literals in transition handlers. `slice-complete.ts` has the most complex paths.

Fix: Add verification: `grep -r '"slices/' src/core/state/transitions/` — zero matches.

---

**[MINOR-2] Slice 05: `DeferredItem` migration for existing data not addressed** *(software-architecture)*

If `targetEpic` is added (required or optional) to `DeferredItem`, existing `slice.json` files with `deferred` arrays will lack the field. Likely zero active deferred items in current repo, but migration should handle it defensively.

Fix: Add note to slice 05 that migration code populates `targetEpic` on existing `DeferredItem` entries, defaulting to the slice's own `epic` field.

---

**[MINOR-3] Slice 02: `buildSliceCompleteResult` structural change more complex than described** *(software-architecture)*

Slice 02 Behavior item 4 covers the signature change and reading `epics/overview.json`, but the sibling-walking loop (lines 204–209) must navigate a two-level structure (`items[].slices[]`) rather than filtering a flat list. Described as "1 structural change" but the navigation logic is non-trivial.

Fix: Clarify that the structural change involves navigating the embedded `items[].slices[]` array rather than filtering flat overview items by `epic` field.

---

**[MINOR-4] Slice 01: `slice-create.ts` `hasChild` guard change not called out** *(architecture-alignment)*

`slice-create.ts` uses `hasChild(state, "slices", event.name)` for uniqueness guard. After restructuring this must become `hasChild(state, \`epics/${event.epic}/slices\`, event.name)`. Not mentioned in Behavior or Verification. Existing grep for `slices/overview.json` won't catch it.

Fix: Add Behavior note for guard change. Add verification: `grep -r '"slices"' src/core/state/transitions/` — no matches for flat `slices` as child lookup target.

---

**[MINOR-5] Slice 01: `reduce()` assertion wording is ambiguous** *(tracer-bullet)*

Verification says "run a test case and inspect output" — runnable and falsifiable, but "inspect" is ambiguous (grep output vs. explicit assertion vs. visual check).

Fix: Rephrase to: "Add an assertion in a `reduce()` test case that the output state tree contains a key matching `epics/*/slices/*/slice.json` and does NOT contain `slices/*/slice.json` at top level."

---

**[MINOR-6] Slice 03: Integration test step doesn't clarify which tests exercise context bundling** *(tracer-bullet)*

`bun test tests/integration/` passes but may not exercise context bundling with nested paths if `workflow-slice.test.ts` is updated in slice 05.

Fix: Add note: "If `tests/integration/workflow-slice.test.ts` doesn't yet exercise nested context paths (updated in slice 05), the grep check and unit tests are the primary verification. Full context integration is validated in slice 05."

---

**[MINOR-7] Slice 05: `sliceSequence` removal not owned by any slice** *(risk-dependency)*

`migrate.ts` line 241 sets `sliceSequence` in epic JSON, and `epicDetailResponseSchema` (schemas.ts line 75) has `sliceSequence`. Slice 01 removes it from `epicSchema`, but neither slice 01 nor slice 05 explicitly owns updating `epicDetailResponseSchema` or removing `sliceSequence` from `buildMigrationState()` epic construction. Migration will produce epic.json files that fail new schema validation on round-trip (INV-005).

Fix: Assign `epicDetailResponseSchema` + `buildMigrationState()` `sliceSequence` removal to slice 05 scope.

---

## Cross-Reviewer Notes

- `sequencing-refining.md` [slice 01 description]: omits guard path changes (`hasChild` calls) — minor doc gap, goal file is authoritative. *(architecture-alignment)*

---

## Round-1 Confirmation

All round-1 issues confirmed resolved across all four reviewers:
- Schema registry scoped to slice 01 ✓
- Slice 02 schema registry ownership clear ✓
- Slices 03 and 04 dependencies loosened to slice 01 only ✓
- `buildInitialEpicJson` in scope ✓
- `entityDir()` in context layer ✓
- `addSliceToOverview` helper and `buildCompleteEvent` epic propagation ✓
- Slice 05 rollback procedure with `.project-old/` backup and diff verification ✓
- Activity log scope strings explicit in slice 01 ✓
- Parallel dependency structure enabling concurrent 02/03/04 execution ✓

---

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| Important | 6 |
| Minor | 7 |

**Top priority fixes before implementation:**
1. IMPORTANT-1: Correct the slice 04 skill file list (phantom paths → real paths via grep)
2. IMPORTANT-2: Add missing `priorities.ts` path items to slice 03 Behavior
3. IMPORTANT-3: Resolve `DeferredItem.targetEpic` optionality (make required or specify fallback)
4. IMPORTANT-4: Add `slice-complete.ts` Behavior item to slice 01
5. IMPORTANT-5: Name `copyMigrationArtifacts()` explicitly in slice 05 Behavior
6. IMPORTANT-6: Add runtime smoke test to slice 04 verification
