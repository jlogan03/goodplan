# Tracer Bullet Quality Review — Round 2

## Issues

**[IMPORTANT]** `goal-refining.md [04-skills-update]`: Verification still lacks a runnable proof that skill paths are correct at runtime

Round 1 flagged that slice 04 had no runnable verification. The fix added `bun run install:skills`, grep checks on installed copies, and `bun test`. These are real improvements — the grep checks are concrete and falsifiable. However, the fundamental tracer bullet gap remains partially open: no verification step confirms that a skill, when invoked, actually resolves the new nested paths correctly at runtime. The greps prove the string `.project/slices/` is absent and the string `epics/<epic>/slices/` is present, but they cannot catch semantic errors (e.g., a skill referencing `$EPIC_NAME` that doesn't resolve, or a `goodplan status --json` call whose output format the skill misparses). Since skills are markdown content files (not compiled code), this is lower severity than round 1 — the grep checks catch the most likely class of bug (stale flat paths). But one executable smoke check would close the gap entirely.

**Fix**: Add a verification step: after `bun run install:skills`, run `goodplan status --json` in a project with an active epic+slice and confirm the JSON output contains nested slice paths matching what skills expect (e.g., `epics/<epic>/slices/<name>` appears in entity paths). This proves the CLI output the skills will consume is structurally correct.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [01-schema-and-state-machine]`: "Verify `reduce()` produces state trees with slices under `epics/<epic>/slices/`" is concrete but could specify the assertion more precisely

The verification step says "run a test case and inspect output" — this is a real improvement from round 1 (which had no such step). The step is runnable and falsifiable: you run a state machine test and check that output paths contain `epics/<epic>/slices/<name>/`. However, "inspect output" is slightly ambiguous — does the implementer grep the test output, add an explicit assertion to a test, or visually read it? A small tightening would remove ambiguity.

**Fix**: Rephrase to: "Add an assertion in a `reduce()` test case that the output state tree contains a key matching `epics/*/slices/*/slice.json` and does NOT contain `slices/*/slice.json` at top level."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [03-context-and-learnings]`: Integration test step added but doesn't specify which integration tests exercise context bundling

Round 1 flagged missing integration verification. The fix added `bun test tests/integration/` which is a concrete runnable step. Good. However, the slice doesn't clarify which integration tests actually exercise context bundling with nested paths. If all integration tests pass but none happen to test context bundling for slices (because `workflow-slice.test.ts` is updated in slice 05), the verification gives false confidence. The grep check (`grep -r '"slices/' src/core/context/` — zero matches) is a strong backstop for the most likely failure mode.

**Fix**: Add a note: "If `tests/integration/workflow-slice.test.ts` doesn't yet exercise nested context paths (updated in slice 05), the grep check and unit tests are the primary verification. Full context integration is validated in slice 05."

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The round 1 critical issues (weak verification) have been substantively addressed. Every slice now has concrete runnable verification steps: `tsc --noEmit`, specific test suite commands, grep checks with expected match counts, `bun test` full suite runs, manual CLI end-to-end flows with specified expected output, and `reduce()` output inspection. Slice 02 now specifies concrete CLI commands with expected output fields. Slice 05 now calls out `workflow-slice.test.ts` as the capstone test and includes a rollback procedure with `diff -r` verification. The one remaining gap is slice 04's lack of a runtime smoke test beyond grep, which is IMPORTANT but not CRITICAL given skills are content files where grep catches the primary failure mode. To reach 10: close the slice 04 runtime gap and tighten the slice 01 `reduce()` assertion wording.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
