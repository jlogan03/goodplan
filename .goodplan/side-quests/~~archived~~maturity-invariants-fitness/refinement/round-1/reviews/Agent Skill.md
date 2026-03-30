# Agent Skill Review — Maturity, Invariants, and Fitness Functions Plan

## Issues

**[CRITICAL]** Step numbering collision in Phase 2 will break define-architecture re-entry and graceful stop logic
The plan introduces Steps 9b, 9c, 9d in define-architecture, but Step 9b already exists as "Expertise Check." The existing SKILL.md's graceful stop handling (Step 8e) references steps by number. The plan's Phase 2 tasks say "Add Step 9b — Create Maturity Table" without addressing the existing 9b. An implementer following this plan literally would either overwrite the expertise check or create ambiguous numbering. The plan must explicitly specify how to renumber: either shift existing 9b to a later position (e.g., 9e or 10, renumbering subsequent steps) or insert the new steps before Step 9 (e.g., as 8f/8g/8h). The research file (`_codebase-context.md`) identifies this collision clearly, but the plan does not resolve it.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Phase 2 inserts maturity steps after CLAUDE.md Update (Step 9), causing maturity artifacts to be excluded from CLAUDE.md Project Context
Step 9 reads architecture files and builds the CLAUDE.md Project Context section listing them. The plan says new steps go "After architecture files are written (Step 9)" — but Step 9 is the CLAUDE.md Update, not the architecture writing step (that's Step 8). If Steps 9b-9d (maturity table, invariants.md, fitness candidates) execute after Step 9, CLAUDE.md won't reference `architecture/invariants.md` or the updated `_overview.md` maturity section. Future sessions won't know to load these artifacts. The new steps must be inserted between Step 8 (architecture writing) and Step 9 (CLAUDE.md Update), or Step 9 must be explicitly updated to re-run after the new steps complete.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 audit-architecture tasks lack a finding category for fitness function and invariant compliance results
The existing `audit-architecture/references/guidance.md` has two finding-to-side-quest mappings: gap quests and improvement quests. Steps 3b (fitness function audit) and 3c (invariant compliance check) produce a new category of findings — compliance failures, stale documentation, missing test files. The plan's task "Update `references/guidance.md`" mentions adding sections for audit strategy but does not specify a new finding category or side quest type for these results. Without this, an implementer won't know how to format findings from 3b/3c or how they flow into side quest proposals (Step 4). The guidance update task should explicitly require: (a) a new finding type (e.g., `type: compliance`) or a mapping of these findings onto existing gap/improvement types, and (b) a template for reporting fitness function status (documented-and-present, documented-but-missing, stale).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 does not specify where fitness function entries live within architecture files
The plan says fitness function candidates go "in the relevant architecture file or as a section in `_overview.md` — whichever is simpler." The design spec says they are "documented in the architecture files alongside the subsystem they protect." The maturity table's "Fitness Functions" column contains a pointer (test file path or "candidate — not yet written"). But the plan's Phase 1 task for `maturity-conventions.md` does not pin down exactly where the full fitness function entry (property, test path, what it verifies) lives vs what the maturity table column contains. This ambiguity will surface in Phase 2 (define-architecture doesn't know where to write them) and Phase 3 (audit-architecture doesn't know where to read them). The conventions file should specify a single canonical location pattern — e.g., a `## Fitness Functions` section in each `<subsystem>-api.md` file, with the maturity table column being a summary pointer.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 verification section does not catch the step numbering collision
The verification checklist says "Confirm Steps 9b/9c/9d exist with clear instructions" without noting that the implementer must also verify the existing Step 9b (Expertise Check) was properly renumbered. This means the verification could pass even if the collision was silently introduced. Add a verification item: "Confirm existing Step 9b (Expertise Check) has been renumbered and is still present in the SKILL.md."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 refine-architecture changes are incomplete — guidance.md needs conflict resolution table update
The plan updates `references/guidance.md` with a "Maturity Evaluation" section for the SW Architecture reviewer but does not update the Conflict Resolution table in that same file. When the SW Architecture reviewer disagrees with other reviewers about maturity assessments (e.g., SW Architecture says a subsystem should be promoted but Holistic disagrees), there is no conflict resolution rule. Add a row to the existing conflict resolution table: `Maturity assessment | Trust Software Architecture reviewer for structural evidence, USER_INPUT for business-context promotions`.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 4 verification mentions checking `/refine-slices` and `/implement-plan` but the plan has no tasks for those skills
The verification says "Verify the same reviewer files are also used by `/refine-slices` and `/implement-plan` — the updates automatically apply to those skills too (shared files)." This is a verification-only note (good), but it reads as if the implementer should check something that isn't actually a task. Clarify that this is a smoke test confirming the shared files are indeed shared, not a task to update those skills.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 audit-architecture graceful stop update task is vague about what "handling" means
The task says "Add handling for interruption during Steps 3b/3c/3d" and gives examples ("note which subsystems were checked") but does not specify the marker format. The existing graceful stop uses HTML comment markers with a specific pattern (`<!-- partial — interrupted during ... -->`). The task should specify that the new cases follow the same marker pattern and provide the specific marker text for each new step.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 `maturity-conventions.md` will be a large reference file but no table of contents is specified
The plan specifies 6 sections for this file. At the level of detail described (maturity levels table, maturity table format with example, promotion criteria, invariants format with examples, fitness function convention, consumer guide table), this file will likely exceed 100 lines. Per progressive disclosure best practices, reference files over 100 lines should include a table of contents. Add a TOC requirement to the Phase 1 task.
Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

Two CRITICAL issues (step numbering collision and CLAUDE.md ordering) would cause incorrect behavior if implemented as-is — the maturity artifacts wouldn't appear in CLAUDE.md for future sessions, and step numbering would be ambiguous or would overwrite the expertise check. Three IMPORTANT issues (missing finding category, ambiguous fitness function location, incomplete verification) reduce implementability. The overall approach is sound and the phasing is correct, but the plan needs these specific fixes before an implementer could follow it without guessing. To reach 9+: resolve the two CRITICALs (explicit renumbering and step insertion point), address the finding category gap, pin down fitness function canonical location, and fix the verification gaps.

## Summary
- Critical: 2
- Important: 3
- Minor: 3
