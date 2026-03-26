# Merged Review Feedback — Round 1

Reviewers: software-architecture (6/10), architecture-alignment (7/10), tracer-bullet (6/10), risk-dependency (7/10)

## CRITICAL

### C1. Schema registry must move to slice 01 — silent data loss risk
Sources: software-architecture, risk-dependency

Slice 01 introduces `epicOverviewSchema` with a `slices` array, but the schema registry (`src/core/data/schema-registry.ts`) still maps `epics/overview.json` to `overviewSchema` (no `slices` field). Every `getJson` round-trip silently strips the `slices` array via Zod parsing. The affected-apis.md research explicitly warns about this. Slice 01's scope says "Out of scope: RPC layer" but the schema registry is Data Layer, not RPC — the scope boundary is misclassified.

**Fix**: Move schema registry pattern updates into slice 01's scope. At minimum: change `epics/overview.json` mapping to `epicOverviewSchema`, add nested slice path patterns, remove old flat patterns. Update slice 02 to clarify it *consumes* (not creates) the registry entry.

### C2. `updateOverviewStatus` and `addEpicToOverview` missing from slice 01 scope
Source: software-architecture

After slice 01 changes the schema to `epicOverviewSchema`, every call to `updateOverviewStatus` that spreads existing items will drop the `slices` array unless the helper is updated to operate on `EpicOverview`. These helpers are called by every epic lifecycle handler. Schema validation (INV-005) will fail on every epic state transition.

**Fix**: Add `updateOverviewStatus`, `addEpicToOverview`, and new `addSliceToOverview` to slice 01's scope and Behavior list. Note downstream impact on `epic-lifecycle.ts` which calls these helpers.

### C3. Slice 01 and 04 lack runnable end-to-end verification
Sources: tracer-bullet

Slice 01 verification is limited to `tsc`, unit tests, and grep — no integration or fitness tests. Slice 04 (skills) verification is entirely grep-based with no runnable entry point. This means both slices could pass verification while integration/fitness tests are silently broken or skills contain path errors only surfaced during execution.

**Fix (slice 01)**: Add `bun test` (full suite) or at minimum `bun test tests/fitness/ tests/integration/`. If integration tests are expected to fail because RPC isn't updated yet, state explicitly which test files will be temporarily broken and why.

**Fix (slice 04)**: Add `bun run install:skills && grep -r '.project/slices/' ~/.claude/skills/` to verify no stale paths in installed copies. Add `bun test` to confirm no regressions.

## IMPORTANT

### I1. `addSliceToOverview` missing from slice 01 Behavior list
Source: software-architecture

Architecture doc specifies `addSliceToOverview(state, epicName, sliceItem)` and slice 01's summary mentions it, but it's absent from the numbered Behavior list and Verification. `CREATE_SLICE` handler needs this to append to the epic's embedded array.

**Fix**: Add Behavior item for `addSliceToOverview`. Add verification confirming `CREATE_SLICE` produces an epic overview entry with the new slice in its `slices` array.

*Note: Partially overlaps with C2 — both about missing helpers in slice 01.*

### I2. `entityDir()` in priorities.ts not explicitly listed in slice 03
Sources: software-architecture, architecture-alignment

`priorities.ts` has an `entityDir()` helper function (not a string literal) that returns `slices/${target.name}` for slice targets, used by all context bundling phases. The goal says "string literals updated" but `entityDir()` is a function body change. Also `context/index.ts` (`resolveScope()`) should be listed explicitly alongside `priorities.ts` and `learnings.ts`.

**Fix**: List `entityDir()` explicitly as a fourth Behavior item in slice 03. List `context/index.ts` explicitly in scope. Add note that `entityDir()` relies on `Target.epic` from slice 01.

### I3. `buildCompleteEvent` and `buildSliceCompleteResult` changes underspecified in slice 02
Sources: software-architecture, architecture-alignment

`buildCompleteEvent` for slices doesn't include `epic` field. `buildSliceCompleteResult` has 6 references but one is a structural change (reading from `epics/overview.json` navigating `items[].slices[]` instead of `slices/overview.json`), not just a path change. The Behavior section doesn't distinguish these.

**Fix**: Expand Behavior to list `buildCompleteEvent` explicitly. Add `buildSliceCompleteResult` signature change to accept epic. Distinguish the 5 path-only changes from the 1 structural change.

### I4. `slice-submit.ts` and activity log scope strings missing from slice 01 Behavior
Source: architecture-alignment

`slice-submit.ts` has 5 flat path references. `slice-complete.ts` has activity log scope strings that use `slices/${event.slice}` — these are semantically different from state tree paths but not called out separately.

**Fix**: Add `slice-submit.ts` to explicit file list in slice 01's Behavior. Add "activity log scope strings in all transition handlers" or document they are covered by the blanket statement.

### I5. Slice 03/04 dependencies are overly strict — could be relaxed
Source: risk-dependency, architecture-alignment

Slice 03 only needs state machine types/paths from slice 01 — it doesn't call RPC or commands. Slice 04 is pure content changes that only need the path convention from slice 01. Relaxing dependencies would allow parallel execution if slice 02 hits issues.

**Fix**: Consider relaxing slice 03 dependency to slice 01 only. Slice 04 could proceed after slice 01 (carve out `/complete` skill change to slice 03).

### I6. Self-migration in slice 05 is high-risk with no rollback procedure
Sources: risk-dependency, tracer-bullet

Self-migration is irreversible data transformation bundled with routine test updates. No rollback steps specified. Post-hoc "verify intact" check may not catch silent data loss.

**Fix**: Add explicit rollback procedure: verify `.project-old/` backup created, then `diff -r .project-old/slices/ .project/epics/*/slices/` to confirm only expected restructuring. Consider splitting self-migration into a separate final step with its own verification gate.

### I7. Slice 01 scope is larger than described in sequencing
Source: software-architecture

With schema registry, `updateOverviewStatus`, `addEpicToOverview`, and `addSliceToOverview` all moving into slice 01, the scope is materially larger than the sequencing doc describes.

**Fix**: Update sequencing Description to mention "epic overview helpers (`updateOverviewStatus`, `addEpicToOverview`, new `addSliceToOverview`)" and "schema registry pattern updates."

### I8. Slice 02 manual CLI test is underspecified
Source: tracer-bullet

"Verify all paths are nested" lacks concrete expected output and failure criteria.

**Fix**: Specify: "Run `goodplan slice:show --slice test-slice --json` and confirm JSON output paths contain `epics/test-epic/slices/test-slice/` not `slices/test-slice/`." Add `bun test tests/unit/ tests/integration/`.

### I9. Slice 03 lacks integration-level context bundling verification
Source: tracer-bullet

Unit tests with mocked data could pass while actual runtime paths are wrong (e.g., `entityDir()` still returning flat paths).

**Fix**: Add `bun test tests/integration/` or a CLI-based smoke test confirming context includes correct nested paths.

## MINOR

### M1. `overviewItemSchema` retains stale `epic` field
Source: software-architecture

After restructuring, slice overview items live inside epic items and no longer need `epic`. The field is optional and harmless but is dead schema surface area. Note for future cleanup.

### M2. `resolveEntityDir` in paths.ts needs epic — straightforward but should be noted
Source: software-architecture

`paths.ts:145-161` returns flat slice path. Change is straightforward after Target carries `epic`, but cascades to all `resolvePathReferences` calls. Should be noted in goal.

### M3. Slice 04 should enumerate all 11 skill files
Source: software-architecture

The goal says "Update all 11 skill files" and references another doc. List them directly for implementability.

### M4. Test fixtures broken between slices 01 and 05
Source: risk-dependency

Schema changes in slice 01 will invalidate test fixtures (`sliceSequence`, `slices/overview.json` references) that aren't updated until slice 05. Slice 01 says "with updated fixture data" but sequencing doc doesn't call out this cross-slice concern.

### M5. No capstone end-to-end verification across all slices
Source: tracer-bullet

No explicit verification that exercises the full workflow (create epic -> create slice -> plan -> refine -> implement -> complete) with nested paths. `workflow-slice.test.ts` does this but isn't called out.

**Fix**: In slice 05 verification, add: "Verify `tests/integration/workflow-slice.test.ts` passes — exercises full slice lifecycle with nested paths."

### M6. Slice 01 produces unexercised code paths
Source: tracer-bullet

New helper signatures (`getSlice(epic, name)`, etc.) are only exercised through unit tests until slice 02. Acceptable but should be acknowledged.

**Fix**: Add note: "Updated helper signatures are exercised only through unit tests in this slice. Full CLI integration deferred to slice 02."
