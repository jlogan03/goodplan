# Session Briefing: Epic Complete + Verification Needed

**Date:** 2026-04-13
**Branch:** `epic/workflow-bug-fixes`
**Status:** Epic fully implemented, v1 retired, architecture gaps closed. Needs verification.

## What Was Done This Session

### Slices 10-12 Implemented
- **Slice 10 (slice-execution-skills):** plan-slice v2, implement-slice, land-slice. ConvergenceRubric type reconciliation, --rubric-path on refine commands, new agents (verifier-phase, completion-side-quest), iteration-loop.md $SCOPE_FLAG.
- **Slice 11 (supporting-skills):** create-side-quest v2 (ContentRef, no explore), implement-side-quest (simplified chunks), land-side-quest (learning:capture), audit v2.
- **Slice 12 (migration):** Wired existing rpcMigrate into gp migrate command, added v2 event generation from migrated state (bulk write, INV-001 exception).

### V1 Code Retired
- Deleted: src/commands/quest/ (9), src/commands/subagent/ (16), src/core/state/ (25), src/core/rpc/ (9 of 11), src/schemas/state-events.ts, plugin/skills/implement/, 6 v1 decision/task/learning commands, 35+ test files.
- **24,345 lines deleted**, v1 state machine completely gone.

### Architecture Fidelity Gaps Closed (side quest)
- **CRITICAL:** evaluateConvergence() now mechanically enforces rubric thresholds. Reviewers provide {name, score} only — no passed field, no threshold knowledge. Evaluator decides pass/fail.
- **CRITICAL:** gp verify rewritten for v2 event log (JSON validity, schema conformance, prevId chains, ContentRef SHAs, schemaVersion monotonicity).
- **IMPORTANT:** Evaluator unified with circuit breaker (returns CIRCUIT-BROKEN). DimensionResult enriched with reviewerId + relevance. ReviewerFinding gains location field.
- **IMPORTANT:** 6 new reviewer agents created (invariant-checker, context-transport, plan, verification-plausibility, goal, slice-set).
- **IMPORTANT:** Spine file hook protection, verifier renamed to verifier-phase, event schemas for 3 missing domains.

### Current State
- **1750 tests pass, 0 fail**
- Build clean, all pushed to `epic/workflow-bug-fixes`
- Rubric thresholds all set to 9, max_rounds to 8

## What Needs To Happen Next: Verification

The v2 system is built but needs systematic verification that the architecture is faithfully implemented and working. Three levels:

### 1. Architecture Fidelity Fitness Test (automated, CI)
Create `tests/fitness/architecture-fidelity.test.ts` that programmatically verifies:
- Every command listed in `.goodplan/epics/workflow-bug-fixes/architecture/commands.md` exists in `src/commands/main.ts`
- Every reviewer listed in `trust.md` exists in `plugin/agents/`
- Every event type in the domain catalog has a Zod payload schema in `src/schemas/events/`
- The evaluator actually reads the rubric parameter (not underscore-prefixed)
- `gp verify` checks all 5 specified properties (JSON validity, schema conformance, prevId chains, ContentRef SHAs, schemaVersion monotonicity)
- Reviewer frontmatter has `rubric_ref` pointing to an existing rubric file
- All always-on reviewers exist and are registered in the routing function

This prevents future drift between architecture docs and implementation.

### 2. Trust Substrate Integration Test
Create a focused test that verifies the convergence gate works mechanically with real rubrics:
- Load a real rubric YAML (e.g., holistic.yaml)
- Create scored events with scores below threshold → verify CONTINUE
- Create scored events with scores at/above threshold → verify CONVERGED
- Create stuck findings across rounds → verify CIRCUIT-BROKEN (stuck-finding)
- Create round budget exceeded → verify CIRCUIT-BROKEN (round-budget-exceeded)
- Create reviewer disagreement → verify CIRCUIT-BROKEN (reviewer-disagreement)
- Verify low-relevance reviewers don't block convergence
- Verify DimensionResult includes correct reviewerId, relevance, threshold, passed

### 3. Full V2 Pipeline E2E (real-world dogfood)
Run the built plugin (not installed) through a complete workflow cycle on a real project:
- Create epic → plan slice → implement → land (or use existing dogfood patterns)
- Verify events are emitted correctly at each phase
- Verify convergence gates fire during refinement
- Verify the entire system works end-to-end

### Key Files for Context
- Architecture: `.goodplan/epics/workflow-bug-fixes/architecture/` (8 files)
- Evaluator: `src/trust/convergence/evaluator.ts` (just rewritten)
- Verify: `src/commands/global/verify.ts` (just rewritten)
- Reviewer registry: `src/trust/reviewers/`
- Rubrics: `plugin/rubrics/*.yaml`
- Existing dogfood tests: `tools/dogfood/test-*.ts`
- Existing fitness tests: `tests/fitness/`
