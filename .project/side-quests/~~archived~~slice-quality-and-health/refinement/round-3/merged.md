# Merged Review Feedback — Round 3

## CRITICAL Issues

None.

## IMPORTANT Issues

**I1. Phase 2 early exit threshold too low (minimum 2 iterations for 4-reviewer multi-file review)**
Source: holistic
The plan allows early exit at "All reviewers >= 8 after minimum 2 iterations" with max 4. For a 4-reviewer setup reviewing N+1 scattered files, 2 iterations is too aggressive — issues can hide across files. Raise minimum to 3 (still below refine-plan's 4-5, respecting the goal.md rationale that slice goals are smaller documents).
Resolution: DIRECTLY_ACTIONABLE

**I2. refine-slices description missing common trigger phrases**
Source: agent-skill
The `description` field lacks explicit `Common triggers:` list. Other skills (define-slices, complete-slice, audit-architecture) all include them. Without triggers like "review slices", "improve slice goals", "slice quality", "are these slices good", the skill will under-trigger in natural conversation.
Resolution: DIRECTLY_ACTIONABLE

**I3. Multi-file working copy pattern underspecified for editor and prompt templates**
Source: agent-skill (2 issues merged)
Two related gaps: (a) The scattered working copy pattern (`goal-refining.md` across N directories + `sequencing-refining.md`) diverges from the single-file/directory convention the iteration loop was built for. The plan should specify how the editor sub-agent handles N+1 files across directories and how cleanup works if interrupted mid-rename. (b) The reviewer bootstrap prompt uses `{plan_file_paths}` and `{plan_type}` designed for single-file or single-directory plans. The plan should specify the exact `{plan_type}` value and how the preamble's "Plan Location" section should be filled for scattered multi-directory files.
Resolution: DIRECTLY_ACTIONABLE

**I4. Phase 2 reviewer-registry.md missing `{review_context}` mapping for slice-specific reviewers**
Source: software-architecture
The three custom reviewers (Architecture Alignment, Tracer Bullet Quality, Risk/Dependency Analysis) in `reviewers-slices.md` need explicit documentation of whether they use `{review_context}` or not. The registry's Context column should either map the value or be empty — either way, the plan must be explicit.
Resolution: DIRECTLY_ACTIONABLE

**I5. Phase 3 signal tracking discovery logic has correctness gap in flow-log correlation**
Source: software-architecture + agent-skill (merged, agent-skill more specific)
The plan doesn't specify how to correlate `completion/learnings.md` paths back to flow-log entries. Needs: (a) Path matching logic — strip `.project/` prefix and `/completion/learnings.md` suffix to get the scope value. (b) Flow-log filtering — match on both `phase: "complete-slice"` and `scope` fields (not just phase). (c) Refinement directory counting — clarify which refinement directory to scan for each scope type (refine-plan uses `<scope>/refinement/`, refine-slices uses `.project/vertical-slices/slices-refinement/`).
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**M1. Phase 3 Step 6d trend detection algorithm lacks specificity**
Source: holistic
"Trending upward" is ambiguous for 3 data points. Specify "strictly increasing across all 3 data points" (a < b < c) to match the verification examples.
Resolution: DIRECTLY_ACTIONABLE

**M2. Phase 2 workflow.md update task lacks specificity about system-profile.md placement**
Source: holistic
Task should specify exact location in the file tree diagram (top level of `.project/` alongside `learnings.md` and `conventions.md`) with a descriptive comment.
Resolution: DIRECTLY_ACTIONABLE

**M3. Phase 4 verification thin on guidance.md mapping logic**
Source: holistic
The guidance.md task says "describing which audit findings map to which profile sections" but doesn't specify the expected content structure. Should document both finding type mappings (gap analysis and reassessment) explicitly.
Resolution: DIRECTLY_ACTIONABLE

**M4. Phase 2 stale working copies on early interruption**
Source: software-architecture
If interrupted between working copy creation and first iteration (no `round-1/` exists), stale `-refining` files remain. SKILL.md should specify: if stopped before any edits (no `round-1/` directory), delete all working copies listed in the manifest.
Resolution: DIRECTLY_ACTIONABLE

**M5. system-profile.md dual ownership lacks "recently updated" signal**
Source: software-architecture
audit-architecture "appends rather than overwrites when sections were recently updated" but there's no mechanism to determine recency. Add a lightweight comment marker: `<!-- Last updated by: complete-slice for 03-slice-name, 2026-03-15 -->`.
Resolution: DIRECTLY_ACTIONABLE

**M6. Phase 2 supplementary instruction injection pattern not specified**
Source: agent-skill
The filename-prefixing instruction ("Prefix each issue with the filename it applies to") needs a specified injection mechanism. Since all 4 reviewers need this behavior (not just Software Architecture), the injection point matters — specify whether it goes in bootstrap prompt, as a placeholder, or as a separate block.
Resolution: DIRECTLY_ACTIONABLE

**M7. Phase 2 run directory naming inconsistent (`-refinement` vs `-refining`)**
Source: agent-skill
Plan uses `slices-refinement/` but iteration-loop.md convention is `*-refining/` (matching refine-plan and refine-architecture). Could break resume detection or future globbing.
Resolution: DIRECTLY_ACTIONABLE

**M8. Phase 4 graceful stop doesn't cover new Step 5b (system-profile refresh)**
Source: agent-skill
Existing graceful stop cases don't cover interruption during system-profile refresh. Add a case or note it falls into the "quest proposal" partial case.
Resolution: DIRECTLY_ACTIONABLE

**M9. Phase 2 scope should explicitly exclude side quest goal.md files**
Source: agent-skill
The skill focuses on vertical slices but doesn't explicitly state scope exclusion. If side quests exist, the skill should ignore or explicitly exclude their `goal.md` files.
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE (for loop exit)

All 14 issues (5 IMPORTANT + 9 MINOR) are DIRECTLY_ACTIONABLE.

## RESEARCH_NEEDED

None.

## Contradictions Resolved

**Example scenario scope (software-architecture vs agent-skill):** Software-architecture wanted the example scenario to demonstrate the exact output format (prose analysis + summary table). Agent-skill wanted the example kept brief (2-3 sentences) to avoid context token bloat. Resolution: trust agent-skill as domain specialist on context management. Keep the example brief but include a compact format skeleton showing the expected output structure (prose heading + table columns) without a full trace. This satisfies software-architecture's format concern within agent-skill's token budget.

## Unresolved (USER_INPUT required)

None.
