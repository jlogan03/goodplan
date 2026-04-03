# Agent Skill Review — Round 4

Plan: `/Users/iwhite/Repos/goodplan/.goodplan/epics/simplify-data-model/slices/05-implement-pipeline/plan-refining.md`

## Issues

**[MINOR] Architecture spec still shows stale `completion-phase.md` row — plan enumerates the right files but verification grep scope is too narrow**

The plan's Phase 1 task now explicitly enumerates all three locations to update:
- `skill-model-api.md` line 24 (the Standalone Skills table description referencing `completion-phase`)
- `skill-model-api.md` line 119 (the Agent Definitions table row)
- `conventions.md` line 58 (`reconsiderWhen` ownership list)

This correctly addresses the round-3 IMPORTANT issue. However, the verification step says: run `grep -r "completion-phase" agents/ skills/` — this scope excludes `.goodplan/epics/simplify-data-model/architecture/` where `skill-model-api.md` and `conventions.md` live. The grep command would pass even if those files still contain the stale reference. Recommend: extend the grep to include the architecture directory: `grep -r "completion-phase" agents/ skills/ .goodplan/epics/simplify-data-model/architecture/` or use repo-wide scope `grep -r "completion-phase" --include="*.md" .`.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 `completion-slice` and `completion-epic` agents: `reconsiderWhen`/`validUntil` ownership not updated in agent bodies**

The plan updates `conventions.md` to replace `completion-phase` with `completion-slice` and `completion-epic` in the ownership list. The agent bodies for `completion-slice.md` and `completion-epic.md` must instruct the agents to *evaluate* those conditions — but the plan's agent task descriptions (Phase 1) only mention that agents "evaluate `reconsiderWhen` and `validUntil` conditions when provided in task prompt." This is consistent with the established pattern (condition evaluation is driven by what the orchestrator includes in the task prompt), so no gap here structurally. However, the `completion-epic` agent receives all slice learnings paths and is expected to also evaluate `validUntil` on those learnings. The plan says the `complete-epic` skill Step 4 passes `reconsiderWhen`/`validUntil` conditions from `$GP decision:list --json` and `$GP learning:list --json`. This is correct. No action needed — this is an observation confirming the fix is sound.

Resolution: DIRECTLY_ACTIONABLE (no change needed — noting resolution confirmed)

**[MINOR] Phase 2 Loop Parameters section: `editor_prompt_path` points to `agents/implement-phase.md` — this is an agent definition, not an editor sub-agent**

The Loop Parameters section (item 5) sets `editor_prompt_path: agents/implement-phase.md`. The `iteration-loop.md` shared reference defines `editor_prompt_path` as "Path to the editor sub-agent prompt" — typically the `editor.md` agent that applies review feedback by editing files. In the implement loop, the "editor" role is filled by re-spawning `implement-phase` with the merged feedback path. This is architecturally correct (the implement agent IS the editor for implementation loops), but the terminology is potentially confusing: `iteration-loop.md` callers (e.g., plan-slice) use `editor.md` for the editor role. The plan should clarify in the Loop Parameters section that `implement-phase` doubles as the editor agent for this skill — the distinction matters for anyone reading the Loop Parameters to understand how the loop differs from refinement loops. This is a documentation clarity issue, not a structural one.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 5 complete-epic Step 4: plan instructs to verify `$GP decision:list --json` and `$GP learning:list --json` return `reconsiderWhen`/`validUntil` fields before relying on them — but the verification approach is underspecified**

The plan says "Verify these commands exist and return `reconsiderWhen`/`validUntil` fields before relying on them — run each with `--json` and confirm the expected fields are present in the output schema." This is good forward-compat thinking. However, the plan doesn't specify what the skill should do if the fields are absent (pre-slice-03 environment). The `plan-slice` skill handles this identically: "Gate the filtering: if entries lack these fields, skip condition evaluation in step 4c entirely." The `complete-epic` skill should use the same gate language. The existing `conventions.md` and `plan-slice` SKILL.md both document the forward-compat pattern — the plan should reference it explicitly so the implementer follows the established pattern rather than inventing a new one.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All round-3 issues have been correctly addressed:

- **IMPORTANT #1 (architecture references)**: Fixed — plan now enumerates all three locations (`skill-model-api.md` line 24, line 119, and `conventions.md` line 58). The only remaining concern is the verification grep scope, which is a minor fix.

- **IMPORTANT #2 (`implementationPhase` data model)**: Fixed cleanly — the plan now specifies `UPDATE_IMPLEMENTATION_PHASE` with explicit guards (`implementing`-only, monotonic value constraint), `BEGIN_IMPLEMENTATION` initialization, and correctly places the command in the `subagent/` namespace as a `--phase` flag on `submit-implementation`.

- **MINOR #1 (destination path for reviewer-registry)**: Fixed — the plan now specifies creating `skills/implement/references/` as the destination.

- **MINOR #2 (trigger phrases)**: Fixed — the plan now includes "implement", "execute plan", "build slice", "complete slice" for `implement` skill, and "complete epic", "finish epic", "epic completion", "close epic", "wrap up epic" for `complete-epic` skill, matching the architecture spec.

- **MINOR #3 (re-entry fixture CLI invocation)**: Fixed — the plan now specifies the exact invocation: `$GP submit-implementation --slice <name> --phase 1` with a note to verify the command succeeds before proceeding.

The remaining four issues are all MINOR clarifications. The plan is ready for implementation with these small fixes applied.

## Summary
- Critical: 0
- Important: 0
- Minor: 4
