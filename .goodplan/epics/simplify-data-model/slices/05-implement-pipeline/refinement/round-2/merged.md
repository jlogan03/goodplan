# Merged Review Feedback — Slice 05 Implement Pipeline (Round 2)

## CRITICAL Issues

None.

## IMPORTANT Issues

### I1. `implementationPhase` data model change is underspecified (holistic, software-architecture, agent-skill)

All three reviewers flagged this. The plan treats adding `implementationPhase` to the slice schema as a one-line task, but it spans multiple files across 3 layers per INV-001 and INV-005:

1. **Schema**: Add optional field to `src/schemas/entities/slice.ts` (e.g., `implementationPhase: z.number().int().min(0).nullable()`). Must be backward-compatible with existing slice.json files.
2. **State machine event**: No existing event updates this field. A new event (e.g., `UPDATE_IMPLEMENTATION_PHASE`) with transition handler is required per INV-001.
3. **CLI command**: No CLI command exists to set this field. Need a new command or flag (e.g., `slice:update --implementation-phase N`).
4. **CLI surface**: `slice:show` output should include the new field.
5. **Data layer**: Schema registry at `src/core/data/schema-registry.ts` handles `sliceSchema` via pattern matching — adding an optional field is backward-compatible but should be explicitly stated.

**Fix**: Expand Phase 2 with explicit sub-tasks for (1)-(4), or extract as a prerequisite sub-phase (Phase 1.5) with its own Expected Behavior checks.

Resolution: DIRECTLY_ACTIONABLE

---

### I2. Review loop references `iteration-loop.md` but Loop Parameters are not defined (holistic, agent-skill)

Phase 3 correctly references `skills/_shared/references/iteration-loop.md` and avoids inlining the loop. However, `iteration-loop.md` requires a "Loop Parameters" section with 11 specific parameters (reviewer list, exit criteria, early exit, max iterations, editor prompt path, score thresholds, scope constraints, working directory, run directory, backup directory, review_context). The plan mentions some values (max 12 iterations, early exit at 5+, stall detection at 3+) but doesn't frame them as a Loop Parameters section.

**Fix**: Add a task to Phase 3: "Define a Loop Parameters section in `skills/implement/SKILL.md` filling all 11 slots required by `iteration-loop.md`." List parameter values explicitly.

Resolution: DIRECTLY_ACTIONABLE

---

### I3. `refinement-coordinator` adaptation for `review_context: "code-implementation"` lacks specifics (holistic, software-architecture)

Both reviewers noted that for code-implementation context, the coordinator receives a list of changed file paths (from `git diff --name-only`), not a single document. This is a fundamentally different input shape from plan/architecture review.

The plan should specify:
- **Input**: The coordinator receives changed file paths, git diff stat, and the `review_context` string
- **Reviewer selection**: By file extensions and paths (e.g., `.ts` -> TypeScript reviewer, `skills/` -> agent-skill reviewer) rather than reading a single document
- **Backward compatibility**: Changes must not break plan/architecture review (coordinator is a shared module)
- **Registry**: Whether `reviewer-registry.md` needs entries for code-implementation context

**Fix**: Expand the "Verify/adapt refinement-coordinator" task with the above specifics.

Resolution: DIRECTLY_ACTIONABLE (holistic) / CODEBASE_EXPLORATION (software-architecture). Trust the domain specialist (software-architecture): mark as RESEARCH_NEEDED — check `agents/refinement-coordinator.md` and `reviewer-registry.md` to determine the correct adaptation approach before specifying it in the plan.

---

### I4. Architecture spec drift from completion agent split (agent-skill only)

The plan splits `completion-phase.md` into `completion-slice.md` and `completion-epic.md` (correct design), but `skill-model-api.md` (line 119) and `conventions.md` (line 58) still reference the single `completion-phase.md`. No task exists to reconcile.

**Fix**: Add a task (Phase 1) to update `skill-model-api.md` Agent Definitions table and `conventions.md` `reconsiderWhen` ownership list to reference the two new agents. Document the justification (different I/O shapes, no shared callers, cleaner boundaries).

Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues

### M1. Phase 2 Step 3: Plan-parsing sub-agent does not exist (holistic)

Step 3 spawns a sub-agent to parse the plan, but no `plan-parser` agent exists and the plan doesn't include a task to create one. Clarify: create a new agent (add to Phase 1) or have the orchestrator parse the plan file itself.

Resolution: DIRECTLY_ACTIONABLE

### M2. Phase 4 Step 7: `slice:complete` missing `verificationPassed` and full input payload (holistic, software-architecture)

The transition table requires `verificationPassed == true`, `deferredRouted`, `architecturePaths`, and `learningsRolledUp`. The plan mentions "learnings payload" but not the full input shape. Software-architecture notes the existing `complete` skill handles this via a multi-step flow.

**Fix**: Specify the full JSON payload the orchestrator pipes to `slice:complete`, including where `verificationPassed` comes from (presumably from `completion-slice` agent evaluation).

Resolution: DIRECTLY_ACTIONABLE (holistic) / CODEBASE_EXPLORATION (software-architecture). Mark as RESEARCH_NEEDED — check existing `complete` skill to determine exact payload shape.

### M3. Phase 5 Step 2: Guardrail check for all-slices-complete needs filtering (holistic)

`slice:list --json` lists slices but doesn't filter by status. Plan should specify filtering for non-terminal statuses. Also, `COMPLETE_EPIC` requires all verification results to have passed.

Resolution: DIRECTLY_ACTIONABLE

### M4. Phase 5 Step 4: `ls` glob for learnings bypasses CLI (software-architecture)

The complete-epic skill uses `ls` on `<epic>/slices/*/completion/learnings.md` instead of `$GP slice:list --json` to discover slice names and construct paths deterministically.

Resolution: DIRECTLY_ACTIONABLE

### M5. Phase 5 Step 6: Artifact promotion via `cp` may violate HMAC (agent-skill)

If promoted artifacts land inside `.goodplan/`, shell `cp` bypasses HMAC integrity. Clarify target location; if inside `.goodplan/`, use a CLI command instead.

Resolution: DIRECTLY_ACTIONABLE

### M6. Phase 6 re-entry test references CLI command that doesn't exist (software-architecture, agent-skill)

Test fixture step sets `implementationPhase` "via CLI" but no such command is specified. Depends on resolution of I1.

Resolution: DIRECTLY_ACTIONABLE (blocked on I1)

### M7. `verifyOrchestratorDiscipline()` function does not exist (holistic)

Referenced in test harness but not implemented anywhere. May be planned elsewhere (plan-slice/create-epic harnesses also reference it).

Resolution: CODEBASE_EXPLORATION

### M8. Out-of-scope documentation capture mechanism unspecified (holistic)

Plan says "capture as a follow-up task if needed" but doesn't specify using `$GP task:create` or `/gp:capture`.

Resolution: DIRECTLY_ACTIONABLE

### M9. Trigger phrase placement should be in `description` field, not separate frontmatter (agent-skill)

`plan-slice/SKILL.md` embeds trigger phrases in the `description` field value. The plan implies they are a separate frontmatter key. Clarify to match established pattern.

Resolution: DIRECTLY_ACTIONABLE

### M10. Expected Behavior check should verify agent description length (agent-skill)

Agent descriptions should be under 1024 chars per the agentskills.io spec. Minor completeness issue.

Resolution: DIRECTLY_ACTIONABLE

---

## DIRECTLY_ACTIONABLE

1. **I1**: Expand `implementationPhase` task into sub-tasks: Zod schema field, state machine event, CLI command, `slice:show` output
2. **I2**: Define all 11 Loop Parameters in `skills/implement/SKILL.md`
3. **I4**: Add Phase 1 task to update `skill-model-api.md` and `conventions.md` for the completion agent split
4. **M1**: Clarify plan-parser sub-agent: create new agent or orchestrator self-parses
5. **M3**: Specify `slice:list --json` filtering for non-terminal statuses in guardrail check
6. **M4**: Replace `ls` glob with `$GP slice:list --json` for slice discovery
7. **M5**: Clarify artifact promotion target; use CLI if inside `.goodplan/`
8. **M8**: Specify `$GP task:create` for out-of-scope documentation capture
9. **M9**: Clarify trigger phrases go inside `description` field value
10. **M10**: Add description length check to Expected Behavior

## RESEARCH_NEEDED

1. **I3**: Check `agents/refinement-coordinator.md` and `reviewer-registry.md` to determine how to adapt for `review_context: "code-implementation"` input shape
2. **M2**: Check existing `complete` skill to determine exact `slice:complete` payload shape (verificationPassed, deferredRouted, etc.)
3. **M7**: Search codebase for `verifyOrchestratorDiscipline` to determine if it's planned elsewhere or needs to be created here

## Contradictions Resolved

1. **I3 resolution type**: Holistic marked DIRECTLY_ACTIONABLE, software-architecture marked CODEBASE_EXPLORATION. Trusting software-architecture (domain specialist): the coordinator is a shared module and the adaptation needs codebase exploration before specifying changes. Marked as RESEARCH_NEEDED.

2. **M2 resolution type**: Holistic marked DIRECTLY_ACTIONABLE, software-architecture marked CODEBASE_EXPLORATION. Software-architecture correctly notes the existing `complete` skill has a multi-step flow that determines the payload shape. Marked as RESEARCH_NEEDED with a DIRECTLY_ACTIONABLE fix once payload shape is known.

## Unresolved (USER_INPUT required)

None.

### Available Research

1. **I3 (coordinator adaptation)**: `agents/refinement-coordinator.md` already accepts `review_context: "code-implementation"` as a defined input value. The coordinator reads the artifact to select reviewers based on domain coverage. For code review, the orchestrator passes a file containing changed file paths (or a diff summary) as the "artifact." The coordinator reads it and selects reviewers by file extensions/paths. No structural change to the coordinator is needed — just clarify the input format. For `reviewer-registry.md`, no changes needed — reviewers are domain-based, not review-context-based.

2. **M2 (slice:complete payload)**: Schema at `src/schemas/commands/slice.ts` requires `verificationPassed: boolean`. Optional fields: `learnings` (array), `architectureDelta` (array), `deferred` (array). There are NO `deferredRouted`, `architecturePaths`, or `learningsRolledUp` fields — those were incorrect reviewer assertions. The payload is straightforward.

3. **M7 (verifyOrchestratorDiscipline)**: The function exists in `tools/dogfood/utils.ts` as `verifyNoArtifactReads` (built in slice 02). It's available for use — just reference the correct function name. Plan should use `verifyNoArtifactReads` instead of `verifyOrchestratorDiscipline`.
