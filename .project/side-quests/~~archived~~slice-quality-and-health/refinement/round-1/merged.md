### CRITICAL Issues

1. **`/refine-slices` duplicates shared infrastructure instead of reusing it** (shared-preamble.md + sub-agent-prompts.md)
   - Files: Phase 2 tasks 5 and 6 in the plan
   - All three reviewers flagged this (software-architecture as CRITICAL, holistic and agent-skill as IMPORTANT)
   - The plan creates a new `shared-preamble.md` for refine-slices, but `refine-plan/references/shared-preamble.md` is already parameterized and reusable. `refine-architecture` already references it by path. Similarly, the bootstrap and synthesis prompt templates in `sub-agent-prompts.md` are parameterized and reusable — only the editor prompt section needs slice-specific customization.
   - Fix: Delete the shared-preamble.md creation task. Reference `~/.claude/skills/refine-plan/references/shared-preamble.md` by path. For sub-agent-prompts.md, reuse refine-plan's bootstrap and synthesis templates by path; create only the slice-specific editor prompt.
   - Resolution: DIRECTLY_ACTIONABLE

### IMPORTANT Issues

2. **`system-profile.md` has no canonical format and split ownership across three skills**
   - Files: Phase 3 Step 6b, Phase 4 Step 5b, goal.md
   - Flagged by: software-architecture (IMPORTANT), agent-skill (IMPORTANT), holistic (IMPORTANT — format ambiguity)
   - Three skills (complete-slice, audit-architecture, and implicitly define-slices) create/update `.project/system-profile.md` but no shared format definition exists. The five sections (Health, Performance Characteristics, Extensibility, Technical Debt, Recent Changes) need a canonical definition.
   - Fix: Create `_shared/references/system-profile-format.md` defining the canonical section structure. Designate `/complete-slice` as primary owner (highest write frequency). Both skills reference that format. `/audit-architecture` appends rather than overwrites when sections were recently updated.
   - Resolution: DIRECTLY_ACTIONABLE

3. **Phase 3 signal tracking reads flow-log.jsonl but it lacks structured iteration/deviation data**
   - Files: Phase 3 Step 6d
   - Flagged by: all three reviewers (IMPORTANT)
   - flow-log.jsonl only has `ts`, `phase`, `scope`, `status`, `summary` — no structured fields for iteration counts or deviation metrics. Extracting from prose summaries is fragile.
   - Fix: Have signal tracking read the actual artifact directories instead of flow-log.jsonl. Count `round-N/` directories in `refinement/` for iteration count; count issues in last `merged.md` for deviation metric. This is more robust and doesn't require changing the shared flow-log format.
   - Resolution: DIRECTLY_ACTIONABLE

4. **Phase 2 multi-file editing pattern is unspecified for refine-slices**
   - Files: Phase 2 SKILL.md, sub-agent-prompts.md editor section
   - Flagged by: software-architecture (IMPORTANT), agent-skill (IMPORTANT)
   - The iteration loop's editor sub-agent expects a single plan path, but refine-slices edits N+1 files (one sequencing.md + N goal.md files). The plan doesn't specify how the editor receives file paths, how reviewers tag issues to specific files, or how `{plan_file_paths}` is populated.
   - Fix: Add a task to Phase 2 defining the editor's multi-file coordination strategy. The editor receives a manifest of all working copy paths. Reviewer prompts must tag issues with the specific filename they apply to. The `{plan_file_paths}` placeholder receives a newline-separated list.
   - Resolution: DIRECTLY_ACTIONABLE

5. **Phase 1 three-lens internal loop has no concrete pass/fail criteria or iteration cap**
   - Files: Phase 1 Step 4b guidance
   - Flagged by: software-architecture (IMPORTANT), agent-skill (MINOR — exit condition)
   - The loop iterates "until all lenses pass or reasonable alternatives are exhausted" with no scoring rubric, no iteration limit, and no defined behavior when alternatives are exhausted.
   - Fix: Define concrete pass/fail criteria per lens (e.g., "Tracer bullet: every slice has at least one verification step running actual code" / "Risk: first 50% of slices cover all high-risk items" / "Observability: at least one of first 2 slices includes logging/debug infrastructure"). Cap internal iterations at 3. If all three lenses can't be satisfied simultaneously, present the trade-off to the user.
   - Resolution: DIRECTLY_ACTIONABLE

6. **Phase 2 early exit threshold is identical to full pass, undermining iterative review**
   - Files: Phase 2 iteration loop parameters
   - Flagged by: holistic (IMPORTANT)
   - Early exit at "all reviewers >= 9 after minimum 1 iteration" with full pass also at >= 9 means the loop will almost always exit after a single round.
   - Fix: Set early exit to >= 8 after minimum 2 iterations. Keep full pass at >= 9 after up to 4 iterations. This preserves the iterative review purpose.
   - Resolution: DIRECTLY_ACTIONABLE

7. **Phase 2 reviewer count (4) contradicts goal.md (2-3)**
   - Files: Phase 2 overview, goal.md
   - Flagged by: holistic (IMPORTANT), software-architecture (MINOR)
   - Fix: Update goal.md to reflect the plan's 4-reviewer decision, or add a "Key decisions" note in the plan explaining the deviation.
   - Resolution: DIRECTLY_ACTIONABLE

### MINOR Issues

8. **Phase 1 dry-run verification is vague ("mentally trace the flow")**
   - Fix: Replace with concrete verification — read the output files and confirm content matches expectations for the example scenario.
   - Resolution: DIRECTLY_ACTIONABLE

9. **Phase 4 references a specific line number (147) for TODO removal**
   - Flagged by: holistic (MINOR), software-architecture (MINOR)
   - Fix: Reference by content marker: `<!-- TODO: When system-profile.md is implemented... -->` rather than line number.
   - Resolution: DIRECTLY_ACTIONABLE

10. **No documentation update for workflow.md**
    - Flagged by: holistic (MINOR)
    - Adding `/refine-slices` and changing `/complete-slice` may warrant a workflow.md update.
    - Resolution: CODEBASE_EXPLORATION

11. **Phase 2 "Register the skill" task is overspecified**
    - Fix: Simplify to "Confirm the SKILL.md file is discoverable at `~/.claude/skills/refine-slices/SKILL.md`." No central registry exists.
    - Resolution: DIRECTLY_ACTIONABLE

12. **Phase ordering: Phases 1 and 4 could be parallelized**
    - Fix: Add a note in the plan that Phases 1 and 4 are independent and can be done in either order or in parallel.
    - Resolution: DIRECTLY_ACTIONABLE

13. **Phase 2 run directory location is ambiguous**
    - Flagged by: agent-skill (MINOR)
    - Fix: Specify explicitly: `.project/vertical-slices/slices-refining/` (or `.project/slices-refining/` if refining all slices at once).
    - Resolution: DIRECTLY_ACTIONABLE

14. **No verification that `/refine-slices` integrates with the workflow state machine**
    - Flagged by: software-architecture (MINOR)
    - Fix: Add task specifying state.md values and flow-log entry format after refine-slices completes.
    - Resolution: DIRECTLY_ACTIONABLE

15. **Phase 4 Step 5b doesn't specify system-profile.md update presentation format**
    - Flagged by: agent-skill (MINOR)
    - Fix: Always present a brief summary of changes and proceed unless the user objects — consistent with audit-architecture's existing pattern.
    - Resolution: DIRECTLY_ACTIONABLE

### DIRECTLY_ACTIONABLE (for loop exit)

1. **Delete shared-preamble.md creation task; reuse by path** — Phase 2 task 5: Remove the task to create `refine-slices/references/shared-preamble.md`. Instead, add a note that the skill references `~/.claude/skills/refine-plan/references/shared-preamble.md` directly. In Phase 2 task 6 (sub-agent-prompts.md), state: "Reuse refine-plan's reviewer bootstrap and synthesis prompt templates by path. Create only the editor prompt section, customized for multi-file slice editing."

2. **Create canonical system-profile.md format** — Add a new task (Phase 3, before Step 6b): Create `_shared/references/system-profile-format.md` defining the five sections (Health, Performance Characteristics, Extensibility, Technical Debt, Recent Changes) with their sub-structures. Update Phase 3 Step 6b and Phase 4 Step 5b to reference this shared format. Note that `/complete-slice` is the primary owner.

3. **Fix signal tracking to read artifact directories** — Phase 3 Step 6d: Replace "Read flow-log.jsonl entries" with "Count `round-N/` directories in `<scope>/refinement/` for iteration count. Read the last `merged.md` for issue count and severity breakdown. Read `<scope>/implementation/` deviation notes if present." Remove dependency on flow-log prose parsing.

4. **Define multi-file editing pattern** — Add a task to Phase 2 (after task 4, before guidance.md): "Define the editor's multi-file coordination strategy in sub-agent-prompts.md. The editor receives a manifest listing all working copy paths (one sequencing-refining.md + N goal-refining.md). Reviewer prompts must prefix each issue with the target filename. The `{plan_file_paths}` placeholder receives a newline-separated list of all working copy paths."

5. **Add three-lens pass/fail criteria and cap** — Phase 1 Step 4b: Replace the open-ended loop with: "Evaluate each lens against concrete criteria: (1) Tracer bullet — every slice has at least one verification step that runs actual code; (2) Risk — first 50% of slices cover all high-risk architecture items; (3) Observability — at least one of the first 2 slices includes logging/debug infrastructure. Cap internal iterations at 3. If all three lenses conflict, present the trade-off to the user with AskUserQuestion."

6. **Fix early exit threshold** — Phase 2 iteration loop parameters: Change early exit from ">= 9 after 1 iteration" to ">= 8 after minimum 2 iterations." Keep full pass at ">= 9."

7. **Reconcile reviewer count** — Phase 2 overview: Add a note: "Goal.md specified 2-3 reviewers; this plan uses 4 (Software Architecture always-on + 3 slice-specific) after determining that sequencing, verification, and scope concerns each need specialist review. Update goal.md accordingly."

8. **Fix line number reference** — Phase 4: Replace "Remove the TODO comment on line 147" with "Remove the `<!-- TODO: When system-profile.md is implemented... -->` comment."

9. **Concrete Phase 1 verification** — Phase 1 verification: Replace "mentally trace the flow" with "Read the output files (sequencing.md and each goal.md) and verify: (a) slice ordering satisfies all three lenses, (b) each goal.md has concrete success criteria, (c) the file structure matches the defined format."

10. **Simplify skill registration** — Phase 2 registration task: Replace with "Confirm `~/.claude/skills/refine-slices/SKILL.md` exists and is discoverable by Claude Code (no central registry needed)."

11. **Specify run directory location** — Phase 2 SKILL.md: Specify the run directory as `.project/vertical-slices/slices-refining/` explicitly.

12. **Add state machine integration** — Phase 2: Add a task specifying the state.md transition and flow-log entry format after refine-slices completes.

13. **Add parallelization note** — Plan overview: Note that Phases 1 and 4 are independent and can be executed in parallel.

14. **Specify system-profile update presentation** — Phase 4 Step 5b: "Always present a brief summary of proposed changes before writing. Proceed unless the user objects."

### RESEARCH_NEEDED

*(No RESEARCH_NEEDED items.)*

**CODEBASE_EXPLORATION items:**

- **workflow.md update scope**: Check `workflow.md` to determine whether it documents the skill flow (define-slices -> create-plan -> refine-plan -> implement-plan -> complete-slice). If it does, adding `/refine-slices` between define-slices and create-plan, and the new `/complete-slice` signal tracking, should be documented there. Tool strategy: `Read workflow.md`, search for skill flow references.

### Contradictions Resolved

1. **shared-preamble severity**: software-architecture flagged as CRITICAL; holistic and agent-skill flagged as IMPORTANT. Trusted software-architecture (domain specialist on reuse/duplication architecture). Merged as CRITICAL.

2. **Reviewer count severity**: holistic flagged as IMPORTANT; software-architecture flagged as MINOR. Trusted holistic (generalist with better view of goal-plan consistency). Merged as IMPORTANT but low-priority since the fix is trivial (update goal.md).

3. **Three-lens exit condition**: software-architecture flagged iteration cap + criteria as IMPORTANT; agent-skill flagged missing exit behavior as MINOR. Merged as IMPORTANT using software-architecture's more specific recommendation (concrete criteria + cap at 3).

### Unresolved (USER_INPUT required)

*(No USER_INPUT items — all issues are DIRECTLY_ACTIONABLE or CODEBASE_EXPLORATION.)*

### Available Research

- workflow.md documents the full phase flow (1-10). `/refine-slices` is not mentioned — it should be added between phase 4 (Plan Vertical Slices) and phase 5 (per-slice Explore Loop) as an optional step: "4b. Refine Slices (optional — iterative review of slice goals)". The file structure section should include `system-profile.md`. The "Signals of Workflow Health" section already tracks similar metrics to the plan's signal tracking — the plan should reference this alignment.
