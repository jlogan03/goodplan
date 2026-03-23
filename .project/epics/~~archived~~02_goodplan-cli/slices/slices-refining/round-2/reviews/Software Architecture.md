# Software Architecture Review — Slice Goal Definitions and Sequencing (Round 2)

## Context

Round 1 score: 6/10. Three criticals (submit-* gap for slices 03-04), eleven importants (slice 02 size, dependencies, stdin JSON, learnings distinction). Claimed fixes: submit-* pulled into slice 03, cache/concurrent-mod deferred from 02 to 03, dependencies corrected, stdin JSON fixed.

This review verifies those fixes and checks for new issues introduced in the refining files.

---

## Verification of Round 1 Critical and Important Issues

### C1/C3 — Submit-* gap (slices 03, 04) — FIXED

`03-epic-lifecycle/goal-refining.md` now explicitly includes `submit-plan`, `submit-refinement`, and `submit-implementation` in scope ("Minimal submit-plan, submit-refinement, submit-implementation CLI commands — thin wrappers"). Success criteria include concrete `submit-plan` and `submit-implementation` tests. Slice 04 verification (step 3) explicitly says to use `submit-plan --slice 01-auth` and `submit-refinement --slice 01-auth`, referencing the commands from slice 03.

Verification steps 3 and 7 in slice 04 are now concrete and executable with the commands available from slice 03.

### I1 — Slice 02 scope — PARTIALLY FIXED

Cache and concurrent modification detection are deferred to slice 03 (confirmed in scope boundaries: "`.state-cache.json` / `loadState()` with cache (slice 03), concurrent modification detection in `commitState` (slice 03)"). The scope boundaries acknowledge this in "Out of scope" explicitly. This reduces the highest-risk items from slice 02 into slice 03.

However: the schema section says "Note this trade-off explicitly: schemas defined early for type inference, validated via unit tests here, fully exercised end-to-end in respective slices" — this is now present in scope boundaries. Addressed.

### I2/I3 — Slice 06 dependency — FIXED

`sequencing-refining.md` now shows slice 06 depending on 05 and slice 08 depending on "06 (transitively includes 05)". Correct.

### I4 — Stdin JSON for entity creation — FIXED

Slice 03 behavior section now shows `echo '{"name":"my-epic","goal":"Build X"}' | goodplan epic:create`. Slice 04 shows the same pattern for `slice:create`. All success criteria and verification steps use stdin JSON syntax. Fixed.

### I5 — Learnings-at-completion vs. learning:rollup — FIXED

Slice 04 scope boundaries now state: "learnings-at-completion (state machine apply function handles rollupTo-based writes during COMPLETE_SLICE — distinct from manual `learning:rollup` command in slice 06)." Slice 06 goal states the same distinction explicitly. Fixed.

### I6 — Context bundling verification doesn't test decisions/learnings — FIXED

Slice 05 verification step 2 now says: "Manually create decisions.jsonl and learnings.jsonl entries in .project/ to test context inclusion." Success criteria include: "Context bundling includes decisions and learnings — manually create decisions.jsonl and learnings.jsonl entries, verify they appear in context bundle output." Scope boundaries note this explicitly. Fixed.

### I7 — Schema command ownership — FIXED

Slice 06 scope boundaries now explicitly say: "`schema` command for stdin shape discovery (exercises INV-006, cross-cutting introspection)." Fixed.

### I8 — Cache verification steps in slice 02 — ADDRESSED (moved to slice 03)

Cache is now in slice 03 scope, not slice 02. Slice 03 success criteria include cache tests: "`.state-cache.json` created after first `loadState()`; second call reads from cache" and "Delete `.state-cache.json`, run status — falls back to full `assembleState()`". Fixed (scope shifted correctly).

### I9 — Slice 04 concrete stdin JSON for complete — FIXED

Slice 04 success criteria now shows: `echo '{"verificationPassed":true,"deferred":[{"description":"Add retry","targetSlice":"02-api"}],"learnings":[...],"architectureDelta":[]}' | goodplan slice:complete --slice 01-auth --json`. Verification step 3 shows the full command. Fixed.

### I10 — Slice 07 skills contradiction — FIXED

Slice 07 goal now says: "Command reference audit: grep for `goodplan ` in skill files, produce a list of referenced commands and whether each exists in the CLI. This is an audit — skill content is not modified in this slice (skills are markdown prompts, not executable scripts, so end-to-end exercise isn't possible here)." The contradiction is resolved. Fixed.

### I11 — Fitness function mechanism for completeness — FIXED

Slice 08 success criteria now reads: "Use a const array of event type strings validated exhaustively against the `StateEvent` union at compile time to ensure the array stays in sync." Verification step 5 confirms this. Fixed.

---

## Issues

**[IMPORTANT]** `03-epic-lifecycle/goal-refining.md`: Slice 03 verification uses skip paths but relies on direct `reduce()` calls without a CLI mechanism — unclear how skip paths are invoked during end-to-end verification

Slice 03 verification (step 3) says: "Walk through phase chain using skip paths from the transition tables. Use skip paths: from created, trigger COMPLETE_EXPLORE (skip) → explored. From explored, trigger COMPLETE_ARCHITECTURE (skip) → architecture-defined..." and then says "Verify via unit tests calling `reduce()` directly, and via a test helper or CLI test harness that triggers events."

The problem: the commands-api.md has `submit-explore`, `submit-architecture`, etc. mapped to `COMPLETE_EXPLORE`, `COMPLETE_ARCHITECTURE`. These are explicitly deferred to slice 05. The slice 03 verification therefore has no CLI mechanism for triggering COMPLETE_EXPLORE (skip path) or COMPLETE_ARCHITECTURE (skip path). The "test helper or CLI test harness" is vague — it's not a concrete CLI command, and a test helper only covers unit testing, not end-to-end compiled binary verification.

The slice 03 success criterion says "Skip path: trigger COMPLETE_EXPLORE event on a `created` epic (via reduce() in tests) — status transitions directly to `explored`." Marking it as "via reduce() in tests" makes it a unit test, not an end-to-end success criterion. This is acceptable, but the phrasing mixes unit and end-to-end verification without distinguishing which criteria are which.

Fix: In slice 03 goal, explicitly partition success criteria into "CLI/end-to-end" and "unit test only" sections, or prefix the skip-path criteria with "(unit test)". Make verification step 3 explicit: all skip-path transitions are verified via unit tests calling `reduce()` directly; the end-to-end CLI path uses only `epic:explore → epic:define-architecture → ... → epic:activate`. The compiled binary verification can omit skip paths since they're tested at the unit level.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `03-epic-lifecycle/goal-refining.md`: `COMPLETE_SLICING` in slice 03 — slices are created via `slice:create` (slice 04), but COMPLETE_SLICING in slice 03 implies slices exist

The transition table shows: `defining-slices → COMPLETE_SLICING → slices-defined` with `Orchestrator Returns: epic, status, sliceCount`. The `sliceCount` field implies that at the time of `COMPLETE_SLICING`, there are actual slice entities recorded in the system. But `slice:create` is slice 04's responsibility.

Slice 03 scope says epic phase transitions (including `COMPLETE_SLICING`) are in scope. The question raised in round 1 (I4 from Architecture Alignment) was "does COMPLETE_SLICING also implement the mechanism for recording slice names in `epic.json.sliceSequence`?" Looking at the refining file, this remains unresolved: it lists the full phase chain including `define-slices → slicing` as in scope, but doesn't clarify whether the COMPLETE_SLICING handler in slice 03 records a sliceCount based on actual slice entities or accepts a `sliceCount` payload from the caller.

Examining the state event type: `{ type: 'COMPLETE_SLICING'; epic: string }` — no sliceCount in the payload. This means the state machine must compute sliceCount from the state tree (count of slices linked to the epic). But if `slice:create` (CREATE_SLICE event) is deferred to slice 04, there will be zero slices at COMPLETE_SLICING time in slice 03.

The resolution is that COMPLETE_SLICING in slice 03 verification must be tested via unit test with a state that has pre-populated slices (or with a manually crafted fixture state), not via the CLI flow. The goal should clarify this: COMPLETE_SLICING in slice 03 is the state machine transition only, tested with fixture states in unit tests. The CLI path (epic:define-slices → define-slices → COMPLETE_SLICING) requires having created slices first, so it's only fully executable after slice 04.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `04-slice-lifecycle/goal-refining.md`: Verification step 3 references `submit-refinement --slice 01-auth` with scores but doesn't specify the stdin JSON shape

Verification step 3 walks through the full lifecycle and mentions "`submit-refinement --slice 01-auth` with scores stdin". The stdin JSON for `submit-refinement` carries scores as a `Record<string, number>` payload. Without the concrete JSON shape, a developer running this verification step won't know what to pipe. The success criterion for the circuit breaker says "submit maxRounds refinement rounds without passing scores" but doesn't show what "passing" vs "not passing" scores look like in the payload.

Compare to slice 04's `slice:complete` success criterion which correctly includes the full stdin JSON. The same rigor should apply to `submit-refinement` verification calls.

Fix: Add concrete stdin JSON examples for `submit-refinement` in verification step 3. For example: `echo '{"scores":{"clarity":7,"depth":6}}' | goodplan submit-refinement --slice 01-auth --json` (below threshold) and `echo '{"scores":{"clarity":9,"depth":9}}' | goodplan submit-refinement --slice 01-auth --json` (above threshold).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `03-epic-lifecycle/goal-refining.md`: Concurrent modification detection implementation is in scope but slice 03's binary verification doesn't cover it

Slice 03 now owns `commitState()` concurrent modification detection. Success criterion: "Concurrent modification: externally modify a file between assembleState and commitState — returns DATA_CONCURRENT_MODIFICATION." This is a valid criterion, but the verification steps (1-10) make no mention of how to reproducibly trigger concurrent modification during a binary verification run. The issue is that concurrent modification is a timing-sensitive condition — in a single-threaded synchronous test, there's no natural opportunity for an external modification between assembleState and commitState.

The success criterion is sound as a unit test (inject a modification into assembleState's return before calling commitState), but it's unclear how this is verified in the end-to-end CLI verification section. The verification steps for cache are present (steps 9 and 10 cover `.state-cache.json`) but concurrent modification is absent from the verification steps.

Fix: Either add a verification step showing how to trigger concurrent modification during CLI verification (e.g., using a specially instrumented binary build, or noting this is unit-test-only), or move this criterion to a "(unit test)" section. The integration test in slice 08 covers this fitness function end-to-end, so deferring CLI-level verification there is acceptable.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `sequencing-refining.md`: Open item on `--query` auto-implying `--json` is still unresolved

The sequencing file retains the open item: "Resolve this inconsistency before slice 06 implementation." This was also raised in round 1 (M10). The issue persists in `sequencing-refining.md` as an unresolved note rather than a resolved decision. Since slice 06 implements full `--query` support, this must be resolved before slice 06 implementation begins — leaving it as an open item in the sequencing file is acceptable only if there's a tracking mechanism.

The `--query` implementation in the tracer bullet (slice 01) and the commands-api.md spec are inconsistent. commands-api.md says `--query` implies `--json` for the intermediate representation. If this remains unresolved through slices 02-05, the `--query` behavior will be inconsistent with the eventual spec.

This is MINOR since it's a one-line decision that doesn't affect architecture, but it should be resolved (updated to "RESOLVED: [decision]") before slice 06 lands.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `05-sub-agent-commands/goal-refining.md`: `quest:complete` stdin shape differs from `slice:complete` but verification doesn't confirm the distinction

The architecture defines `quest:complete` as having the same shape as `slice:complete` but without the `deferred` field. Slice 05 verification (step 9) says "Walk through its lifecycle" but doesn't show the concrete stdin JSON for `quest:complete`. Given that `quest:complete` is the new command in slice 05 (not covered by earlier slices), the verification should include the concrete stdin JSON to confirm the `deferred` field is correctly absent and the rest of the shape is correct.

Fix: Add a concrete stdin example in verification step 9: `echo '{"verificationPassed":true,"learnings":[],"architectureDelta":[]}' | goodplan quest:complete --quest fix-logging --json`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `08-integration-test/goal-refining.md`: Fitness function "state machine completeness" verification spec references `Transition[]` runtime data but doesn't specify where this data lives

Verification step 5 says "Verify fitness function derives expected transition count from `Transition[]` runtime data structures (not by parsing markdown)." This is now correct in mechanism (using runtime data, not markdown parsing). However, the fitness function test needs to know the file path or module where `Transition[]` arrays are exported. If the state machine implementation puts transition tables in private (non-exported) closures, the fitness function can't access them.

This is an architectural constraint that needs to be established now: the transition tables for each entity type must be exported constants, not internal variables, so the fitness function can enumerate them. The goal should state: "Transition tables are exported from their respective state machine modules (e.g., `export const epicTransitions: Transition[]`, `export const sliceTransitions: Transition[]`) to enable fitness function enumeration."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `02-project-init/goal-refining.md`: `--name` default behavior mentioned in scope but not in success criteria or verification

Scope boundaries say: "`--name` default behavior (basename of cwd)." But no success criterion tests this: `goodplan init` without `--name` should use the directory name as the project name. There's no verification step confirming this. Given that commands-api.md explicitly specifies this behavior ("When `--name` is omitted, falls back to the current directory name (`path.basename(cwd)`)"), it should be verified.

Fix: Add a success criterion: `cd /tmp/my-project && goodplan init` (no `--name`) — project.json has `"name": "my-project"`.

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 8/10

The round 1 critical issues are all resolved — slice 03 now owns submit-plan/submit-refinement/submit-implementation, making slices 03 and 04 verification executable. The dependency corrections (06→05, 08→05 transitively) are in place. Stdin JSON patterns are consistent. The learnings-at-completion vs. learning:rollup distinction is now explicit. These were the most important fixes and they're all done well.

Remaining issues: two importants around skip-path/COMPLETE_SLICING ambiguity in slice 03 (unit test vs CLI verification scope needs explicit partitioning), one important for submit-refinement missing concrete stdin JSON, and one important about concurrent modification verification mechanics. These are editorial fixes and won't cause architectural rework — they're precision gaps in verification steps, not structural problems. The minor items are small clarifications that would improve implementation precision.

To reach 9+: explicitly partition unit-test-only criteria from CLI/binary criteria in slice 03 (skip paths, COMPLETE_SLICING with zero slices, concurrent modification); add concrete stdin JSON for submit-refinement in slice 04; ensure Transition[] arrays are exported for fitness function access; and resolve the open --query item in sequencing.

## Summary
- Critical: 0
- Important: 4
- Minor: 4
