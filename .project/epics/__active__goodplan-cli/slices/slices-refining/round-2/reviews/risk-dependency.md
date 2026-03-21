# Risk/Dependency Analysis Review — Round 2

## Context

Round 1 identified 1 Critical (slice 05 false RPC dependency), 3 Important, and 3 Minor issues. The editor addressed the critical by correcting slice 05's dependency; noted 02/03 parallelism; and added a soft dependency note for slice 07. This round evaluates whether those fixes hold and scans for remaining issues.

## Changes Since Round 1 — Verification

### C1 Fixed: Slice 05 RPC dependency corrected

**[05-commands-read/goal-refining.md] — RESOLVED.** The goal now explicitly states the routing split: "List/show commands read directly from the Data Layer (no RPC). The `status` command routes through RPC (`status()` function from slice 04)." The dependency table in sequencing-refining.md now reads `02 (list/show), 04 (status only)` — correct. The false hard block is eliminated.

### M1 Fixed: 02/03 parallelism made explicit

**[sequencing-refining.md] — RESOLVED.** The rationale now states "Slices 02 and 03 can run in parallel — they have no dependency on each other." The dependency column for slice 03 has been updated to `01 (minimal schemas), 02 (full entity schemas)`. This is accurate and useful.

### M3 Fixed: Slice 07 soft dependency documented

**[07-skills-migrate/goal-refining.md] — RESOLVED.** The soft dependency is explicit and correctly framed: not a hard block, rationale given (avoid rework when command surface is final).

## Round 1 Issues Not Yet Addressed

The following round 1 findings were NOT addressed in the working copies. Scored and flagged below.

### I1: Tracer bullet scope creep

**[01-tracer-bullet/goal-refining.md] — NOT RESOLVED.** Round 1 merged feedback directed narrowing slice 01 to init + status + `--json` + one jqjs smoke test, deferring `--quiet`, `--query` as a general mechanism, and `goodplan schema` to slice 05. The current goal-refining.md still includes:

- `--query` via jqjs described as a "jqjs smoke test" but framed as a general mechanism ("a hidden `--query` on status for smoke testing only")
- `--json` flag "supported on all commands" — with only two commands this is trivially true, but the phrasing overstates scope
- Structured error JSON and full exit code behavior across invalid commands

The scope boundaries paragraph does say `--quiet`, full `--query`, and `goodplan schema` are out of scope, and the jqjs entry is qualified as "smoke test only." This is an improvement over the pre-round-1 version but the round 1 merged action ("add a note in slice 05 that it 'deepens' the jqjs integration") has been implemented in slice 05 ("Deepens the jqjs integration from the tracer bullet smoke test to full `--query` support") — good.

**Assessment:** Substantially resolved. The jqjs smoke test framing is accurate. The remaining surface area in slice 01 (structured error JSON, exit codes) is legitimately part of proving the Bun/citty stack. This item is downgraded from Important to **Minor** — the residual concern is language precision, not scope overload.

### I2: Schema ownership between slices 02 and 03

**[02-data-layer/goal-refining.md, 03-state-machine/goal-refining.md] — RESOLVED.** Slice 02 now explicitly owns "all Zod schemas in `src/schemas/`" in its scope boundaries. Slice 03's scope boundaries state "Consumes Zod schemas from `src/schemas/` (defined in slice 02). Fitness function for transition table completeness should derive expected counts from the `StateEvent` discriminated union type rather than parsing the markdown table." The dependency chain 01 → 02 → 03 is clear.

### I3: Context bundling underspecified in slice 04

**[04-rpc-core/goal-refining.md] — PARTIALLY RESOLVED.** The success criteria now includes: "Context priority ordering tested for each phase configuration defined in transition-tables.md (all 9 phases)." This directly addresses the coverage gap. However, the underlying risk remains: context bundling is still bundled within slice 04 with no explicit time-boxing or risk mitigation. If context bundling complexity delays slice 04 completion, the entire downstream chain (05, 06, 08) is blocked. The fix addresses test coverage but not the scheduling risk.

**Assessment:** Downgraded from Important to **Minor** — the test coverage gap is closed. The scheduling risk is an acknowledged architectural choice (keeping context bundling in RPC), not an oversight.

### I4: Slice 04 missing `status()` function

**[04-rpc-core/goal-refining.md] — RESOLVED.** `status()` now appears explicitly in the behavior section (item 8), the success criteria, and the scope boundaries. Complete.

### I5: Epic status enum inconsistency

**[03-state-machine/goal-refining.md] — ACKNOWLEDGED, NOT RECONCILED.** The architecture flag is now explicit: "EpicStatus/SliceStatus/QuestStatus enum values must be reconciled across `state-machine-api.md`, `transition-tables.md`, and these slice goals before implementation begins. The `To` column values in `transition-tables.md` are the source of truth." This is a correct acknowledgment. The actual reconciliation is deferred to pre-implementation — appropriate, since implementation hasn't started. The flag is in the right place.

**Assessment:** Appropriate handling. No issue.

### I6: Slice 03 not independently verifiable

**[03-state-machine/goal-refining.md] — RESOLVED.** The smoke test is now in scope ("Lifecycle smoke test: chain reduce() calls through a full entity lifecycle on a fixture ProjectState — each returns valid new state"), the unit-test-only exception is explicitly acknowledged, and the fitness function guidance to derive from `StateEvent` discriminated union is in scope boundaries.

### I7: Slice 02 missing binary regression test

**[02-data-layer/goal-refining.md] — RESOLVED.** Verification step 6 reads: "Binary regression test: compile binary, run `goodplan init` + `goodplan status --json` — verify tracer bullet commands still work with the full data layer." Success criteria also includes "Binary regression: compiled binary `goodplan init` + `goodplan status --json` still works with the full data layer."

### M2: Stdin infrastructure ownership

**[01-tracer-bullet/goal-refining.md, 06-commands-mutate/goal-refining.md] — RESOLVED.** Slice 01 now includes "stdin infrastructure (TTY detection, size limits, empty-stdin handling) as shared command infrastructure" in scope. Slice 06 states it "consumes shared stdin infrastructure from slice 01" and integration tests for stdin behavior live there. Clean separation.

### M4: Slice 06 verification workflow

**[06-commands-mutate/goal-refining.md] — RESOLVED.** Verification section is now a numbered list of assertions with expected state after each command.

### M5: Slice 05 fixture setup

**[05-commands-read/goal-refining.md] — RESOLVED.** Scope boundaries explicitly state "Fixtures created via init + direct file creation."

### M6: Slice 07 real skills directory risk

**[07-skills-migrate/goal-refining.md] — RESOLVED.** Verification uses `GOODPLAN_SKILLS_DIR` override, documented explicitly.

## New Issues Identified in Round 2

### Issue R2-1: commands-api.md lists `ROLLUP_LEARNINGS` but transition-tables.md has no such event

**[06-commands-mutate/goal-refining.md] Severity: Important**

Slice 06 includes `learning:rollup --from slices/01-auth --to project` as a behavior item and success criterion, mapping through `ROLLUP_LEARNINGS` per commands-api.md. However, `transition-tables.md` — the authoritative source — contains no `ROLLUP_LEARNINGS` event. The learnings rollup is handled implicitly: `COMPLETE_SLICE` returns `learningsRolledUp` in the orchestrator response, and `COMPLETE_QUEST` and `COMPLETE_EPIC` do the same. There is no standalone learnings rollup event.

If `learning:rollup` routes through a `ROLLUP_LEARNINGS` StateEvent that doesn't exist in the transition tables, slice 03 will not implement a handler for it, and slice 06 will discover the gap at integration time. This could require retroactive changes to slices 03 and 04.

**Risk:** Slice 06 implementation discovers a missing state event that requires changes to 03 and 04. Late discovery of a cross-slice contract gap.

**Action needed:** Clarify in slice 06 whether `learning:rollup` is a standalone state-triggered command or a Data Layer direct operation (like list/show). If it requires a StateEvent, add it to transition-tables.md before slice 03 implementation begins. If it's a Data Layer operation, remove the RPC routing assumption from slice 06's behavior.

### Issue R2-2: Slice 06 success criteria reference sub-agent commands not in commands-api.md

**[06-commands-mutate/goal-refining.md] Severity: Minor**

The slice 06 success criteria include `start-plan`/`submit-plan` commands. These are in commands-api.md under Sub-Agent Commands. However, the success criteria also include: `epic:explore`, `epic:define-architecture`, `epic:refine-architecture`, `epic:define-slices`, `epic:refine-slices` implicitly via the "full lifecycle" description. These commands exist in commands-api.md but are not listed in slice 06's success criteria — only the epic:create → epic:activate → epic:complete chain appears. The explore/architecture/slices workflow commands are absent from verification.

The slice 06 scope says it implements "All entity mutation commands per commands-api.md" but the success criteria verify only a narrow subset. A slice whose scope says "all commands" but whose success criteria check a subset creates a verification gap — the slice could be marked "done" without all commands being tested.

**Action needed:** Either enumerate all mutation commands in success criteria, or explicitly state the verification strategy for the remainder (e.g., "commands not listed are structurally identical to the lifecycle above — one test each in integration-test slice 08").

### Issue R2-3: Slice 08 fitness function for transition table completeness may drift

**[08-integration-test/goal-refining.md] Severity: Minor**

Slice 08's fitness function "count of transition test cases matches count of transition rows in transition-tables.md" is verified by: "count lines in transition-tables.md with `"entity":"epic"|"slice"|"quest"` and `"to"` field." This is a markdown parse, which is fragile. Slice 03's scope boundaries correctly say "derive expected counts from the `StateEvent` discriminated union type rather than parsing the markdown table." But slice 08 still describes the markdown parse approach in its verification step. If slice 03 implements the TypeScript-derived count, slice 08's fitness function may use a different counting method — either redundant or contradictory.

**Action needed:** Align slice 08's fitness function description with slice 03's approach (derive from StateEvent discriminated union), or explicitly note that this fitness function lives in slice 03 and slice 08's fitness function list should remove it.

### Issue R2-4: Sequencing table row for slice 05 shows dependency chain change, but critical path is still implicit

**[sequencing-refining.md] Severity: Minor**

The dependency fix for slice 05 (now `02 (list/show), 04 (status only)`) is correct, but the rationale paragraph still reads "List/show commands bypass RPC; unblocked after 02. Only `status` needs 04." This is now accurate, but the sequencing rationale doesn't state the implication: slice 05 (minus status) can run in parallel with slice 04. The 02/03 parallelism is made explicit; the 04 || 05 parallelism opportunity is left implicit. Not a defect — but a missed opportunity to document the critical path clearly.

**Action needed:** Add a sentence to the sequencing rationale: "Slice 05 (list/show commands) is unblocked after slice 02 and can run in parallel with slice 04; only the `status` command within slice 05 requires slice 04."

## Dependency Graph — Current State

```
01 (tracer) ─────────────► 02 (data) ──────────────────────────────► 04 (rpc) ─────► 06 (mutate) ─► 08 (integration)
     │                          │                                          │                │
     │                          └──────► 03 (state) ────────────────────► 04              │
     │                          │                                                          │
     │                          └──────────────────────────────────────► 05 (read, list/show only)
     │                                                                    ▲
     │                                                           04 (for status only)
     │
07 (skills) ─ parallel, soft dep on 06
```

No cycles. DAG is clean. The parallelism opportunities (02||03, and 05-list/show||04) are now documented or documentable.

## Criterion Scores

| Criterion | Round 1 | Round 2 | Delta |
|---|---|---|---|
| Unknown front-loading | 8/10 | 9/10 | +1 (tracer bullet scope tightened, jqjs smoke test correctly scoped) |
| Circular dependencies | 10/10 | 10/10 | 0 (no cycles, clean DAG maintained) |
| Ordering robustness | 7/10 | 9/10 | +2 (C1 fixed, 02/03 parallelism explicit, R2-4 minor gap) |
| Dependency minimality | 8/10 | 8/10 | 0 (R2-1 introduces a new cross-slice contract risk) |

## Overall Assessment

Round 1's critical fix is solid. All 7 Important issues from round 1 are resolved or appropriately deferred. The 3 Minor issues from round 1 are resolved. New issues are lower severity — one Important (R2-1, cross-slice contract gap for `learning:rollup`) and three Minors.

| Criterion | Score |
|---|---|
| Unknown front-loading | 9/10 |
| Circular dependencies | 10/10 |
| Ordering robustness | 9/10 |
| Dependency minimality | 8/10 |
| **Overall** | **9/10** |

## Issue Summary

| Severity | Count | Issues |
|---|---|---|
| Critical | 0 | — |
| Important | 1 | R2-1: `learning:rollup` maps to `ROLLUP_LEARNINGS` which is absent from transition-tables.md — cross-slice contract gap |
| Minor | 3 | R2-2: slice 06 success criteria verify subset of claimed full scope; R2-3: slice 08 fitness function uses markdown parse, conflicts with slice 03 TypeScript-derived approach; R2-4: 04 \|\| 05 parallelism not documented in sequencing rationale |
