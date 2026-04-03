# Merged Feedback — Create-Epic Pipeline Plan (Round 1)

Reviewers: holistic (7/10), software-architecture (6/10), agent-skill (5/10)

## CRITICAL

**[C1] `reviewers-language.md` source file does not exist in repo**
Raised by: holistic (IMPORTANT), software-architecture (IMPORTANT), agent-skill (CRITICAL)
Phase 2 Task 1 references `reviewers-language.md` section "TypeScript and JavaScript Reviewer" for sourcing the new TypeScript reviewer. This file does NOT exist in the repo's `skills/_shared/references/`. It exists only in the installed plugin cache at `~/.claude/plugins/cache/goodplan-marketplace/goodplan/1.0.3/skills/refine-plan/references/reviewers-language.md`. The plan must either: (a) reference the installed cache path explicitly as a one-time extraction, (b) add a preceding task to copy the relevant section into the repo's `_shared/references/`, or (c) verify whether `reviewers-cross-cutting.md` (31KB, already in `_shared/references/`) contains the needed TypeScript content.
Resolution: DIRECTLY_ACTIONABLE

**[C2] Architecture refinement loop under-specified — missing submit/response/exit pattern**
Raised by: agent-skill (CRITICAL)
Phase 3 says "refinement loop: coordinator -> reviewers -> synthesis -> editor (same pattern as plan-slice)" but never specifies: how the orchestrator calls `submit-refine-architecture`, what response fields to parse (`thresholdMet`, `round`, `scores`), or how the loop determines when to exit. The plan-slice orchestrator has explicit submit-refinement response parsing that drives loop/exit logic. The create-epic plan must mirror this pattern explicitly rather than saying "same as plan-slice" and leaving the implementer to reverse-engineer it.
Resolution: DIRECTLY_ACTIONABLE

## IMPORTANT

**[I1] Context bundling: plan bypasses existing `start-*` CLI commands**
Raised by: software-architecture (IMPORTANT), agent-skill (IMPORTANT)
The plan has the orchestrator manually assembling file paths for explore, architecture, and slices phases. The CLI already provides `gp start-explore`, `gp start-architecture`, `gp start-slices`, etc. that return structured `ContextBundle` JSON with prioritized inline content and reference paths. The plan-slice orchestrator uses `gp start-plan` for exactly this purpose. The create-epic plan should use these `start-*` commands consistently, keeping the orchestrator thin and benefiting from CLI-managed context assembly.
Resolution: DIRECTLY_ACTIONABLE

**[I2] Phase 4 hardcodes architecture file destination path**
Raised by: holistic (IMPORTANT), software-architecture (IMPORTANT)
The plan says "Copy architecture files from temp dir to `.goodplan/epics/<name>/architecture/`" instead of using a CLI response field. The orchestrator should extract the target path from the CLI response (check what `submit-architecture` returns — `paths.architecture` or `filesWritten`). If the CLI doesn't currently return this, add a task to make it do so. Hardcoding paths violates the principle that the CLI owns filesystem layout.
Resolution: CODEBASE_EXPLORATION — verify `submit-architecture` response shape first.

**[I3] Explore-phase agent loses parallel sub-agent research capability**
Raised by: holistic (IMPORTANT), agent-skill (IMPORTANT)
The plan restricts explore-phase to `disallowedTools: Agent`, but the existing explore skill uses sub-agents for parallel research (cap at 5). This is a significant regression. The plan should either: (a) allow Agent tool with a cap and update the tool note, (b) have the orchestrator handle parallelism by spawning multiple explore-phase instances, or (c) explicitly acknowledge this as a deliberate simplification with rationale for why it's acceptable.
Resolution: DIRECTLY_ACTIONABLE

**[I4] No version check step in the orchestrator**
Raised by: holistic (IMPORTANT)
The plan-slice orchestrator has an explicit "Step 0 - Version Check" that validates the CLI binary. The existing create-epic skill also has one. The new SKILL.md's Phase 3 tasks omit it. This is a required pattern per established skill conventions.
Resolution: DIRECTLY_ACTIONABLE

**[I5] Phase 6 slice creation: context discipline violation and status guard question**
Raised by: software-architecture (IMPORTANT), agent-skill (IMPORTANT)
Two sub-issues: (a) The slices-phase agent returns `filesWritten` (file paths), but the orchestrator would need to parse file contents to extract slice names and goals for `gp slice:create` stdin. The agent should return structured slice metadata (name + goal pairs) in its return JSON. (b) `slice:create` requires `--epic` and may require the epic to be in a specific status. At Phase 6, the epic is at `defining-slices` or `slices-defined` — verify `slice:create`'s status guard accepts this.
Resolution: (a) DIRECTLY_ACTIONABLE, (b) CODEBASE_EXPLORATION

**[I6] PARTIAL status handling over-specified vs. proven plan-slice approach**
Raised by: software-architecture (IMPORTANT)
The plan specifies elaborate PARTIAL handling (questions + research topics + parallel dispatch), but plan-slice explicitly defers PARTIAL: "log the questions and stop with message to user." The create-epic plan should follow the same incremental approach — basic PARTIAL handling first. Over-specifying adds complexity without a validated pattern.
Resolution: DIRECTLY_ACTIONABLE

**[I7] Phase 1 `@` reference expansion not verified for new phase agents**
Raised by: agent-skill (IMPORTANT)
Phase agents use `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/sub-agent-return-format.md` but the plan doesn't verify this resolves correctly for agents in the `agents/` directory. Phase 4 build pipeline update should explicitly verify `@` reference resolution for the 3 new phase agents, not just reviewers.
Resolution: DIRECTLY_ACTIONABLE

**[I8] Test harness fixture setup contradicts itself**
Raised by: software-architecture (MINOR), agent-skill (IMPORTANT)
The plan says both `createMinimalFixture()` and "Actually: `gp init`, no epic." The self-correction is good but creates confusion. The plan should specify a single approach: either extend `createMinimalFixture` with a `noEpic` option, or call `gp init` directly. The re-entry test also says "fast-track to explored" without specifying the exact CLI command sequence.
Resolution: DIRECTLY_ACTIONABLE

## MINOR

**[M1] Conventions.md phase detection table incomplete**
Raised by: holistic (IMPORTANT as gap, MINOR as task)
The conventions.md phase detection table (lines 119-128) omits refinement statuses (`refining-architecture`, `architecture-refined`, `refining-slices`, `slices-refined`). The plan should include a task to update this table, since the orchestrator references it for re-entry.
Resolution: DIRECTLY_ACTIONABLE

**[M2] `reconsiderWhen`/`validUntil` condition loading not filtered by entity path**
Raised by: software-architecture (MINOR)
The plan loads conditions via `gp decision:list --json` and `gp learning:list --json` without filtering by entity path. Since slice 03 added `entityPath`, conditions should be scoped to the relevant epic to avoid noise.
Resolution: DIRECTLY_ACTIONABLE

**[M3] Agent count assertion is fragile**
Raised by: software-architecture (MINOR)
Phase 4 asserts "Packaged 13 agents" with `wc -l`. This hardcoded count breaks if other slices add agents. Verify expected agents by name instead.
Resolution: DIRECTLY_ACTIONABLE

**[M4] No test coverage for PARTIAL handling or FAILED sub-agent status**
Raised by: holistic (MINOR x2)
Phase 5 tests don't exercise PARTIAL returns from architecture/slices-phase agents or FAILED sub-agent error handling. Add at least one PARTIAL test and one negative FAILED test.
Resolution: DIRECTLY_ACTIONABLE

**[M5] `user-invocable: true` frontmatter — purpose unclear**
Raised by: agent-skill (IMPORTANT)
Only plan-slice currently uses this field. The current create-epic skill works without it. If it's required for pipeline orchestrators, explain why. If not, omit to avoid confusion.
Resolution: DIRECTLY_ACTIONABLE

**[M6] Phase 3 architecture Q&A "broad + deep passes" underspecified**
Raised by: software-architecture (MINOR)
The implementer needs to know: how many questions per pass, what triggers moving from broad to deep, how Q&A is structured. Reference the existing create-architecture skill's Q&A structure or specify concretely.
Resolution: DIRECTLY_ACTIONABLE

**[M7] Context discipline exception for architecture file writes needs clarification**
Raised by: agent-skill (MINOR)
Phase 4 says the orchestrator may Write architecture files directly. If Write is allowed, clarify whether Read is also permitted and why this exception doesn't undermine context discipline.
Resolution: DIRECTLY_ACTIONABLE

**[M8] No documentation update tasks**
Raised by: holistic (MINOR)
The new pipeline orchestrator is a significant capability. At minimum note that doc updates are tracked in the epic's final slice, or add a lightweight index update task.
Resolution: DIRECTLY_ACTIONABLE

**[M9] `gp epic:refine-slices` command existence not verified**
Raised by: holistic (MINOR)
Phase 6 references this command but it doesn't appear in the verified CLI command surface from the research file. Verify it exists.
Resolution: CODEBASE_EXPLORATION

## Resolved Contradictions

- **PARTIAL handling severity**: software-architecture rates over-specified PARTIAL as IMPORTANT (simplify it); agent-skill rates under-specified refinement loop as CRITICAL (specify it more). These are compatible: the refinement loop submit/response pattern needs explicit specification (C2), while the general PARTIAL handling for questions/research should be simplified to match plan-slice's incremental approach (I6).
- **`user-invocable` severity**: agent-skill rates as IMPORTANT; demoted to MINOR in merge because it's cosmetic — the skill works without it and adding it is harmless.
- **Test fixture severity**: software-architecture rates as MINOR; agent-skill rates as IMPORTANT. Merged as I8 (IMPORTANT) because an unresolvable fixture setup will block test implementation.

## Aggregate Scores

| Reviewer | Score | Critical | Important | Minor |
|---|---|---|---|---|
| holistic | 7/10 | 0 | 5 | 5 |
| software-architecture | 6/10 | 0 | 5 | 4 |
| agent-skill | 5/10 | 2 | 6 | 3 |
| **Merged** | **6/10** | **2** | **8** | **9** |
