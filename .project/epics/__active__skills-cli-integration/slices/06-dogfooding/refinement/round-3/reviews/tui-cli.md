## Issues

**[CRITICAL]** `epic:add-verification` stdin payload uses wrong schema in both Phase 2 and Phase 4

Both phases construct the stdin payload as:
```bash
echo '{"description":"...","command":"..."}' | goodplan epic:add-verification --epic <name> --json
```

The actual `addVerificationInputSchema` in `src/schemas/commands/epic.ts` requires:
```json
{"verification": {"description": "...", "status": "pending", "addedDuring": "<scope>", "modifiedDuring": null}}
```

Three problems: (1) missing the `verification` wrapper object, (2) includes a `command` field that does not exist in `verificationSchema`, (3) omits required fields `status`, `addedDuring`, and `modifiedDuring`. This will fail with exit code 2 (`VALIDATION_INVALID_INPUT`) on every invocation, blocking epic activation in both phases.

Fix: Replace the `epic:add-verification` commands in Phase 2 (line 40) and Phase 4 (line 35) with the correct payload shape. For Phase 2:
```bash
echo '{"verification":{"description":"All slices pass bun tsc --noEmit and tests","status":"pending","addedDuring":"slices","modifiedDuring":null}}' | goodplan epic:add-verification --epic core-provider --json
```
For Phase 4, same structure with the llm-judge description. The `addedDuring` value should reflect the current workflow phase (e.g., `"slices"` since verifications are added after slicing).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4 missing `/refine-architecture` step -- will fail at `BEGIN_SLICING`

Phase 4's "Exploration & Architecture Proposal" section runs `/create-architecture` but does not run `/refine-architecture`. The state machine requires `architecture-refined` status for `BEGIN_SLICING` (guarded in `epic-phase.ts:110`). After `/create-architecture` completes (via `submit-architecture`), the epic will be in `architecture-defined` status. The next step (`/create-slices`) triggers `BEGIN_SLICING` which requires `architecture-refined`, producing exit code 3 (`STATE_INVALID_TRANSITION`).

Phase 2 correctly includes `/refine-architecture` between `/create-architecture` and `/create-slices`. Phase 4 omits it.

There is a skip path: `COMPLETE_REFINE_ARCHITECTURE` can be called from `architecture-defined` status (epic-refine.ts:137), but this requires explicitly invoking `/refine-architecture` (or `submit-refine-architecture`) even if with a single pass. The skip simply means `BEGIN_REFINE_ARCHITECTURE` is not needed first -- `COMPLETE_REFINE_ARCHITECTURE` directly from `architecture-defined` is valid.

Fix: Add a `/refine-architecture` task in Phase 4 between "Approve architecture manually" and "Slicing". This also provides an additional friction discovery opportunity for the second-epic architecture refinement flow.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 "Check status" after architecture says "verify `architectureDefined` transitions" but does not specify the expected field path or values

Line 30 says: `goodplan status --json` -- verify `architectureDefined` transitions. This is vague -- `architectureDefined` is on `epic:show --json` under `artifacts.architectureDefined`, not on `status --json`. Should specify: run `goodplan epic:show --epic core-provider --json` and verify `artifacts.architectureDefined === true` after `/create-architecture` completes.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 5 cross-skill grep pattern may produce false positives on valid patterns

The grep commands in Phase 5 include patterns like `mkdir -p .project/` and `cat .project/`. The `mkdir` pattern would match any skill that creates subdirectories for LLM-owned content (which skills ARE allowed to do per convention doc section 3 -- "Write LLM-owned markdown files into paths returned by CLI command responses"). Skills that `mkdir -p` within a path returned by a CLI mutation response are not violating conventions. The grep should be scoped more precisely to catch only `mkdir -p .project/epics/` or `mkdir -p .project/slices/` (entity directory creation), not all `.project/` directory creation.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

Round-2 critical issues (epic activation sequencing, missing `slice:plan`/`quest:plan` transitions, Phase 1 activeEpic assertion) are all correctly addressed. The overall lifecycle flow is now correct in Phase 2. However, Phase 4 has a new important issue (missing `/refine-architecture`), and both phases have a critical payload schema mismatch on `epic:add-verification` that will block activation. Fixing the verification payload schema and adding the missing architecture refinement step in Phase 4 would bring this to 9+.

## Summary
- Critical: 1
- Important: 1
- Minor: 2
