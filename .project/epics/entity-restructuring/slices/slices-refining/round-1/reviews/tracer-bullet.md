# Tracer Bullet Quality Review

## Issues

**[CRITICAL]** `goal-refining.md [01-schema-and-state-machine]`: Verification relies entirely on unit tests and grep — no end-to-end runnable path

Slice 01 produces the foundational types and state machine changes but verification is limited to `tsc --noEmit`, `bun test tests/unit/state/`, `bun test tests/unit/schemas/`, and two grep checks. There is no step that exercises the new types through an actual CLI invocation or integration test. The existing integration test `workflow-slice.test.ts` hard-codes flat paths (e.g., `path.join(env.GOODPLAN_DIR, "slices", "new-slice")`) and will break after this slice. The verification section says "fitness tests may need fixture updates — fix any that break" but does not include running the fitness or integration test suites (`bun test tests/fitness/` or `bun test tests/integration/`). This means slice 01 could be "verified" while integration and fitness tests are silently broken, deferring failures to slice 05.

**Fix**: Add `bun test` (full suite) to verification, or at minimum `bun test tests/fitness/` and `bun test tests/integration/`. If integration tests are expected to fail because RPC/commands aren't updated yet, state this explicitly and list which test files will be temporarily broken (with a rationale for deferring to slice 02). The current wording is ambiguous.

Resolution: DIRECTLY_ACTIONABLE

---

**[CRITICAL]** `goal-refining.md [04-skills-update]`: Verification is entirely grep-based — no runnable verification at all

Slice 04 updates 11 skill files. Its verification is three grep commands and "read each updated skill and verify path references are consistent." This is pure content inspection — there is no runnable entry point. The only executable step is `bun run install:skills`, which merely copies files. There is no test that exercises a skill with the new paths. After this slice, the skills reference `epics/<epic>/slices/<name>/` but no verification step confirms the CLI actually produces output matching those paths (that depends on slices 01-02 being correct). This means slice 04 could pass verification while containing path typos or inconsistencies that only surface during actual skill execution.

**Fix**: Add at least one end-to-end smoke test: run `goodplan status --json` (which the skills call) and confirm its output contains nested slice paths that match the patterns the skills expect. Or run `bun run install:skills && grep -r '.project/slices/' ~/.claude/skills/` to verify the installed copies have no stale flat paths. The slice should also run `bun test` to confirm nothing regressed.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [03-context-and-learnings]`: No integration-level verification of context bundling with nested paths

Slice 03 updates context bundling paths and removes `learnings.md` writes. Verification includes `bun test tests/unit/context/` and greps, but no integration check that exercises context bundling through the CLI. The context layer is called by `submit-*` and `complete` commands — the real proof that nested paths work is calling one of these through the binary. Without this, the context unit tests could pass with mocked data while the actual integration fails (e.g., if `priorities.ts` `entityDir()` still returns `slices/${name}` for the actual runtime path).

**Fix**: Add a verification step: `bun run build && goodplan submit-plan --slice test-slice --json` (or similar) in a test fixture, confirming context includes correct nested paths. Alternatively, confirm `bun test tests/integration/` passes.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [02-rpc-and-commands]`: Manual CLI test is underspecified — missing expected output and failure criteria

The verification says "build binary and run manual end-to-end test: `epic:create` -> `slice:create` -> `slice:list` -> `slice:show` -> verify all paths are nested." This is the right idea but lacks specifics: what does "verify all paths are nested" mean concretely? An implementer needs to know: check that `slice:show --json` output contains `"entityDir"` or similar field with `epics/<epic>/slices/<name>` rather than `slices/<name>`. Also, the manual test doesn't specify whether to use `--json` output (machine-parseable) or human output.

**Fix**: Specify: "Run `goodplan slice:show --slice test-slice --json` and confirm the JSON output `paths.plan` contains `epics/test-epic/slices/test-slice/plan.md` (not `slices/test-slice/plan.md`)." Also add `bun test tests/unit/ tests/integration/` to catch regressions. The existing `workflow-slice.test.ts` integration test exercises this exact flow — verify it passes after updating fixture paths.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `goal-refining.md [01-schema-and-state-machine]`: Slice produces unexercised code paths in isolation

The new `epicOverviewSchema` with embedded slices, the `epic` field on `Target`, and the `epic` parameter on helpers like `getSlice(epic, name)` are all created in this slice. But no code in the RPC or commands layer calls them yet with the `epic` parameter (that happens in slice 02). This means slice 01 produces internal API changes that nothing exercises end-to-end until slice 02. The state machine unit tests will exercise the handlers with test events containing `epic`, but the full path from CLI command -> RPC -> state machine -> committed state won't be tested.

This is acceptable for a foundational slice as long as it is explicit. Currently the scope boundaries say "Out of scope: RPC layer, CLI commands" but don't acknowledge that the new helper signatures are unexercised by the CLI in this slice.

**Fix**: Add a note: "The updated helper signatures (`getSlice(epic, name)`, etc.) are exercised only through unit tests in this slice. Full CLI integration is deferred to slice 02." This sets clear expectations.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** `goal-refining.md [05-tests-and-migration]`: Self-migration is a one-shot irreversible operation with no rollback verification

The verification says to self-migrate this repo and check `goodplan status --json`. But if migration has a bug, the `.project/` directory is corrupted with no easy recovery (`.project-old/` exists but the slice doesn't verify you can restore from it). Since this is the final slice, a bug here could leave the repo in a broken state.

**Fix**: Add a verification step: "Before self-migration, verify `.project-old/` backup is created. After migration, verify `diff -r .project-old/slices/ .project/epics/*/slices/` shows only expected path restructuring, no data loss."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Sequencing: No verification step confirms the full end-to-end workflow path across all slices

The sequencing document rationale is sound, but there is no "capstone" verification that exercises the complete tracer bullet: create epic -> create slice -> plan -> refine -> implement -> complete, all using nested paths. The existing `workflow-slice.test.ts` integration test does exactly this but with flat paths. Slice 05 lists `bun test` (full suite) which would catch this, but doesn't explicitly call out "the integration test `workflow-slice.test.ts` is the capstone verification."

**Fix**: In slice 05 verification, add: "Verify `tests/integration/workflow-slice.test.ts` passes — this exercises the full slice lifecycle with nested paths end-to-end."

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The slices have clear scope boundaries and good sequencing rationale. However, tracer bullet quality is weak: slice 01 and 04 lack runnable end-to-end verification, slice 03 has no integration-level check, and slice 02's manual test is underspecified. The plan leans heavily on unit tests and grep checks, which verify internal correctness but don't prove the architecture works end-to-end. To reach 9+: every slice needs at least one verification step that runs actual code through the CLI binary (or integration test suite), and verification steps need concrete expected outputs.

## Summary
- Critical: 2
- Important: 3
- Minor: 2
