# Holistic Review — update-architecture-docs-for-tasks-and-paths (Round 2)

## Issues

**[IMPORTANT]** Phase 2 fitness function task assumes all candidates now have tests — two do not

The plan says "Replace all 'candidate — not yet written' entries with actual test file paths from `tests/fitness/`" for all four per-API docs. This is correct for `state-machine-api.md` (3 candidates, all have tests) and `data-layer-api.md` (5 candidates, all have tests). However:

- `commands-api.md` has 2 candidates: "Read-only commands are read-only" and "Every error produces structured JSON and correct exit code." The first maps loosely to `stateless-commands.test.ts` (which tests INV-004 stateless flags, not strictly read-only behavior). The second has no matching test file.
- `rpc-layer-api.md` has 2 candidates: "Context budget is respected" and "All mutation operations call reduce() before commitState()." Neither has a matching test in `tests/fitness/`.

The plan should distinguish: for `state-machine-api.md` and `data-layer-api.md`, replace all candidates with actual paths. For `commands-api.md`, map "Read-only commands" to `stateless-commands.test.ts` (noting it covers the related INV-004 invariant) and leave "Every error produces structured JSON" as candidate. For `rpc-layer-api.md`, both remain candidates. Otherwise the implementer will either invent incorrect mappings or stall trying to find nonexistent tests.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 after-check for fitness functions only verifies `state-machine-api.md`

The after-check `grep -c 'candidate — not yet written' .project/architecture/state-machine-api.md` returns 0 is correct for that file (all 3 have tests). But the plan also updates fitness functions in `data-layer-api.md`, `commands-api.md`, and `rpc-layer-api.md`. There should be after-checks for all four files. For `commands-api.md` and `rpc-layer-api.md`, the after-check should verify the count decreased (not necessarily to zero, per the IMPORTANT issue above).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 Expected Behavior after-checks do not verify `rpc-layer-api.md` task phases

Phase 1 after-checks verify `commands-api.md`, `state-machine-api.md`, `rpc-layer-api.md`, and `data-model.md`. The `rpc-layer-api.md` check (`grep -c 'create-task' ...`) is present and correct. No issue here on closer inspection — this check is adequate.

Actually, upon re-reading: the after-checks are correct for all four docs. Withdrawing this item.

## Score: 9/10

Round 1 feedback was thoroughly addressed. The plan now: (1) explicitly defers Finding 12 with rationale, (2) correctly specifies per-event type name fixes for `COMPLETE_SLICE` (`LearningInput[]` not `Learning[]`) and `COMPLETE_QUEST`, (3) fixes before-check grep patterns, (4) adds `src/commands/task/` and task transitions/schemas to the conventions.md task, (5) fixes the skills count verification to exclude `_shared/`, (6) explicitly states stale flat slice entries should be removed entirely. The one remaining important issue is the fitness function test mapping — 4 of 12 candidates across the per-API docs do not have matching test files, and the plan instructs replacing all of them.

## Summary
- Critical: 0
- Important: 1
- Minor: 1
