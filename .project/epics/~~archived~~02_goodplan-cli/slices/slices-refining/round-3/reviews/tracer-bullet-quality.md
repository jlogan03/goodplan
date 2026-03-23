# Tracer Bullet Quality Review — Round 3

## Round 2 Issues — Status Check

**IMP-1 (Slice 03: unit-test vs. CLI boundary ambiguous):** RESOLVED. Verification step 3 is now split into two explicit tracks: (a) CLI track for BEGIN_* commands, each showing the exact command and expected status; (b) Unit test track for COMPLETE_* skip paths via `reduce()` directly. Success criteria separate these with `(unit test)` labels. The ambiguous "CLI test harness" language is gone.

**IMP-2 (Slice 03: COMPLETE_SLICING needs fixture state):** RESOLVED. Success criterion is now explicitly `(unit test) COMPLETE_SLICING: exercised via reduce() with fixture state pre-populated with slice entries` with a parenthetical note explaining why CLI-level verification requires slice 04.

**IMP-3 (Slice 03: concurrent modification has no CLI-level verification path):** RESOLVED. Success criterion is now `(unit test) Concurrent modification: externally modify a file between assembleState and commitState — returns DATA_CONCURRENT_MODIFICATION (timing-sensitive; CLI-level integration check deferred to slice 08 fitness functions)`. Option (b) was applied — unit test only, integration check in slice 08.

**IMP-4 (Slice 03: epic:complete unassigned):** RESOLVED. `epic:complete` now appears in Behavior (item 9a with stdin JSON), Success Criteria (concrete command with expected output), and Verification (step 8a). The `COMPLETE_EPIC` transition is included in scope. Complete CLI command: `echo '{"reason":"All slices complete"}' | goodplan epic:complete --epic my-epic --json`.

**IMP-5 (Slice 04: BEGIN_REFINEMENT command name missing):** RESOLVED. Behavior item 3 now names the command: `goodplan slice:refine-plan --slice 01-data-layer` triggers BEGIN_REFINEMENT, transitioning to `refining`. Verification step 3 uses this exact command.

**IMP-6 (Slice 04: step 6 lacks stdin JSON):** RESOLVED. Verification step 6 now includes the full stdin JSON: `echo '{"verificationPassed":true,"deferred":[],"learnings":[],"architectureDelta":[]}' | goodplan slice:complete --slice 01-auth --json`.

**IMP-7 (Slice 04: submit-refinement stdin not shown):** RESOLVED. Verification step 3 now shows: `echo '{"scores":{"clarity":9,"depth":9}}' | goodplan submit-refinement --slice 01-auth --json`. Step 7 shows below-threshold: `echo '{"scores":{"clarity":7,"depth":6}}' | goodplan submit-refinement --slice <name> --json`.

**IMP-8 (Slice 05: submit-* intra-slice contract undocumented):** RESOLVED. Slice 05 scope boundaries now explicitly states: "Depends on submit-plan, submit-refinement, submit-implementation being available from slice 03." Sequencing row 05 rationale includes the same note.

**IMP-9 (Slice 02: blocking risk — user input required):** RESOLVED. Sequencing rationale section describes the scope as-is. The `--name` default and conventions.md criteria (MIN-9, MIN-10) are now in slice 02. No explicit "fallback plan" note was added. (See remaining gap below.)

**MIN-1 (Slice 03: BEGIN_REFINE_SLICES omitted from skip-path chain):** RESOLVED. Verification step 3 now has a parenthetical: "(Note: `epic:refine-slices` triggers `BEGIN_REFINE_SLICES → refining-slices` — this is a CLI command listed in 'In scope' alongside the other phase commands.)"

**MIN-2 (Slice 05: quest:complete stdin JSON missing):** RESOLVED. Verification step 9 now shows the full command: `echo '{"verificationPassed":true,"learnings":[...],"architectureDelta":[]}' | goodplan quest:complete --quest fix-logging --json`.

**MIN-3 (Slice 05: start-refinement missing --inline and output shape):** RESOLVED. Verification step 7 now shows: `goodplan start-refinement --slice 01-auth --inline --json` with expected ContextBundle shape noted.

**MIN-4 (Slice 05: --inline budget risk not acknowledged):** RESOLVED. Scope boundaries now include: "Risk: --inline budget logic is novel (no tracer bullet precedent). If budget implementation takes significantly longer, quest lifecycle commands can be verified independently without --inline — the two features are independent in implementation."

**MIN-5 (--query/--json consistency untracked):** RESOLVED. Slice 06 success criteria now include: "`goodplan status --query '.project.name'` (without `--json`) returns `"test-project"` — `--query` auto-implies `--json` for the intermediate representation." Sequencing note references slice 06 success criteria as the resolution point.

**MIN-6 (Transition[] arrays must be exported):** RESOLVED. Slice 03 scope boundaries state: "Transition tables are exported from their respective state machine modules (e.g., `export const epicTransitions: Transition[]`) to enable fitness function enumeration in slice 08." Slice 08 success criteria and verification echo this.

**MIN-7 (Fitness function completeness stated as count match):** RESOLVED. Slice 08 success criterion now reads: "every element of the compile-time-validated `EVENT_TYPES` const array has at least one corresponding test — exhaustiveness coverage, not count match." Verification step 5 matches.

**MIN-8 (Slice 04: partial dependency on slice 03 undocumented):** RESOLVED. Slice 04 scope boundaries now state: "Minimal dependency on slice 03: requires only epic:create and epic:activate. Full phase chain not needed for slice 04 verification. Slice 04 can begin once epic:create + epic:activate are working." Sequencing table row 04 includes the same.

**MIN-9 (Slice 02: --name default untested):** RESOLVED. Success criteria now include: "`cd /tmp/my-project && goodplan init` (no `--name`) — `project.json` has `"name": "my-project"` (basename of cwd default)."

**MIN-10 (Slice 02: conventions.md update absent from verification):** RESOLVED. Verification step 7 added: "Update `.project/conventions.md` to reflect the src/ directory structure established in this slice. No automated test — completed as part of the slice."

**MIN-11 (Sequencing: escape valve note misplaced in slice 08 row):** RESOLVED. Slice 07 table row in `sequencing-refining.md` now includes: "Also serves as escape valve for parallel work if the main 02→06 chain stalls." The escape valve sentence appears to have been moved to slice 07's rationale cell.

All 16 tracked issues from round 2 are resolved.

---

## Issues

**[MINOR]** `sequencing-refining.md`: IMP-9 (slice 02 blocking risk) was resolved by accepting as-is (option a), but no "fallback plan" note was added to the sequencing rationale. The merged.md document called out option (c) — "add a fallback plan note specifying what to do if assembleState() or commitState() implementation stalls" — as the most useful hedge. Without it, if slice 02 stalls, later teams have no documented recovery strategy (deferred work, splitting at a sub-feature boundary, etc.).

This is a minor planning gap, not a verification gap. The slices themselves are correctly defined. But given that slices 03–06 all block on slice 02, a one-sentence fallback note in the sequencing rationale ("If assembleState() or commitState() implementation stalls, the escape valve is [X]") would prevent future confusion.

Resolution: DIRECTLY_ACTIONABLE — Add one sentence to the sequencing rationale under slice 02: "If slice 02 stalls on assembleState or commitState implementation, consider splitting: first deliver the INIT_PROJECT state machine event and all Zod schemas (unblocks slice 03 schema definitions), then complete the tree diff and commitState in a follow-on pass."

**[MINOR]** `goal-refining.md [03-epic-lifecycle]`: Verification step 7 duplicates step 3(b). Step 3(b) already lists all the COMPLETE_* skip-path unit test calls (`reduce(epicWithStatus("created"), { type: "COMPLETE_EXPLORE" })` etc.). Step 7 then repeats: "(Unit test) Test skip paths: `reduce(epicWithStatus("created"), { type: "COMPLETE_EXPLORE" })` → `explored`. Similarly test COMPLETE_ARCHITECTURE…". An implementer will run step 7 and wonder if it's a second independent run or the same test from step 3(b). Duplication in verification steps leads to confusion about whether both must pass independently.

Resolution: DIRECTLY_ACTIONABLE — Remove step 7 and add a forward reference in step 3(b): "These unit tests cover all skip paths — see Success Criteria for the full list." Or, if step 7 is intended as a standalone integration verification pass (distinct from the unit tests inline in the phase chain walk), mark it explicitly as "Repeat skip path unit tests as a standalone test run."

**[MINOR]** `goal-refining.md [04-slice-lifecycle]`: Success criterion "Plan → refine → implement → complete lifecycle succeeds for a single slice" is present but has no inline command sequence — it refers to the full walkthrough in Verification step 3. This is acceptable for a success criterion, but the criterion text itself provides no way to confirm it was checked without re-reading the verification steps. A developer filling out the checklist can only mark this done by mentally cross-referencing step 3. All other criteria in slice 04 are self-contained one-line checks.

This is the last criterion that lacks a concrete expected output in its checklist line. Not critical, but inconsistent with the otherwise executable checklist pattern.

Resolution: DIRECTLY_ACTIONABLE — Either inline a shorthand: "Plan → refine → implement → complete lifecycle succeeds for a single slice — complete step 3 walkthrough without errors" (pointing explicitly to step 3), or split into the concrete sub-criteria already covered by other checklist items (which effectively already document the full path). Either approach resolves the vagueness.

---

## Score: 9/10

All round-2 criticals (0) and importants (9) are fully resolved. All 7 minors are resolved. The remaining 3 issues are all MINOR and DIRECTLY_ACTIONABLE — a sequencing fallback note, a duplicated verification step, and one vague success criterion. None of them create ambiguity about what to build or how to verify it. An implementer reading any slice today could execute the verification steps literally.

What keeps this from 10: the slice 02 fallback note is a genuine planning gap given the serial blocking chain, and the step 7 duplication in slice 03 creates unnecessary confusion during implementation. Both are one-line fixes.

## Summary
- Critical: 0
- Important: 0
- Minor: 3
