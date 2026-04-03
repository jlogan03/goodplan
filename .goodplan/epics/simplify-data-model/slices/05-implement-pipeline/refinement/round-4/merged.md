# Merged Feedback — Round 4

**Scores:** software-architecture 9/10 | agent-skill 9/10
**Issues:** Critical: 0 | Important: 0 | Minor: 5 (6 raised, 1 confirmed no-action)

All round-3 CRITICAL and IMPORTANT issues are resolved. The plan is ready for implementation with the minor fixes below applied.

---

## Issues

**[MINOR-1] `submitImplementationInputSchema` not updated for `--phase` flag** *(software-architecture)*

Phase 2 task 4 adds `--phase` to `submit-implementation` but does not mention updating `submitImplementationInputSchema` in `src/schemas/commands/submit.ts`. Without this, the flag will either be silently ignored or cause a runtime validation error.

Fix: Add to Phase 2 task 4 — "Update `submitImplementationInputSchema` in `src/schemas/commands/submit.ts` to add an optional `phase` integer field, and update `src/commands/subagent/submit-implementation.ts` to emit `UPDATE_IMPLEMENTATION_PHASE` when `--phase` is provided."

---

**[MINOR-2] `UPDATE_IMPLEMENTATION_PHASE` not added to `StateEvent` discriminated union** *(software-architecture)*

The plan specifies the transition handler and guards but does not call out adding the new event to the `StateEvent` union in `src/schemas/state-events.ts`. Omitting this causes a TypeScript compile error.

Fix: Add to Phase 2 task 4 — "Add `{ type: 'UPDATE_IMPLEMENTATION_PHASE'; epic: string; slice: string; phase: number; ts: string }` to the `StateEvent` union in `src/schemas/state-events.ts`."

---

**[MINOR-3] Verification grep scope excludes architecture directory where stale references live** *(agent-skill)*

Phase 1 task's verification step runs `grep -r "completion-phase" agents/ skills/` — this excludes `.goodplan/epics/simplify-data-model/architecture/` where `skill-model-api.md` and `conventions.md` live. The grep would pass even if those files still contain the stale reference.

Fix: Extend grep to `grep -r "completion-phase" agents/ skills/ .goodplan/epics/simplify-data-model/architecture/` or use repo-wide scope `grep -r "completion-phase" --include="*.md" .`.

---

**[MINOR-4] `editor_prompt_path` terminology not explained for `implement` loop** *(agent-skill)*

The Loop Parameters section sets `editor_prompt_path: agents/implement-phase.md`. Callers of `iteration-loop.md` (e.g., plan-slice) use a dedicated `editor.md`; here `implement-phase` doubles as the editor. This is architecturally correct but potentially confusing to readers.

Fix: Add a comment in the Loop Parameters section clarifying that `implement-phase` serves as the editor agent for implementation loops — it is re-spawned with merged feedback rather than a separate editor agent applying diffs.

---

**[MINOR-5] `complete-epic` forward-compat gate for missing `reconsiderWhen`/`validUntil` fields underspecified** *(agent-skill)*

Phase 5 complete-epic Step 4 says to verify these fields are present before relying on them, but does not specify behavior when they are absent. The established pattern from `plan-slice` SKILL.md and `conventions.md` is: "If entries lack these fields, skip condition evaluation in step 4c entirely."

Fix: Add explicit gate language to Phase 5 Step 4 matching the `plan-slice` forward-compat pattern, and reference `plan-slice` SKILL.md as the precedent so the implementer follows the established pattern.

---

## Confirmed Resolved (no action needed)

**`completion-slice`/`completion-epic` agent `reconsiderWhen`/`validUntil` ownership** *(agent-skill)*: Condition evaluation is correctly driven by what the orchestrator includes in the task prompt. The `complete-epic` skill Step 4 passes conditions from `$GP decision:list --json` and `$GP learning:list --json`. No structural gap — pattern is sound.

---

## Round-3 Fix Verification

All round-3 issues correctly resolved:

- Guard semantics: all four conditions specified (status guard, monotonic increment, `BEGIN_IMPLEMENTATION` init to 0, historical preservation). Correct.
- Completion-phase reference cleanup: Phase 1 task 4 includes grep with expected 0 hits. Correct (scope fix needed per MINOR-3 above).
- Architecture references: plan now enumerates all three locations (`skill-model-api.md` line 24, line 119, `conventions.md` line 58). Correct.
- `implementationPhase` data model: `UPDATE_IMPLEMENTATION_PHASE` specified with explicit guards and correct `subagent/` namespace placement. Correct (union and schema registration gaps noted as MINOR-1 and MINOR-2).
- reviewer-registry directory: Phase 3 explicitly creates `skills/implement/references/`. Correct.
- Trigger phrases: all required phrases present for `implement` and `complete-epic` skills. Correct.
- Re-entry fixture CLI invocation: exact invocation specified with verify-first instruction. Correct.
- `cp -n` artifact promotion: Phase 5 Step 6 uses `cp -n` with idempotency note. Correct.
