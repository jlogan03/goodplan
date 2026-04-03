# Integration Review — Plan-Slice PoC

**Reviewer**: Integration (cross-phase holistic)
**Scope**: All 4 phases (3 commits: bf71982, 3c44e5f, 9be0c58) + Phase 1 agent definitions
**Date**: 2026-04-01

## Issues

**[IMPORTANT]** Exit condition logic uses per-reviewer netScore (min) but synthesis agent returns aggregate score — mismatch in what drives exit decisions

The plan (section "4f-v. Evaluate Exit Conditions") says to "Extract per-reviewer scores from each reviewer's return JSON" and compute `netScore` as "the minimum of all reviewer scores." However, the plan's own section on the synthesis agent says "the synthesis agent is the single source of truth for exit decisions" (plan-refined.md Phase 3 task list). The SKILL.md implements the per-reviewer min approach (step 4f-v), but the synthesis agent definition returns a single `score` field as its aggregate (not per-reviewer). The orchestrator would need to parse individual reviewer returns for per-reviewer scores AND the synthesis return for the aggregate — the SKILL.md does both, which is internally consistent but contradicts the plan's "synthesis is the single source of truth for exit logic" statement. This creates ambiguity about which score actually controls the loop.

Resolution: DIRECTLY_ACTIONABLE — Decide on one authority. The SKILL.md as written uses the per-reviewer min, which is the more conservative approach. If this is intentional, update the plan-refined.md text to remove the "single source of truth" claim for synthesis, or switch the SKILL.md to use only the synthesis aggregate score.

**[IMPORTANT]** Sub-agent return format reference file not created

The plan Phase 3 task list specifies: "Define sub-agent return format in two representations maintained in sync: (a) markdown reference at `skills/_shared/references/sub-agent-return-format.md` for `@` injection into agent definitions, and (b) TypeScript schema." Neither was created. Each agent definition inline-specifies its own return JSON format, which is consistent across agents but not DRY. The plan explicitly called for a single shared reference. No TypeScript schema exists for test harness validation of return format parsing.

Resolution: DIRECTLY_ACTIONABLE — Create `skills/_shared/references/sub-agent-return-format.md` consolidating the return shape (status, summary, filesWritten, score?, reviewers?, questions?, continuationFile?). Add `@` injection to each agent definition. Create a TypeScript Zod schema in `tools/dogfood/` for test validation. This was an explicit plan task, not optional.

**[IMPORTANT]** Test harness does not read `GP_PLAN_SLICE_MAX_ITERATIONS` env var in the orchestrator

The test harness (test-plan-slice.ts line 269) passes `GP_PLAN_SLICE_MAX_ITERATIONS` as an env var and also appends `Use at most ${MAX_ITERATIONS} refinement iterations` to the system prompt. However, SKILL.md has no mechanism to read this env var — it hardcodes "max 10 iterations" (step 4f). The system prompt append is a best-effort instruction to the LLM, not a deterministic control. For reliable cost control in testing, the orchestrator should check this env var.

Resolution: DIRECTLY_ACTIONABLE — Add a section to SKILL.md step 4f: "If `$GP_PLAN_SLICE_MAX_ITERATIONS` is set, use it as the hard cap instead of 10."

**[MINOR]** CLAUDE.md test harness table row uses `/gp:plan-slice` but skill name in source is `plan-slice` (no `gp:` prefix)

The CLAUDE.md diff adds `| test-plan-slice.ts | /gp:plan-slice orchestrator end-to-end |`. The skill source has `name: plan-slice` — the `gp:` prefix is only applied during build by build-plugin.sh. This is correct for describing how it's invoked at runtime (post-build), but could confuse developers reading the source. Consistent with existing table entries (e.g., `test-onboard.ts` describes `/onboard-repo`, not `/gp:onboard-repo`). Actually, checking the existing rows — they DON'T use the `gp:` prefix. This row is inconsistent with the others.

Resolution: DIRECTLY_ACTIONABLE — Change to `/plan-slice orchestrator end-to-end` to match the pattern of other rows, or change all rows to use the `gp:` prefix for consistency.

**[MINOR]** `verifyNoArtifactReads` does not check Grep/Glob calls on artifact paths

The function only checks `Read` tool calls. But if the orchestrator uses `Grep` or `Glob` on architecture files or plan drafts, that also violates context discipline. The plan says "You MUST NOT use the Read tool on architecture files, plan drafts, source code, or agent definitions" but conceptually extends to any direct content access.

Resolution: DIRECTLY_ACTIONABLE — Extend `verifyNoArtifactReads` to also check `Grep` and `Glob` calls against the same path patterns.

**[MINOR]** Build plugin validation for `agents` field logs a WARN but continues when `claude plugin validate` rejects the field

In build-plugin.sh lines 211-223, the `agents` field is expected to be rejected by the current `claude` CLI validator. The fallback logic checks if the only errors are about `agents:` and continues with a warning. This is pragmatic but the error-counting logic (`grep -c` on `agents:` vs `>`) is fragile — if the validator changes its output format, this could mask real errors.

Resolution: DIRECTLY_ACTIONABLE — Consider pinning to a specific error message string rather than counting `agents:` occurrences.

**[MINOR]** Score tracking in test harness relies on regex matching assistant text blocks

Test harness (test-plan-slice.ts lines 213-223) extracts scores via `scoreMatch = block.text.match(/(?:aggregate|overall|net)\s*score[:\s]*(\d+(?:\.\d+)?)/i)`. Since the orchestrator parses sub-agent return JSON for scores, the orchestrator's text output may not contain these patterns. The test correctly treats missing scores as a WARN not a FAIL (line 358), but the score progression test (Test 4) may never pass in practice.

Resolution: DIRECTLY_ACTIONABLE — Consider also extracting scores from the orchestrator's stderr log pattern `[plan-slice] Round {N}: netScore={N}` via Bash tool output capture.

## Cross-Phase Integration Analysis

### Phase 1 (Agents) <-> Phase 3 (Orchestrator)

**Agent names match**: SKILL.md spawns `plan-phase`, `refinement-coordinator`, `reviewer-holistic`, `reviewer-software-architecture`, `reviewer-agent-skill`, `synthesis`, `editor` — all 7 exist in `agents/`. Names match exactly.

**Tool restrictions match**: SKILL.md's Sub-Agent Tool Restrictions table matches what each agent definition describes in its "Note" section:
- plan-phase: Read, Grep, Glob, Write -- matches
- refinement-coordinator: Read, Grep, Glob -- matches
- reviewer-*: Read, Grep, Glob -- matches
- synthesis: Read, Grep, Glob, Write -- matches
- editor: Read, Grep, Glob, Write, Edit -- matches (SKILL.md adds Edit which is correct for in-place editing)

**`disallowedTools: ["Agent"]`**: Stated in SKILL.md for all agents. Agent definitions don't reference the Agent tool. Consistent.

**Return format alignment**: All agents use the same `{status, summary, filesWritten, ...}` shape. The orchestrator parses `status`, `score`, `reviewers`, `review`, `questions`, `continuationFile` from various agents — all present in the corresponding agent definitions. However, the coordinator returns `reviewers` as a field, while the synthesis agent returns `score` — the orchestrator correctly reads the right field from each.

### Phase 1 (Agents) <-> Phase 2 (Build)

**Build validates all agents**: build-plugin.sh iterates `$PLUGIN_DIR/agents/*.md`, validates frontmatter (name + description), and checks `@` reference paths. All 7 agents have valid frontmatter. All `@${CLAUDE_PLUGIN_ROOT}/...` references resolve to files that exist in `skills/_shared/references/`.

**Agents copied correctly**: rsync in build-plugin.sh lines 49-52 copies `agents/` to `dist/gp-plugin/agents/`. The `agents` field in plugin.json is set to `"./agents"`.

### Phase 2 (Build) <-> Phase 4 (Test)

**Test builds plugin before running**: test-plan-slice.ts line 76 runs `bun run build:plugin` as a preflight step. This ensures the dist has the latest agents and skills.

**Plugin binary path**: Test uses `join(PLUGIN_DIR, "binaries", platformBinaryDir(), "gp")` which matches the build output path.

### Phase 3 (Orchestrator) <-> Phase 4 (Test)

**Skill invocation**: Test invokes `/gp:plan-slice ${SLICE_NAME}` — the build applies the `gp:` prefix, so this is the correct invocation name.

**Fixture setup**: Test creates a fixture with epic, slice in `created` status, architecture files, and source. This matches what the orchestrator expects as its starting state.

**Discipline verification**: `verifyNoArtifactReads` checks Read calls. `checkViolation` checks state writes. Together they cover both halves of orchestrator discipline as designed.

**Simulated user**: Test provides a system prompt with concrete answers (approach, phasing, risks). The orchestrator's Q&A phase uses AskUserQuestion which is intercepted by the `canUseTool` handler in `runSkillSession`.

## Goal Alignment

The stated goal: "Build the agent infrastructure and the plan-slice orchestrator skill as a proof-of-concept for the orchestrator pattern."

**Achieved**:
- 7 agent definitions with `@` reference injection
- Shared reference files (review-preamble, 3 domain review criteria, plan-format)
- Build pipeline validates agents (frontmatter, `@` reference resolution)
- Orchestrator skill with 2 phases (interactive Q&A, autonomous refinement)
- Refinement loop with exit conditions (pass, stagnation, reduction, hard cap)
- Context discipline enforced (no direct reads in orchestrator)
- Temp-dir artifact pattern implemented
- Test harness with simulated user, discipline verification, score tracking
- HMAC integrity maintained (only CLI mutations, no direct state writes)

**Partially achieved**:
- Sub-agent return format reference file not created (plan task deferred)
- `GP_PLAN_SLICE_MAX_ITERATIONS` env var not read by orchestrator (testing gap)

**Not in scope but noted**: PARTIAL status handling explicitly deferred per plan.

## Score: 8/10

The implementation is well-integrated across all 4 phases. Agent definitions, build pipeline, orchestrator, and test harness form a coherent pipeline. The main deductions are: (1) the exit-condition score authority ambiguity (per-reviewer min vs synthesis aggregate) needs resolution before this pattern is reused, and (2) the sub-agent return format shared reference was an explicit plan task that was skipped without documentation of why. The test harness is thorough but has a gap in score extraction that may cause the refinement-iteration assertion to be unreliable.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
