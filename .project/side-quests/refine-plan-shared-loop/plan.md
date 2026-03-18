# Plan: Refine-Plan Shared Loop Refactoring

## Overview

Refactor `/refine-plan`'s SKILL.md to replace its inline iteration loop with a reference to the shared `iteration-loop.md` + a Loop Parameters table. This matches the pattern already used by `/refine-architecture` and `/refine-slices`. Pure refactoring — no behavioral change.

**Slug**: `shared-loop-refactor`

**Approach**: Add a Loop Parameters table after the Reviewer Roles section, then restructure Step 3 (Refinement Loop) to reference iteration-loop.md for shared mechanics while retaining refine-plan-specific behavior inline. The step numbering and skill-specific steps (0, 1, 2, 2b, 4, 5) are untouched.

## Phase 1: Extract Loop Parameters and Restructure Step 3

Replace refine-plan's inline loop orchestration with a Loop Parameters table + reference to iteration-loop.md, keeping all refine-plan-specific behavior.

### Tasks

- [ ] **Add Loop Parameters table** after the "Reviewer Roles" section (before "## Workflow"), following the refine-architecture pattern:

  | Parameter | Value |
  |---|---|
  | **Reviewer list** | Holistic (always), Software Architecture (always), domain specialists (conditional — see `references/reviewer-registry.md`) |
  | **Exit criteria** | All scores >= 9, no CRITICAL or IMPORTANT issues |
  | **Early exit** | After 5+ iterations: all scores >= 8, no CRITICAL or IMPORTANT |
  | **Max iterations** | 12 |
  | **Editor prompt path** | `references/sub-agent-prompts.md` § "Plan Editor Sub-Agent Prompt" |
  | **Score thresholds** | Full pass: 9+, Early exit: 8+ after 5 iterations |
  | **Scope constraints** | `-refining` working copy of the plan |
  | **Working directory** | `-refining` copy (single file or directory) |
  | **Run directory** | `<scope_dir>/refinement` |
  | **Backup directory** | N/A (original plan is preserved as backup) |
  | **review_context** | `an implementation plan` |

- [ ] **Add shared loop reference** at the top of Step 3, before the run directory setup: "This step follows the shared iteration loop defined in `~/.claude/skills/_shared/references/iteration-loop.md`. The Loop Parameters table above fills in the skill-specific slots. The remainder of this section documents refine-plan-specific behavior that extends the shared loop."

- [ ] **Remove inline content that duplicates iteration-loop.md**: Delete or replace with brief references the following from Step 3:
  - Step 3c (reviewer spawn mechanics) — replaced by iteration-loop.md "Reviewer Spawn Pattern". Keep the refine-plan-specific note about re-evaluating specialist relevance after plan edits.
  - Step 3d (synthesis) — replaced by iteration-loop.md "Synthesis Prompt Skeleton". Keep the model selection policy table (it has refine-plan-specific "Plan editor" row).
  - Step 3f (exit criteria) — replaced by iteration-loop.md "Exit Criteria Evaluation". Keep the early exit user warning text (refine-plan-specific: mentions restructuring, splitting, scope reconsideration).
  - Step 3h (USER_INPUT handling) — replaced by iteration-loop.md "Handling USER_INPUT"
  - Step 3i (RESEARCH_NEEDED handling) — partially replaced. Keep the refine-plan-specific details: Context7 MCP tools first, write to `<scope_dir>/research/`, CODEBASE_EXPLORATION uses Grep/Glob/Read.
  - Step 3j (editor spawn) — replaced by iteration-loop.md "Editor Sub-Agent Pattern"

- [ ] **Keep refine-plan-specific steps inline** (these have no equivalent in iteration-loop.md):
  - Step 3a: Reviewer scope determination with conditional specialist re-evaluation
  - Step 3b: Create iteration directory
  - Step 3e: Display iteration summary (uses refine-plan's Output Templates)
  - Step 3g: Feedback categorization (adding Resolution tags if missing)
  - Step 3k: Plan size check and directory conversion
  - Step 3l/3m: Increment/max iterations (brief — references Loop Parameters)

- [ ] **Verify iteration-loop.md completeness**: Read iteration-loop.md and confirm it covers everything being removed from refine-plan. If any gap is found (something refine-plan has that iteration-loop.md doesn't and should), add it to iteration-loop.md. Then verify refine-architecture and refine-slices still make sense with the addition.

- [ ] **Measure line reduction**: Compare before/after line count of SKILL.md. The refactored version should be meaningfully shorter (target: ~50-80 lines removed from Step 3, offset by ~15 lines added for Loop Parameters table and reference text).

### Verification

- Read the refactored SKILL.md end-to-end. Confirm:
  - Loop Parameters table present with all 11 parameters
  - Step 3 references iteration-loop.md
  - All refine-plan-specific behavior preserved (working copies, research, plan conversion, specialist re-evaluation, model selection policy, output templates, final verification)
  - No steps from the original are lost — every sub-step either references iteration-loop.md or remains inline
- Read iteration-loop.md and confirm refine-architecture and refine-slices are unaffected by any additions
- Compare the behavioral specification: for each sub-step in the original Step 3, confirm the refactored version produces the same agent behavior (either via iteration-loop.md reference or inline retention)
