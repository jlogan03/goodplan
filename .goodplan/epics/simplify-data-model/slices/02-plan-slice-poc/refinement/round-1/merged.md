# Merged Feedback — Plan-Slice PoC (Round 1)

## CRITICAL Issues

**C1. Incorrect CLI command for status transition**
- File: plan.md Phase 3 (multiple locations)
- The plan uses `gp start-plan --slice <name>` for the `created -> planning` status transition, but `start-plan` is a read-only context assembly command. The correct mutation command is `gp slice:plan --slice <name>`.
- Flagged by: agent-skill (primary), software-architecture (tangential)
- Resolution: DIRECTLY_ACTIONABLE

**C2. Severity level mismatch — plan defines 4 levels, existing system uses 3**
- File: plan.md Phase 1 (review-preamble.md task)
- Plan says "CRITICAL, IMPORTANT, SUGGESTION, NITPICK" but the installed reviewer infrastructure (v1.0.3 shared-preamble) and the synthesis/exit-condition logic all use "CRITICAL, IMPORTANT, MINOR". Using non-standard severity levels will cause parsing failures in the synthesis agent and orchestrator exit conditions.
- Flagged by: holistic, software-architecture, agent-skill, typescript, repo-tooling (all five reviewers)
- Resolution: DIRECTLY_ACTIONABLE

## IMPORTANT Issues

**I1. Reviewer shared reference files — no coexistence/migration strategy with existing monolithic files**
- Files: `skills/_shared/references/review-*.md` (new), `skills/_shared/references/reviewers-cross-cutting.md` (existing 31KB), `skills/refine-plan/references/` (existing)
- The plan creates 3 new per-domain reviewer files but never addresses what happens to the existing monolithic `reviewers-cross-cutting.md` or the refine-plan skill's local reviewer references. This creates dual sources of truth that will drift.
- Fix: Add a note in Phase 1 clarifying: new `review-*.md` files are canonical for the agent-based pipeline; existing `reviewers-cross-cutting.md` and `skills/refine-plan/references/reviewers-*.md` remain untouched for backward compatibility with installed v1.0.3. Full migration is deferred to a later slice.
- Flagged by: software-architecture, agent-skill, repo-tooling
- Resolution: DIRECTLY_ACTIONABLE

**I2. `plan-format.md` extraction — copy vs move ambiguity**
- Files: `skills/create-plan/references/plan-format.md` (source), `skills/_shared/references/plan-format.md` (destination)
- "Extract" is ambiguous. If the source is moved, the existing create-plan skill breaks. If copied, dual-source drift occurs.
- Fix: Clarify this is a **copy**. Original stays for backward compatibility. New shared copy is used by plan-phase agent via `@` reference. Future slice migrates create-plan to shared copy.
- Flagged by: agent-skill, repo-tooling
- Resolution: DIRECTLY_ACTIONABLE

**I3. Refinement loop exit conditions missing CRITICAL/IMPORTANT issue check**
- File: plan.md Phase 3 (exit conditions)
- The loop exits when all scores >= 9, but does not check for remaining CRITICAL or IMPORTANT issues. A round scoring 9/10 but with a remaining CRITICAL issue would incorrectly exit.
- Fix: Add "no CRITICAL or IMPORTANT issues" as a required exit condition alongside the score threshold, matching the established iteration-loop pattern.
- Flagged by: agent-skill
- Resolution: DIRECTLY_ACTIONABLE

**I4. `verifyEntityStatus()` call signature is wrong**
- File: plan.md Phase 4
- Plan says `verifyEntityStatus(gpBin, "slice", sliceName, "plan-refined")` but actual signature is `verifyEntityStatus(type, name, expected, opts?)`. Correct call: `verifyEntityStatus("slice", sliceName, "plan-refined", { gpBin })`.
- Flagged by: typescript, repo-tooling
- Resolution: DIRECTLY_ACTIONABLE

**I5. `verifyOrchestratorDiscipline()` — no feasible method to distinguish orchestrator vs sub-agent tool calls**
- File: plan.md Phase 4
- The Agent SDK `query()` stream yields flat messages with no built-in orchestrator/sub-agent attribution. The plan says to "distinguish orchestrator-level reads from sub-agent reads" but doesn't specify how. Additionally, the function must account for phase-dependent rules: orchestrator reads during Q&A (Phase 1) are expected; reads during autonomous phases (Phase 2+) are violations.
- Flagged by: holistic, software-architecture, agent-skill
- Resolution: CODEBASE_EXPLORATION

**I6. Phase 3 re-entry for `plan-refined` status — re-refinement behavior undefined**
- File: plan.md Phase 3 (re-entry detection)
- Plan says "offers to re-refine or view" but doesn't specify what re-refinement means operationally (full loop? reset status? skip Q&A?).
- Fix: Specify: re-refine spawns the refinement loop on the existing plan without re-running Q&A. Status transitions `plan-refined` -> `planning` before re-refinement, then back to `plan-refined` on completion.
- Flagged by: holistic
- Resolution: DIRECTLY_ACTIONABLE

**I7. Missing status transition for `planning` -> `plan-created`**
- File: plan.md Phase 3
- The epic architecture defines transitions `created -> planning -> plan-created -> plan-refined`. The plan specifies `slice:plan` for `created -> planning` and `submit-plan` for the final submission, but nothing triggers `planning -> plan-created`. Is there an intermediate command, or does `submit-plan` handle the full `planning -> plan-refined` jump?
- Flagged by: software-architecture
- Resolution: CODEBASE_EXPLORATION

**I8. No temp directory cleanup**
- File: plan.md Phase 3
- `/tmp/gp-plan-slice-<name>-<ts>/` directories accumulate across runs with no cleanup mechanism.
- Fix: Add note: temp directory preserved on failure for debugging, cleaned up on successful `submit-plan`. Log the path so user knows where artifacts live.
- Flagged by: holistic, software-architecture, agent-skill
- Resolution: DIRECTLY_ACTIONABLE

**I9. Architecture doc contradiction — stale `skills:` frontmatter paragraph**
- File: epic architecture `_overview.md` (line ~69)
- The doc says `skills:` frontmatter requires SKILL.md files, but earlier sections and key decisions say `skills:` is broken (issue #25834) and `@` references should be used instead. The plan is correct, but the doc will confuse future implementers.
- Fix: Add a task to update `_overview.md` to remove the stale `skills:` paragraph and replace with the `@` reference mechanism.
- Flagged by: holistic
- Resolution: DIRECTLY_ACTIONABLE

**I10. No build-time validation that `@` reference paths resolve to existing files in dist**
- File: plan.md Phase 2
- A typo in an `@${CLAUDE_PLUGIN_ROOT}/...` reference path would silently produce an agent with missing content. Phase 2 build validation should extract `@` references from agent bodies and verify the referenced files exist in `dist/`.
- Flagged by: typescript
- Resolution: DIRECTLY_ACTIONABLE

**I11. Agent `model:` frontmatter — unclear if respected at runtime, not validated in build**
- Files: plan.md Phase 1 (agent definitions), Phase 2 (build validation)
- All agents specify `model: opus` but build validation only checks `name:` and `description:`. If `model:` is part of the agent contract, it should be validated. Also unclear whether the test harness `--model` flag overrides agent frontmatter.
- Flagged by: software-architecture, typescript, repo-tooling
- Resolution: CODEBASE_EXPLORATION

## MINOR Issues

**M1. Phase 2 Expected Behavior — `grep agents` is fragile**
- Fix: Change to `jq '.agents'` or `grep '"agents"'` for precision.
- Flagged by: holistic, repo-tooling
- Resolution: DIRECTLY_ACTIONABLE

**M2. Phase 1 Expected Behavior — missing `plan-format.md` existence check**
- Fix: Add `ls skills/_shared/references/plan-format.md -> exists` to Phase 1 expected behavior.
- Flagged by: agent-skill
- Resolution: DIRECTLY_ACTIONABLE

**M3. Phase 4 — `verifyOrchestratorDiscipline()` should also check `agents/` paths**
- The orchestrator should not Read agent `.md` files (they're injected at spawn). Include `agents/` in the violation path list.
- Flagged by: typescript
- Resolution: DIRECTLY_ACTIONABLE

**M4. Phase 4 — no backward compatibility verification after extending `createMinimalFixture()`**
- Fix: Add a task to run existing tests after modifying `createMinimalFixture()`.
- Flagged by: repo-tooling
- Resolution: DIRECTLY_ACTIONABLE

**M5. Phase 4 — haiku-tier tests validate mechanics, not quality**
- Fix: Add a note that haiku tests validate loop mechanics and spawn/return parsing, not review quality. Consider `--max-iterations 2` for cost control.
- Flagged by: agent-skill
- Resolution: DIRECTLY_ACTIONABLE

**M6. Phase 2 — `"agents"` field placement in plugin.json unspecified**
- Fix: Specify placement after `"skills"` for deterministic output.
- Flagged by: repo-tooling
- Resolution: DIRECTLY_ACTIONABLE

**M7. No sub-agent return format type definition**
- The `{ status, summary, filesWritten, score?, ... }` shape is prose-only. Consider defining a Zod schema or TypeScript interface in a shared reference.
- Flagged by: typescript
- Resolution: DIRECTLY_ACTIONABLE

**M8. Phase 1 — note that 7 agents is PoC-scoped, more will come in later slices**
- Fix: Add brief note in Overview.
- Flagged by: holistic, agent-skill
- Resolution: DIRECTLY_ACTIONABLE

**M9. `createMinimalFixture()` — `architectureFiles` semantics unclear**
- Does it just write markdown files to disk, or also register them via CLI? Clarify.
- Flagged by: typescript
- Resolution: DIRECTLY_ACTIONABLE

**M10. Refinement loop "net score" undefined**
- Specify: net score = synthesis aggregate score (single number from synthesis agent return).
- Flagged by: software-architecture
- Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE (for loop exit)

1. **C1 — Fix CLI command**: Replace `gp start-plan --slice <name>` with `gp slice:plan --slice <name>` everywhere it appears as a status transition command in Phase 3.

2. **C2 — Fix severity levels**: Change "CRITICAL, IMPORTANT, SUGGESTION, NITPICK" to "CRITICAL, IMPORTANT, MINOR" in Phase 1's review-preamble.md task.

3. **I1 — Add coexistence note**: In Phase 1, add a paragraph: "New `review-*.md` files are canonical for the agent-based pipeline. Existing `reviewers-cross-cutting.md` and `skills/refine-plan/references/reviewers-*.md` remain untouched (backward compatibility with installed v1.0.3). Full migration deferred to a later slice."

4. **I2 — Clarify plan-format extraction**: Change "Extract" to "Copy" in Phase 1 task. Add: "Original `skills/create-plan/references/plan-format.md` stays in place. Future slice migrates create-plan to shared copy."

5. **I3 — Add issue-based exit condition**: In Phase 3 exit conditions, add: "AND no CRITICAL or IMPORTANT issues remain" alongside the score >= 9 threshold.

6. **I4 — Fix `verifyEntityStatus` call**: Change `verifyEntityStatus(gpBin, "slice", sliceName, "plan-refined")` to `verifyEntityStatus("slice", sliceName, "plan-refined", { gpBin })`.

7. **I6 — Define re-refinement behavior**: Add under re-entry detection: "Re-refine runs the refinement loop (Phase 2 coordinator -> reviewers -> synthesis -> editor cycle) on the existing plan without re-running Q&A. Status transitions `plan-refined` -> `planning` before re-refinement, back to `plan-refined` on completion."

8. **I8 — Add temp dir cleanup note**: In Phase 3: "Temp directory preserved on failure for debugging. Cleaned up on successful `submit-plan`. Path logged so user knows where artifacts live."

9. **I9 — Fix architecture doc**: Add a task (Phase 1 or cross-cutting) to update epic architecture `_overview.md`: remove stale `skills:` frontmatter paragraph (~line 69), replace with `@` reference mechanism.

10. **I10 — Add `@` reference path validation**: In Phase 2 build validation, add a step: extract `@${CLAUDE_PLUGIN_ROOT}/...` references from agent `.md` bodies, verify each referenced file exists in `dist/`.

11. **M1 — Fix grep command**: Change `grep agents` to `jq '.agents'` in Phase 2 Expected Behavior.

12. **M2 — Add plan-format check**: Add `ls skills/_shared/references/plan-format.md -> exists` to Phase 1 Expected Behavior.

13. **M3 — Add agents/ to violation paths**: In `verifyOrchestratorDiscipline()` description, include `agents/` directory paths in the violation check list.

14. **M4 — Add backward compat verification**: In Phase 4, add task: "Run existing dogfood tests after modifying `createMinimalFixture()` to confirm no regressions."

15. **M5 — Note haiku test limitations**: In Phase 4: "Haiku-tier tests validate loop mechanics and agent spawn/return parsing, not review quality. Use `--max-iterations 2` for cost control."

16. **M6 — Specify agents field placement**: In Phase 2: place `"agents": "./agents"` after `"skills"` in plugin.json.

17. **M7 — Define return format type**: Add sub-agent return format as a Zod schema or TypeScript interface, referenced by both agent definitions and test harness code.

18. **M8 — Note PoC agent count**: Add to Overview: "This slice creates 7 of ~15 agents from the epic architecture. Remaining agents are created in subsequent slices."

19. **M9 — Clarify architectureFiles**: Specify whether `architectureFiles` in `createMinimalFixture()` just writes markdown files to disk or also registers via CLI.

20. **M10 — Define net score**: Add: "Net score = synthesis aggregate score (single number from synthesis agent return)."

## RESEARCH_NEEDED

None.

## CODEBASE_EXPLORATION

**CE1. Orchestrator vs sub-agent tool call attribution (I5)**
- What to look up: How Agent SDK `query()` stream attributes tool calls to orchestrator vs spawned sub-agents. Check transcript format, message topology, and whether Agent tool spawn events create distinguishable spans.
- Why it matters: `verifyOrchestratorDiscipline()` cannot work without this capability. If attribution is impossible, the function design needs rethinking.
- Tool strategy: `Read tools/dogfood/utils.ts` for existing `checkViolation()` patterns. `Grep` for `Agent` tool call patterns in existing test scripts. `Read` Agent SDK docs if available in `node_modules/@anthropic-ai/claude-agent-sdk/`.

**CE2. Status transition path `planning -> plan-created -> plan-refined` (I7)**
- What to look up: Whether `submit-plan` handles `planning -> plan-refined` directly or if there's an intermediate command for `planning -> plan-created`.
- Why it matters: The orchestrator needs the correct CLI commands for each status transition.
- Tool strategy: `Read src/commands/subagent/submit-plan.ts`. `Grep` for `plan-created` and `BEGIN_PLAN` in `src/` to find state machine transitions.

**CE3. Agent `model:` frontmatter behavior (I11)**
- What to look up: Whether Claude Code's Agent tool respects a `model:` field in agent frontmatter, or if model is set only at spawn time. Whether the test harness `--model` flag overrides agent frontmatter.
- Why it matters: Determines whether `model: opus` in agent files is functional or advisory, and whether haiku-tier testing actually tests at haiku tier.
- Tool strategy: `Grep` for `model` in Agent SDK types/docs. Check existing agent spawn patterns in test harness scripts.

## Contradictions Resolved

1. **Severity levels**: All five reviewers flagged the same issue (CRITICAL/IMPORTANT/SUGGESTION/NITPICK vs CRITICAL/IMPORTANT/MINOR). No contradiction — unanimous agreement. Resolution: use CRITICAL/IMPORTANT/MINOR.

2. **`start-plan` vs `slice:plan`**: Agent-skill reviewer (domain specialist for CLI commands) provided the most specific analysis with exact file paths (`src/commands/subagent/start-plan.ts` vs `src/commands/slice/plan.ts`). Trusted as authoritative.

3. **Reviewer file coexistence**: Software-architecture, agent-skill, and repo-tooling all flagged this from different angles (architectural drift, backward compat, repo maintenance). No contradiction — merged into single issue I1 with the most complete fix from agent-skill.

4. **`verifyEntityStatus` signature**: TypeScript reviewer provided the exact correct signature with reasoning about strict typing. Repo-tooling confirmed. No contradiction.

## CODEBASE_EXPLORATION Resolved

**CE1. Orchestrator vs sub-agent tool call attribution (I5)**
Answer: The Agent SDK `canUseTool` interceptor only fires for the orchestrator's own tool calls. Sub-agents spawned via the Agent tool run in independent sessions with their own tool call handling. Therefore `verifyOrchestratorDiscipline()` is straightforward — every Read call captured by `canUseTool` is an orchestrator-level call by definition. No special attribution logic needed. Update the plan to clarify this.

**CE2. Status transition path (I7)**
Answer: The full CLI transition path for plan-slice is:
1. `gp slice:plan --slice <name>` → `created` → `planning` (BEGIN_PLAN)
2. `gp submit-plan --slice <name>` → `planning` → `plan-created` (COMPLETE_PLAN)
3. Refinement begins at `plan-created`. The orchestrator needs to call `submit-refinement` per round:
   - `gp submit-refinement --slice <name>` → handles round tracking → eventually → `plan-refined`
The plan needs updating to use all three commands in the correct sequence.

**CE3. Agent model: frontmatter (I11)**
Answer: `model:` frontmatter in agent definitions IS respected at runtime. Precedence: (1) CLAUDE_CODE_SUBAGENT_MODEL env var, (2) per-invocation model parameter in Agent tool, (3) agent definition's `model:` frontmatter, (4) parent conversation's model. Test harness `--model` flag sets the per-invocation model which overrides frontmatter. So `model: opus` in agent files is functional (not advisory), and haiku-tier testing correctly overrides to haiku. Build validation of `model:` is optional — it's not required for correctness. Downgrade I11 to MINOR.

## Unresolved (USER_INPUT required)

None. All issues are either DIRECTLY_ACTIONABLE or resolvable via CODEBASE_EXPLORATION (now resolved).

---

## Synthesis Summary

Scores: holistic: 7/10, software-architecture: 6/10, agent-skill: 6/10, typescript: 7/10, repo-tooling: 7/10
Severity: Critical: 2, Important: 11, Minor: 10
USER_INPUT items: none
DIRECTLY_ACTIONABLE count: 20
RESEARCH_NEEDED count: 0
CODEBASE_EXPLORATION count: 3
Contradictions: 4 resolved, 0 unresolved
Domains needing re-review: software-architecture (2 CRITICAL), agent-skill (2 CRITICAL)
