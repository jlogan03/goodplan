# Plan: Refine-Plan Shared Loop Refactoring

## Overview

Refactor `/refine-plan`'s SKILL.md to replace its inline iteration loop with a reference to the shared `iteration-loop.md` + a Loop Parameters table. This matches the pattern already used by `/refine-architecture` and `/refine-slices`. Pure refactoring — no behavioral change.

**Slug**: `shared-loop-refactor`

**Approach**: Add a Loop Parameters table after the Reviewer Roles section, then restructure Step 3 (Refinement Loop) following refine-architecture's pattern: shorten most sub-steps to 1-2 sentences + an iteration-loop.md reference, reducing two thin-wrapper sub-steps (3h USER_INPUT and 3j editor spawn) to 1-sentence pointer stubs since they have no refine-plan-specific content. An explicit iteration-loop.md reference sits at the top of the loop step. This avoids the hybrid problem of forcing readers to switch between two documents. Correctness is verified via a behavioral equivalence mapping table that maps every original sub-step to its new location. The step numbering and skill-specific steps (0, 1, 2, 2b, 4, 5) are untouched. The Output Templates and Converting to Directory-Based Format sections are untouched.

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
  | **Scope constraints** | `<plan-name>-refining.md` (single file) or `<plan-name>-refining/` (directory) — never the original (path determined at Step 0) |
  | **Working directory** | `<plan-name>-refining.md` or `<plan-name>-refining/` (whichever exists after Step 0) |
  | **Run directory** | `<scope_dir>/refinement/` (where `scope_dir = dirname(plan_path)`) |
  | **Backup directory** | N/A (original plan is preserved as backup) |
  | **review_context** | `an implementation plan` |

- [ ] **Add shared loop reference** at the top of Step 3, after the heading and before "Enter a review loop" (matching refine-architecture's Step 2 placement): "Read `~/.claude/skills/_shared/references/iteration-loop.md` for the shared orchestration structure. This step fills in the plan-specific parameters." This is a two-sentence reference, not an explanatory paragraph — matching refine-architecture's brevity.

- [ ] **Verify iteration-loop.md completeness** (do this BEFORE removing inline content — if gaps are found, the removal scope changes): For each sub-step being removed (3c, 3d, 3f, 3h, 3i, 3j), read the corresponding iteration-loop.md section and confirm every sentence in the original sub-step is either (a) covered by iteration-loop.md, or (b) identified as refine-plan-specific and listed as "surviving" below. Concrete checklist:
  - 3c sentences → "Reviewer Spawn Pattern" sections 1-5
  - 3d sentences → "Synthesis Prompt Skeleton" sections 1-4
  - 3f sentences → "Exit Criteria Evaluation" (Full Pass, Early Exit, Final Cleanup Pass, Max Iterations)
  - 3h sentences → "Handling USER_INPUT" steps 1-3
  - 3i sentences → "Handling RESEARCH_NEEDED" steps 1-5
  - 3j sentences → "Editor Sub-Agent Pattern" sections 1-4

  If a gap is found (refine-plan has content that iteration-loop.md doesn't cover and should), add it to iteration-loop.md. Then re-read refine-architecture and refine-slices SKILL.md files to confirm neither is broken by the addition.

- [ ] **Shorten inline content that duplicates iteration-loop.md**: Following refine-architecture's pattern, keep all sub-steps as inline headings but shorten each to 1-2 sentences + a reference to the iteration-loop.md section. Specific surviving sentences per sub-step:
  - Step 3c (reviewer spawn mechanics) — shorten to reference iteration-loop.md "Reviewer Spawn Pattern". Surviving sentences: (1) "do NOT read the reviewer prompt files yourself" (line 105 — refine-plan guardrail not in iteration-loop.md). Remove: the general parallel-launch rationale and bootstrap mechanics (covered by iteration-loop.md §§ 1-4). The model downgrade sentence is covered by iteration-loop.md § 5.
  - Step 3d (synthesis) — shorten to reference iteration-loop.md "Synthesis Prompt Skeleton". Surviving content: (1) the "Plan editor" row of the model selection policy table — opus default, sonnet when only MINOR DIRECTLY_ACTIONABLE items (refine-plan-specific editor downgrade condition) and (2) the "Synthesis" row — opus default, sonnet when all reviewer scores 8+ and no CRITICAL/IMPORTANT (this downgrade condition is NOT in iteration-loop.md). Remove: the "Domain reviewer" row (covered by iteration-loop.md "Reviewer Spawn Pattern" § 5). Remove: the general collect-and-synthesize mechanics (covered by iteration-loop.md §§ 1-4).
  - Step 3f (exit criteria) — shorten to reference iteration-loop.md "Exit Criteria Evaluation". Surviving sentences: the early exit user warning text ("report which reviewers scored below 9, their reasons, and whether the plan may need to be restructured, split into smaller plans, or have its scope reconsidered" — refine-plan-specific guidance not in iteration-loop.md). Remove: the full/early exit threshold definitions and final cleanup pass description (covered by iteration-loop.md).
  - Step 3h (USER_INPUT handling) — reduce to 1-sentence pointer stub: "Follow iteration-loop.md § Handling USER_INPUT." No refine-plan-specific sentences survive.
  - Step 3i (RESEARCH_NEEDED handling) — shorten to reference iteration-loop.md "Handling RESEARCH_NEEDED". Surviving sentences: (1) "Uses Context7 MCP tools first, falls back to WebSearch" (2) "Writes results to `<scope_dir>/research/<topic>.md`". Remove: the general spawn-and-append mechanics (covered by iteration-loop.md §§ 1-5) and the CODEBASE_EXPLORATION sentence (covered by iteration-loop.md § 5 verbatim).
  - Step 3j (editor spawn) — reduce to 1-sentence pointer stub: "Follow iteration-loop.md § Editor Sub-Agent Pattern." No refine-plan-specific sentences survive.

- [ ] **Keep refine-plan-specific steps inline unchanged** (these have no equivalent in iteration-loop.md):
  - Step 3a: Reviewer scope determination with conditional specialist re-evaluation
  - Step 3b: Create iteration directory
  - Step 3e: Display iteration summary (uses refine-plan's Output Templates)
  - Step 3g: Feedback categorization (adding Resolution tags if missing)
  - Step 3k: Plan size check and directory conversion
  - Step 3l/3m: Increment/max iterations (brief — references Loop Parameters)

- [ ] **Confirm Reviewer Roles section is unchanged**: The Reviewer Roles section (lines 29-38) partially overlaps with iteration-loop.md's "Reviewer Spawn Pattern" but is retained as-is, consistent with refine-architecture's treatment of its own Reviewer Roles section.

- [ ] **Add iteration-loop.md to References section**: Add a line to the References section at the bottom of SKILL.md: `- **Shared iteration loop**: \`~/.claude/skills/_shared/references/iteration-loop.md\` — orchestration pattern shared with refine-architecture and refine-slices`. Match refine-architecture's References format.

- [ ] **Measure line reduction**: Compare before/after line count of SKILL.md. Step 3 is currently ~89 lines. Verify meaningful reduction (expect ~20-25 lines removed and ~17-20 lines added for Loop Parameters table, reference text, and iteration-loop.md References entry — net reduction ~1-8 lines). If net reduction is under 1 line (i.e., the file grew), investigate — the shortening may not have been aggressive enough.

- [ ] **Atomic edit**: Work on the `-refining` working copy and only replace the original at the end. The original SKILL.md serves as the rollback — if the refactoring is interrupted, the original is untouched. This atomic edit guidance applies to the SKILL.md refactoring specifically; any iteration-loop.md additions required by task "Verify iteration-loop.md completeness" are a separate prerequisite step completed before this atomic edit.

### Verification

- Read the refactored SKILL.md end-to-end. Confirm:
  - Loop Parameters table present with all 11 parameters
  - Step 3 references iteration-loop.md (two-sentence reference after heading, before "Enter a review loop")
  - All refine-plan-specific behavior preserved (working copies, research, plan conversion, specialist re-evaluation, model selection policy "Plan editor" row (opus default, sonnet when only MINOR DIRECTLY_ACTIONABLE) and "Synthesis" row (opus default, sonnet when all scores 8+ no CRITICAL/IMPORTANT) both present and correct, output templates, final verification)
  - No steps from the original are lost — every sub-step either references iteration-loop.md or remains inline
  - References section includes iteration-loop.md
  - Reviewer Roles section is unchanged
  - Output Templates and Converting to Directory-Based Format sections are unchanged
- Read iteration-loop.md and confirm refine-architecture and refine-slices are unaffected by any additions
- **Behavioral equivalence mapping**: Verify the behavioral equivalence mapping table below is accurate after executing the refactoring. Every row must resolve to one of: "inline unchanged", "inline shortened — surviving sentences: [list]", or "iteration-loop.md § [section name]". No sub-step may be unmapped. Use the "Removed" column entries as the checklist of sentences to confirm are covered by iteration-loop.md.

  | Original step/sub-step | New location |
  |---|---|
  | Steps 0-2b (pre-loop) | Unchanged — no overlap with iteration-loop.md |
  | 3a (reviewer scope) | Inline unchanged |
  | 3b (create iteration dir) | Inline unchanged |
  | 3c (spawn reviewers) | Inline shortened → iteration-loop.md § Reviewer Spawn Pattern. Surviving: "do NOT read the reviewer prompt files yourself". Removed: parallel-launch rationale (§§ 1-4), model downgrade (§ 5) |
  | 3d (collect + synthesize) | Inline shortened → iteration-loop.md § Synthesis Prompt Skeleton. Surviving: "Plan editor" row (opus default, sonnet when only MINOR DIRECTLY_ACTIONABLE) + "Synthesis" row (opus default, sonnet when all scores 8+ no CRITICAL/IMPORTANT). Removed: "Domain reviewer" row (§ Reviewer Spawn Pattern 5), collect-and-synthesize mechanics (§§ 1-4) |
  | 3e (display summary) | Inline unchanged |
  | 3f (exit criteria) | Inline shortened → iteration-loop.md § Exit Criteria Evaluation. Surviving: early exit warning text (restructuring/splitting/scope). Removed: full/early exit thresholds (§ Full Pass, § Early Exit), final cleanup pass (§ Final Cleanup Pass) |
  | 3g (categorize feedback) | Inline unchanged |
  | 3h (USER_INPUT) | Inline stub (1 sentence) → iteration-loop.md § Handling USER_INPUT. Removed: all 3 original sentences (§§ 1-3 cover verbatim) |
  | 3i (RESEARCH_NEEDED) | Inline shortened → iteration-loop.md § Handling RESEARCH_NEEDED. Surviving: Context7 first, `<scope_dir>/research/` path. Removed: spawn-and-append mechanics (§§ 1-4), CODEBASE_EXPLORATION sentence (§ 5 verbatim) |
  | 3j (editor spawn) | Inline stub (1 sentence) → iteration-loop.md § Editor Sub-Agent Pattern. Removed: all 4 original sections (§§ 1-4 cover verbatim) |
  | 3k (plan size check) | Inline unchanged |
  | 3l (increment) | Inline unchanged |
  | 3m (max iterations) | Inline unchanged |
  | Steps 4-5 (post-loop) | Unchanged — no overlap with iteration-loop.md |

## Known Limitations / Future Work

- **shared-preamble.md asymmetry**: After this refactoring, `iteration-loop.md` lives in `_shared/` while `shared-preamble.md` lives in `refine-plan/references/`. This asymmetry is out of scope but is a candidate for future cleanup.
