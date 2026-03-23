# Software Architecture Review — Slice Goal Definitions and Sequencing (Round 3)

## Context

Round 2 score: 8/10. Four IMPORTANT issues: skip-path/unit-test partitioning in slice 03, COMPLETE_SLICING with zero slices, submit-refinement missing stdin JSON, concurrent modification verification scope. All claimed fixed.

This review verifies those fixes and checks for new issues introduced in the refining files.

---

## Verification of Round 2 Issues

### IMPORTANT-1 — Skip-path / unit-test partitioning in slice 03 — FIXED

Slice 03 success criteria now explicitly prefix skip-path items with `(unit test)`:
- "(unit test) Skip path: trigger COMPLETE_EXPLORE event on a `created` epic via `reduce()` — status transitions directly to `explored`"
- "(unit test) COMPLETE_SLICING: exercised via `reduce()` with fixture state pre-populated with slice entries"
- "(unit test) Concurrent modification: externally modify a file between assembleState and commitState — returns DATA_CONCURRENT_MODIFICATION (timing-sensitive; CLI-level integration check deferred to slice 08)"

Verification step 3 is now split into **(a) CLI track** and **(b) Unit test track** with explicit separation. The distinction between what's CLI-verifiable and what's unit-test-only is clear throughout.

### IMPORTANT-2 — COMPLETE_SLICING with zero slices — FIXED

Slice 03 success criterion now reads: "(unit test) COMPLETE_SLICING: exercised via `reduce()` with fixture state pre-populated with slice entries (slice entities don't exist until slice 04, so CLI-level verification of real `sliceCount` requires slice 04)." The gap is acknowledged and correctly routed to unit tests with fixture state.

### IMPORTANT-3 — submit-refinement missing concrete stdin JSON (slice 04) — FIXED

Verification step 3 in slice 04 now includes:
`echo '{"scores":{"clarity":9,"depth":9}}' | goodplan submit-refinement --slice 01-auth --json` (above threshold)

Verification step 7 includes:
`echo '{"scores":{"clarity":7,"depth":6}}' | goodplan submit-refinement --slice <name> --json` (below threshold)

Both the happy-path and circuit-breaker paths now have concrete stdin JSON.

### IMPORTANT-4 — Concurrent modification verification mechanics — FIXED

Slice 03 success criterion marks this as "(unit test)" with note: "(timing-sensitive; CLI-level integration check deferred to slice 08 fitness functions)." The scope is now correct — unit test in slice 03, end-to-end fitness function in slice 08.

### MINOR-1 — `--query` open item in sequencing — PARTIALLY ADDRESSED

The sequencing file retains the open item text as written. It now says: "Resolved when slice 06 is implemented — slice 06 success criteria include a test for `--query` without `--json`." This is acceptable as a forward-reference resolution strategy, and the slice 06 success criterion does confirm the behavior: "`goodplan status --query '.project.name'` (without `--json`) returns `'test-project'` — `--query` auto-implies `--json` for the intermediate representation." The item is effectively resolved via forward reference. Minor concern only — the open item label is still present in sequencing rather than being marked RESOLVED, but the spec is clear.

### MINOR-2 — `quest:complete` stdin shape verification — FIXED

Slice 05 verification step 9 now includes the concrete stdin:
`echo '{"verificationPassed":true,"learnings":[...],"architectureDelta":[]}' | goodplan quest:complete --quest fix-logging --json`

The `deferred` field is correctly absent, confirming the quest/slice distinction.

### MINOR-3 — Transition table export for fitness functions — FIXED

Slice 03 scope boundaries now say: "Transition tables are exported from their respective state machine modules (e.g., `export const epicTransitions: Transition[]`) to enable fitness function enumeration in slice 08." Slice 08 success criteria and verification step 5 reference `Transition[]` imports and the compile-time-validated `EVENT_TYPES` const array. Fixed.

### MINOR-4 — `--name` default behavior in slice 02 — FIXED

Slice 02 now includes the success criterion: "`cd /tmp/my-project && goodplan init` (no `--name`) — `project.json` has `'name': 'my-project'` (basename of cwd default)."

---

## Issues

**[IMPORTANT]** `03-epic-lifecycle/goal-refining.md`: `epic:complete` stdin shape in success criteria and verification steps uses `{"reason":"..."}` but the spec requires `{"verificationResults": [...]}`

Slice 03 success criterion line 45 reads:
```
echo '{"reason":"All slices complete"}' | goodplan epic:complete --epic my-epic --json
```

Verification step 8a reads:
```
echo '{"reason":"All slices complete"}' | goodplan epic:complete --epic my-epic --json
```

But `commands-api.md` defines `epic:complete` stdin as:
```json
{ "verificationResults": [ { "index": 0, "passed": true, "notes": "..." } ] }
```

And `state-machine-api.md` confirms the event type: `{ type: 'COMPLETE_EPIC'; epic: string; verificationResults: VerificationResult[] }`. The `COMPLETE_EPIC` transition table row also shows the guard: "all verificationResults have passed: true" — there is no `reason` field in the spec anywhere.

If a developer follows the slice 03 goal literally, they will write `epic:complete` to accept a `reason` field rather than `verificationResults`, which is a contract violation. The success criterion and verification step must use the correct stdin shape.

Fix: Replace `echo '{"reason":"All slices complete"}' | goodplan epic:complete --epic my-epic --json` with `echo '{"verificationResults":[{"index":0,"passed":true,"notes":"All slices complete"}]}' | goodplan epic:complete --epic my-epic --json` in both success criterion and verification step 8a. Also update the "What We're Building" section (item 9a) which currently says "with stdin JSON: reason" but the actual spec has no reason field.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `03-epic-lifecycle/goal-refining.md`: CLI verification path for `epic:activate` requires `slices-refined` status, but no CLI path reaches `slices-refined` in slice 03

The transition table states: `slices-refined → ACTIVATE_EPIC → activated`. To run `goodplan epic:activate` in a CLI/binary verification, the epic must be in `slices-refined` state as persisted on disk.

In slice 03's CLI track (verification step 3a), the phase chain ends at `epic:refine-slices → refining-slices`. The only path to `slices-refined` is via `submit-refine-slices → COMPLETE_REFINE_SLICES`, which is explicitly deferred to slice 05 ("Out of scope: submit-explore/submit-architecture/submit-slices/submit-refine-architecture/submit-refine-slices CLI commands (slice 05)").

This means verification steps 4 and 5 ("Add verification criteria, then activate" and "Attempt second epic activation — verify guard rejects it") cannot be completed via CLI in slice 03 after walking the phase chain through CLI commands only. The CLI track ends with the epic in `refining-slices`, and `ACTIVATE_EPIC` from that state would return `STATE_INVALID_TRANSITION`.

The unit test track (step 3b) does reach `slices-refined` via `reduce(epicWithStatus("slices-defined"), { type: "COMPLETE_REFINE_SLICES" })`, but this produces an in-memory state, not a persisted state that `epic:activate` can operate on.

The gap has two clean resolutions: (A) scope `submit-refine-slices` into slice 03 alongside the other minimal submit-* commands (already in scope: submit-plan, submit-refinement, submit-implementation), or (B) explicitly state that `epic:activate` CLI verification uses a fixture state injected directly into `.project/` (bypassing CLI phase chain) with a note acknowledging the skip — and document that the full CLI end-to-end path (refining-slices → slices-refined → activated) is verified only after slice 05 delivers submit-refine-slices.

Resolution (A) is architecturally preferable — the same rationale that pulled submit-plan into slice 03 ("needed by slices 03-04 verification and simple enough to include here") applies equally to submit-refine-slices. Without it, slice 03's activation guard tests are partial.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `sequencing-refining.md`: Open item label remains open rather than being marked RESOLVED

The sequencing file contains: "Open item: `--query` auto-implying `--json`..." This item is effectively resolved by forward reference to slice 06's success criteria, but the label still says "Open item" rather than "RESOLVED: `--query` auto-implies `--json` — implemented and verified in slice 06 success criteria (test: `goodplan status --query '.project.name'` works without --json)."

Leaving it labeled "Open item" creates a risk that future readers treat it as still open and try to resolve it redundantly during slices 02-05. A brief inline resolution note would close this.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `03-epic-lifecycle/goal-refining.md`: Behavior item 9a guard description says "all slices must be complete/abandoned" but the transition table guard is "all verificationResults have passed: true"

Behavior item 9a reads: "`goodplan epic:complete --epic my-epic` transitions active epic to completed status. Guard: all slices must be complete/abandoned."

The transition table (`transition-tables.md`) defines the `COMPLETE_EPIC` guard as: "all verificationResults have passed: true" with error `STATE_VERIFICATION_FAILED`. The guard is about verification results in the event payload, not about slice completion status. Slice completion is captured by the `epicComplete` implicit transition detection (which flags `epicComplete: true` in COMPLETE_SLICE responses), but it is not a guard on `COMPLETE_EPIC`.

This description would mislead a developer implementing the `COMPLETE_EPIC` handler to check sibling slice statuses rather than the verificationResults payload.

Fix: Replace "Guard: all slices must be complete/abandoned" with "Guard: all verificationResults in stdin payload have `passed: true` (STATE_VERIFICATION_FAILED if any passed: false)."

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 9/10

All four round-2 IMPORTANT issues are genuinely resolved and the fixes are precise and complete. Skip-path partitioning in slice 03 is now clean. The submit-refinement stdin JSON in slice 04 is correct. Concurrent modification is scoped to unit tests with explicit forward reference to slice 08. Transition table exports are specified. The two new issues are both in slice 03: a wrong stdin shape for `epic:complete` (verificationResults vs reason) and a missing CLI path to `slices-refined` for `epic:activate` — both are direct contract violations that would cause implementation errors. These are significant enough to warrant IMPORTANT severity, though neither requires sequencing changes or new architecture decisions. Fix these two items and the plan is implementation-ready.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
