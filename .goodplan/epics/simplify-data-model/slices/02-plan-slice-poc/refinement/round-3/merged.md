# Merged Feedback — Plan-Slice PoC (Round 3)

Reviewers: holistic (9/10), software-architecture (8/10), agent-skill (9/10), typescript (9/10)

## CRITICAL Issues

None.

## IMPORTANT Issues

### IMP-1: Document WHY `slice:refine-plan` is required before `submit-refinement`
**Source:** software-architecture

The plan correctly calls `gp slice:refine-plan` before `submit-refinement`, but doesn't explain why. Without it, a failing score on `submit-refinement` from `plan-created` would trigger `STATE_INVALID_TRANSITION` (no transition row exists for `plan-created` + `COMPLETE_REFINEMENT_ROUND` on fail). Implementers may try to "simplify" by removing the call. Add a comment explaining the STATE_INVALID_TRANSITION risk.

Resolution: DIRECTLY_ACTIONABLE

### IMP-2: Resolve `verifyNoArtifactReads` vs `verifyOrchestratorDiscipline` naming inconsistency
**Source:** software-architecture, typescript (corroborating)

Phase 4 uses `verifyNoArtifactReads` throughout (lines 171, 174, 191, 204) but the codebase research doc (line 43) references `verifyOrchestratorDiscipline`. The plan should also clarify the relationship to the existing `checkViolation()` in `utils.ts` (which protects CLI state integrity on `.goodplan/*.json`), noting the new function complements it (context discipline vs state integrity). Pick one name and use it consistently.

Resolution: DIRECTLY_ACTIONABLE — use `verifyNoArtifactReads` (already dominant in plan text) and add a note that it complements `checkViolation()`.

### IMP-3: Agent definitions lack explicit sub-agent tool restrictions
**Source:** agent-skill

Phase 1 creates 7 agent `.md` files but none specify allowed tools. Architecture requires "no AskUserQuestion" and "no sub-agent spawning (flat hierarchy)" for sub-agents. These must be enforced at spawn time via tool restriction lists (e.g., reviewers: `["Read", "Grep", "Glob", "Write"]`). Add a Phase 3 task specifying `allowedTools` for each agent category.

Resolution: DIRECTLY_ACTIONABLE

### IMP-4: Clarify which score channel drives refinement exit decisions
**Source:** agent-skill

Reviewers both write to output files AND return JSON with scores. Synthesis agent reads reviewer files and returns aggregate score. The plan doesn't clarify which source the orchestrator uses for exit condition evaluation. Clarify: orchestrator should use ONLY the synthesis agent's return for exit decisions; individual reviewer returns are logged but not parsed for exit logic.

Resolution: DIRECTLY_ACTIONABLE

### IMP-5: `gp start-plan` return shape not specified
**Source:** agent-skill

Phase 3 depends on `gp start-plan --slice <name> --json` output but never names the expected fields (e.g., `architectureFiles`, `goal`, `conventions`). The plan-phase agent's task prompt can't be validated against the actual CLI output without this.

Resolution: CODEBASE_EXPLORATION — read `src/commands/subagent/start-plan.ts` to document the `ContextBundle` fields.

## MINOR Issues

### MIN-1: `@` reference validation should also warn on bare relative `@` references
**Source:** holistic, software-architecture (corroborating on regex)

Phase 2 validates `@${CLAUDE_PLUGIN_ROOT}/...` references but would miss bare relative `@` references (e.g., `@./path/to/file.md`). Add a secondary check warning on `@` references that don't use the prefix. Software-architecture also notes the extraction regex should be specified: `@\$\{CLAUDE_PLUGIN_ROOT\}/[^ )\n]+` or similar.

Resolution: DIRECTLY_ACTIONABLE

### MIN-2: `start-plan` vs `slice:plan` naming confusion
**Source:** holistic

These are different commands (`slice:plan` transitions status, `start-plan` assembles context) but names are similar. Add a parenthetical note at first usage of `start-plan` clarifying the distinction.

Resolution: DIRECTLY_ACTIONABLE

### MIN-3: Phase 1 architecture update task references stale line 69
**Source:** software-architecture

Task says to update `_overview.md` at ~line 69 and ~line 135. Line 69 is already correct (describes `@` reference mechanism). Only line 135 needs updating (still references `skills:` frontmatter). Remove line 69 from the task.

Resolution: DIRECTLY_ACTIONABLE

### MIN-4: Sub-agent return format "maintained in sync" lacks concrete sync mechanism
**Source:** software-architecture

Dual representation (markdown + TypeScript schema) specified, but no mechanism ensures they stay in sync. Acceptable for Experimental maturity. Add a note suggesting a future build-time check; for now, co-location in same commit + linking code comment is sufficient.

Resolution: DIRECTLY_ACTIONABLE

### MIN-5: 500-line agent body check — pre- or post-expansion?
**Source:** agent-skill

Agent bodies use `@` references that expand at load time. Clarify that the 500-line check applies to the source file (pre-expansion), since `@` references ARE progressive disclosure.

Resolution: DIRECTLY_ACTIONABLE

### MIN-6: No error handling for `@` reference content validity at runtime
**Source:** agent-skill

Build-time validation catches missing references, but not empty/malformed content. Add self-identifying headers (e.g., `# Review Preamble`) to each `@` reference file for spot-check in test logs.

Resolution: DIRECTLY_ACTIONABLE

### MIN-7: PARTIAL status handling may be overscoped for PoC
**Source:** agent-skill

Phase 3 includes PARTIAL status handling (continuation files, research agent spawning). Consider marking as optional/deferred — PoC agents should return COMPLETE or ERROR only.

Resolution: DIRECTLY_ACTIONABLE

### MIN-8: Model override mechanism not specified
**Source:** typescript

Plan verifies `--model` override takes precedence but doesn't specify the mechanism. The existing pattern uses `systemPrompt.append`. Add a task note referencing this pattern.

Resolution: DIRECTLY_ACTIONABLE

## Contradictions Resolved

1. **`verifyNoArtifactReads` naming:** typescript reviewer says "No action needed — the plan itself is consistent" while software-architecture flags it as IMPORTANT due to the research doc inconsistency and missing relationship to `checkViolation()`. Resolved: the naming within the plan IS consistent, but the relationship to `checkViolation()` and stale research doc reference should be cleaned up. Kept as IMPORTANT (IMP-2).

2. **`slice:refine-plan` necessity:** software-architecture initially questions whether it's redundant, then self-corrects mid-review confirming it IS required. No contradiction with other reviewers — all agree the call is correct. Elevated to IMPORTANT only for the missing rationale comment.

## Unresolved (USER_INPUT required)

None. All issues are DIRECTLY_ACTIONABLE or CODEBASE_EXPLORATION.

## DIRECTLY_ACTIONABLE Summary

| ID | Fix |
|---|---|
| IMP-1 | Add comment explaining why `slice:refine-plan` is required (STATE_INVALID_TRANSITION risk) |
| IMP-2 | Standardize on `verifyNoArtifactReads`, note relationship to `checkViolation()` |
| IMP-3 | Add `allowedTools` spec per agent category in Phase 3 |
| IMP-4 | State that orchestrator uses only synthesis agent return for exit decisions |
| IMP-5 | Read `start-plan.ts`, document `ContextBundle` fields in plan |
| MIN-1 | Add bare `@` reference warning + specify extraction regex |
| MIN-2 | Add clarifying note distinguishing `start-plan` from `slice:plan` |
| MIN-3 | Remove line 69 from architecture update task (already correct) |
| MIN-4 | Add note about future sync mechanism; co-locate + comment for now |
| MIN-5 | Clarify 500-line check is pre-expansion (source file) |
| MIN-6 | Add self-identifying headers to `@` reference files |
| MIN-7 | Mark PARTIAL handling as optional/deferred for PoC |
| MIN-8 | Reference `systemPrompt.append` pattern for model override |
