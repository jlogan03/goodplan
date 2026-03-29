# Agent Skill Review — Iteration 3

## Issues

**[IMPORTANT]** refine-slices description may under-trigger due to missing common trigger phrases

The `description` field for `/refine-slices` includes only "Refine vertical slice definitions and sequencing. Use after /define-slices to improve slice quality, ordering, and goal clarity." This is significantly shorter than other skills' descriptions, which include explicit `Common triggers:` lists (see define-slices, complete-slice, audit-architecture). Claude tends to under-trigger on skills, and without trigger phrases like "review slices", "improve slice goals", "slice quality", "are these slices good", "refine slices", "slices need work", the skill will likely be missed in natural conversation. All other skills in the codebase follow this pattern.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** refine-slices working copy pattern diverges from iteration-loop.md naming convention

The plan specifies working copies created "in-place" alongside originals (e.g., `goal-refining.md` next to `goal.md`). This is described as "consistent with refine-plan." However, refine-plan creates working copies using a `-refining` suffix on the plan file/directory name at the same level (e.g., `plan.md` -> `plan-refining.md`), which is a single file or directory. The refine-slices approach scatters working copies across multiple slice directories — a fundamentally different pattern. The iteration-loop.md reference specifies `{plan_file_paths}` as the mechanism for multi-file review, but the editor sub-agent and synthesis agent are designed around a single plan location. The plan should explicitly address how the editor handles N+1 files spread across different directories, and how cleanup works if the run is interrupted mid-rename (some originals overwritten, others not).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** sub-agent-prompts.md reuse strategy is underspecified for multi-file editing

Phase 2, task 4 says to "Reuse refine-plan's reviewer bootstrap and synthesis prompt templates by path" and "Create only the editor prompt section, customized for multi-file slice editing." But the reviewer bootstrap prompt template in refine-plan uses `Plan location: {plan_file_paths}` and `Plan type: {plan_type}` — both designed for a single plan file or directory. For refine-slices, reviewers need to review N goal files + 1 sequencing file, each in different directories. The plan mentions `{plan_file_paths}` receives a newline-separated list, but the shared preamble says "Plan file: {absolute path to plan file}" (singular for single-file) or "_overview.md + phase files" (for directory-based). Neither maps cleanly to "scattered files across multiple directories." The plan should specify exactly what `{plan_type}` value to use and how the preamble's "Plan Location" section should be filled for this novel multi-file pattern.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 signal tracking discovery logic has a correctness gap

Step 6d says to scan `completion/learnings.md` paths and sort by the `complete` entry timestamp in `flow-log.jsonl`. But the plan doesn't specify how to correlate a `completion/learnings.md` path back to its flow-log entry. Flow-log entries have `"scope"` fields like `"vertical-slices/01-start-project"` while the scan produces paths like `.project/vertical-slices/01-start-project/completion/learnings.md`. The plan should specify the exact matching logic (strip `.project/` prefix and `/completion/learnings.md` suffix to get the scope value). Also, the plan says to count `round-N/` directories in `<scope>/refinement/` — but the refinement directory structure has evolved across skills (refine-plan uses `<scope>/refinement/`, refine-slices uses `.project/vertical-slices/slices-refinement/`). The counting logic should clarify which refinement directory to scan for each scope type.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 SKILL.md supplementary instruction injection pattern not specified

The plan says to inject a supplementary instruction into the Software Architecture reviewer: "This review covers multiple files. Prefix each issue with the filename it applies to." It says "Do not modify the shared prompt itself" — good. But it doesn't specify *how* to inject. Looking at the refine-architecture skill, the reviewer weighting preamble is injected via a specific mechanism described in sub-agent-prompts.md. The plan should specify whether this injection happens in the bootstrap prompt (after the shared preamble path), as an additional placeholder, or as a separate instruction block. Given that all 4 reviewers need the filename-prefixing behavior (not just Software Architecture), the injection point matters.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 run directory naming inconsistent with iteration-loop.md convention

The iteration-loop.md reference says "The run directory is named `<thing>-refining/`" (e.g., `plan-refining/`, `architecture-refining/`). The plan specifies `.project/vertical-slices/slices-refinement/` — using `-refinement` instead of `-refining`. While this is a minor naming inconsistency, it breaks the convention established by both refine-plan and refine-architecture, which could confuse the orchestrator's resume detection or future tooling that glob for `*-refining/` directories.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1 guidance.md example scenario may be heavyweight

The plan asks guidance.md to include "Example scenario: trace a 5-slice case where observability is placed last — the evaluation should catch this and propose a reordering." Full worked examples in reference files consume context tokens every time the skill loads. Given the 500-line guidance for SKILL.md body and the existing guidance.md already covering templates and re-entry, this could push the combined context past the progressive disclosure threshold. Consider making the example a brief inline note (2-3 sentences) rather than a full trace.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 doesn't specify how audit-architecture Step 5b interacts with existing Step 6 (Graceful Stop)

Phase 4 adds Step 5b after Step 5 but before Step 6 (Graceful Stop). If the user triggers a graceful stop during Step 5b (system-profile refresh), the existing graceful stop cases (defined for gap analysis, reassessment, and quest proposal) don't cover this new step. The plan should add a graceful stop case for "interrupted during system-profile refresh" or note that stopping during 5b falls into the "quest proposal" partial case.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 doesn't address how refine-slices handles side quest goal.md files

The plan focuses on vertical slices (`vertical-slices/*/goal.md` + `sequencing.md`), but the description says "Refine vertical slice definitions and sequencing." Side quests have their own `goal.md` files but no sequencing. If the user runs `/refine-slices` while side quests exist, should the skill ignore side quest goals? The scope should be explicitly stated as vertical slices only (or include side quests with a different review approach).

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan demonstrates strong understanding of the skill ecosystem and correctly identifies the need for multi-file editing, shared infrastructure reuse, and new reviewer types. The four phases are well-scoped and the system-profile.md concept is well-designed. However, there are several IMPORTANT issues around the novel multi-file working copy pattern (which diverges from the single-file/directory convention the iteration loop was built for), the skill description's trigger coverage, and the signal tracking correlation logic. These need resolution before implementation — an implementer following this plan would hit ambiguity on how to wire reviewers to scattered files and how the editor manages cross-directory edits. Addressing the 4 IMPORTANT items and tightening the multi-file editing strategy would bring this to 9+.

## Summary
- Critical: 0
- Important: 4
- Minor: 5
