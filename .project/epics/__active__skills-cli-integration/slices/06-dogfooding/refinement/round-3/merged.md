# Merged Feedback — Round 3

## Critical

### C1: `epic:add-verification` stdin payload uses wrong schema (Phase 2 & Phase 4)
**Source: tui-cli**

Both phases construct the payload as `{"description":"...","command":"..."}` but `addVerificationInputSchema` requires:
```json
{"verification": {"description": "...", "status": "pending", "addedDuring": "<scope>", "modifiedDuring": null}}
```

Three problems: (1) missing `verification` wrapper, (2) includes nonexistent `command` field, (3) omits required `status`, `addedDuring`, `modifiedDuring`. Will fail with exit code 2 (`VALIDATION_INVALID_INPUT`) on every invocation, blocking epic activation in both phases.

Fix: Replace both `epic:add-verification` payloads. Phase 2 example:
```bash
echo '{"verification":{"description":"All slices pass bun tsc --noEmit and tests","status":"pending","addedDuring":"slices","modifiedDuring":null}}' | goodplan epic:add-verification --epic core-provider --json
```
Phase 4: same structure with the llm-judge description.

Resolution: DIRECTLY_ACTIONABLE

---

## Important

### I1: Phase 4 missing `/refine-architecture` — will fail at `BEGIN_SLICING`
**Source: holistic, tui-cli** (independently identified by both)

Phase 4 runs `/create-architecture` but never runs `/refine-architecture`. `BEGIN_SLICING` guards on `architecture-refined` status (`epic-phase.ts:110`). After `/create-architecture`, the epic is in `architecture-defined` — calling `/create-slices` will fail with exit code 3 (`STATE_INVALID_TRANSITION`). Phase 2 correctly includes `/refine-architecture`; Phase 4 omits it.

Fix: Add a `/refine-architecture` task in Phase 4 between "Approve architecture manually" and "Slicing." This also provides additional friction discovery for the second-epic refinement flow.

Resolution: DIRECTLY_ACTIONABLE

### I2: Phase 4 `approved.md` described with more authority than it has
**Source: software-architecture**

The task says "write `approved.md` in the epic's architecture directory" implying CLI significance, but the CLI state machine has no guard checking for this file. `COMPLETE_ARCHITECTURE` is unconditional. The `approved.md` file is a human-readable marker only, not consumed by the CLI or any guard.

Fix: Clarify that `approved.md` is a human-readable marker only. The skill handles the `COMPLETE_ARCHITECTURE` transition via `submit-define-architecture`.

Resolution: DIRECTLY_ACTIONABLE

### I3: Phase 2 should note skill re-entry after interruption as a friction discovery vector
**Source: agent-skill**

The `/refine-plan` skill uses `start-refinement` and `submit-refinement` with a `scores` payload for the circuit breaker. If interrupted mid-refinement, re-entry behavior depends on CLI state (`plan-created` vs `plan-refining`). `cli-interaction.md` section 10 documents `STATE_INVALID_TRANSITION` recovery for re-entry, but this has never been exercised end-to-end.

Fix: Add a note to Phase 2 Planning & Implementation: "If a skill session is interrupted during refinement, re-enter and observe recovery behavior. Log any issues — skill re-entry is a key friction discovery vector."

Resolution: DIRECTLY_ACTIONABLE

---

## Minor

### M1: Phase 2 "Capture dogfooding learnings" does not specify mechanism
**Source: holistic**

The `/complete` skill writes to the nondet-eval repo's learnings, not the goodplan dogfooding log. Make explicit: "Manually append Phase 2 friction and learnings to the goodplan repo's friction-log.md."

Resolution: DIRECTLY_ACTIONABLE

### M2: Phase 3 deliberate quest fallback condition is vague
**Source: holistic**

"If insufficient organic quests" has no threshold. Change to: "if no organic quests were created from Phase 2 output."

Resolution: DIRECTLY_ACTIONABLE

### M3: Phase 3 deliberate quest omits `/refine-plan` without explanation
**Source: agent-skill**

Deliberate quest says `/create-plan` -> `/implement-plan` -> `/complete`, omitting `/refine-plan`. Organic quests include it. Either add `/refine-plan` or note: "Skip `/refine-plan` for the deliberate quest if small enough — this tests the direct plan-to-implement path."

Resolution: DIRECTLY_ACTIONABLE

### M4: Phase 4 no explicit check that second epic sees existing learnings
**Source: holistic**

Add a verification sub-item: "After `/explore`, check that the exploration output references or builds on first-epic learnings and existing architecture."

Resolution: DIRECTLY_ACTIONABLE

### M5: Phase 1 skill count says "14 skills" but conventions.md lists 15
**Source: software-architecture**

Say "15 skill directories (including the `migrate/` stub) plus `_shared/`" or "14 active skills plus the `migrate/` stub plus `_shared/`."

Resolution: DIRECTLY_ACTIONABLE

### M6: Phase 2 exploration section lacks explicit CLI transition note
**Source: software-architecture**

Other sections include explicit CLI commands; exploration does not. Add: "The `/explore` skill internally calls `goodplan epic:explore` and `goodplan submit-explore`. Verify via `goodplan epic:show --epic core-provider --json` that status progresses through `exploring` -> `explored`."

Resolution: DIRECTLY_ACTIONABLE

### M7: Phase 2 "Check status" after architecture uses wrong command
**Source: tui-cli**

Line 30 says `goodplan status --json` — verify `architectureDefined` transitions. But `architectureDefined` is on `epic:show --json` under `artifacts.architectureDefined`, not `status --json`. Fix the command reference.

Resolution: DIRECTLY_ACTIONABLE

### M8: Phase 5 cross-skill grep patterns need refinement
**Source: holistic, software-architecture, tui-cli, agent-skill** (all touched on this)

Multiple reviewers noted: (a) broader grep task lists patterns in prose without a concrete command, (b) `mkdir -p .project/` may false-positive on valid skill operations, (c) `--exclude-dir` matches basenames not paths. Fix: provide concrete second grep command, scope `mkdir` pattern to entity directories only, and add a note that results should be manually inspected before marking as failures.

Resolution: DIRECTLY_ACTIONABLE

### M9: Phase 1 user-level skill install lacks rollback guidance
**Source: agent-skill**

`bun run install:skills` overwrites user-level skills globally. Add a note: "If user-level skill bugs are discovered, fix in `skills/` and re-run `bun run install:skills`. Git history serves as rollback."

Resolution: DIRECTLY_ACTIONABLE

---

## Score: 8/10

Composite across 4 reviewers. All round-2 critical and important issues confirmed resolved. One new critical (verification payload schema) will block both phases at runtime. Three important issues: missing `/refine-architecture` in Phase 4 (state machine guard violation), `approved.md` wording, and re-entry testing gap. Nine minor issues are clarity/completeness refinements. Fixing C1 and I1 is essential; the rest improves precision.

## Summary
- Critical: 1
- Important: 3
- Minor: 9
