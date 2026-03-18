# Merged Review Feedback — Maturity, Invariants, Fitness Functions Plan

## CRITICAL Issues

1. **Step numbering collision in Phase 2 — Steps 9b/9c/9d conflict with existing Step 9b (Expertise Check)**
   Files: `define-architecture/SKILL.md`
   All three reviewers flagged this. The plan introduces Steps 9b, 9c, 9d but Step 9b ("Expertise Check") already exists. Implementing as-is would overwrite or create ambiguous references. The graceful stop logic also references steps by number, compounding the risk.
   Fix: Explicitly renumber in Phase 2 tasks. Recommended: insert new steps as 8f/8g/8h (after architecture writing, before existing 9), or renumber existing 9b to 9e and use 9a/9b/9c for new steps. Update all cross-references and graceful stop handlers.
   Resolution: **DIRECTLY_ACTIONABLE**

2. **Phase 2 maturity steps sequenced after CLAUDE.md Update (Step 9) — new artifacts excluded from Project Context**
   Files: `define-architecture/SKILL.md`
   Flagged by Holistic and Agent Skill as CRITICAL, Software Architecture as IMPORTANT. Steps 9b-9d (maturity table, `invariants.md`, fitness candidates) execute after Step 9 (CLAUDE.md Update). Since `invariants.md` is created after CLAUDE.md is built, it won't appear in CLAUDE.md's "Also check" entries. Future sessions won't auto-load it.
   Fix: Move the new maturity/invariants/fitness steps to between Step 8 (architecture writing) and Step 9 (CLAUDE.md Update), so all artifacts exist when CLAUDE.md is generated.
   Resolution: **DIRECTLY_ACTIONABLE**

## IMPORTANT Issues

3. **Phase 3 audit-architecture: no finding category for fitness/invariant compliance results**
   Files: `audit-architecture/references/guidance.md`
   All three reviewers flagged this. Existing categories are "gap" and "improvement." Steps 3b/3c produce new finding types (stale fitness functions, missing tests, invariant violations) that don't map cleanly to either. Without templates, findings will be ad-hoc.
   Fix: Define new finding categories in `references/guidance.md`: (a) stale-fitness-function -> gap quest, (b) missing-fitness-function -> improvement quest, (c) invariant-violation -> gap quest, (d) invariant-amendment-needed -> improvement quest. Include severity mapping and template format.
   Resolution: **DIRECTLY_ACTIONABLE**

4. **Fitness function candidate location left ambiguous**
   Files: `maturity-conventions.md` (Phase 1), Phase 2 Step 9d
   Flagged by all three reviewers. Phase 2 offers a choice ("in the relevant architecture file or `_overview.md`") that conflicts with the design spec ("documented in architecture files alongside the subsystem"). Consuming skills (audit-architecture, refine-architecture) need a deterministic location.
   Fix: Phase 1's `maturity-conventions.md` must specify a single canonical location: a `## Fitness Functions` section in each `<subsystem>-api.md` file, with the maturity table column as a summary pointer. Phase 2 Step 9d should reference this convention, not offer alternatives.
   Resolution: **DIRECTLY_ACTIONABLE**

5. **Phase 3 refine-architecture changes don't update editor guardrails**
   Files: `refine-architecture/references/sub-agent-prompts.md`
   Flagged by Software Architecture reviewer. Maturity-related feedback will flow to the editor sub-agent, but editor guardrails have no guidance on maturity changes. The editor might update maturity levels without evidence or silently amend invariants.
   Fix: Add a task in Phase 3 to update `references/sub-agent-prompts.md`: (a) maturity level changes require evidence annotation, (b) fitness function entries must follow `maturity-conventions.md` format, (c) invariant changes require user confirmation.
   Resolution: **DIRECTLY_ACTIONABLE**

6. **Phase 3 graceful stop cases are incomplete**
   Files: `audit-architecture/SKILL.md`
   Flagged by Holistic (IMPORTANT) and Agent Skill (MINOR). The task mentions handling for Steps 3b/3c/3d but doesn't specify marker format for Step 3d, doesn't show where to insert in the existing graceful stop sequence (between existing Step 3 and Step 4 cases), and doesn't provide specific marker text.
   Fix: Specify the marker pattern (following existing `<!-- partial — interrupted during ... -->` format) for all three new steps, and state insertion point in the existing graceful stop sequence.
   Resolution: **DIRECTLY_ACTIONABLE**

7. **Phase 2 verification doesn't catch the step numbering collision**
   Files: Phase 2 verification section in plan
   Flagged by Agent Skill reviewer. The verification checklist confirms Steps 9b/9c/9d exist but doesn't check that the existing Step 9b (Expertise Check) was properly renumbered.
   Fix: Add verification item: "Confirm existing Step 9b (Expertise Check) has been renumbered and is still present."
   Resolution: **DIRECTLY_ACTIONABLE**

8. **Phase 3 refine-architecture guidance.md needs conflict resolution table update**
   Files: `refine-architecture/references/guidance.md`
   Flagged by Agent Skill reviewer. No conflict resolution rule for maturity assessment disagreements between reviewers.
   Fix: Add row to conflict resolution table: "Maturity assessment | Trust Software Architecture reviewer for structural evidence, USER_INPUT for business-context promotions."
   Resolution: **DIRECTLY_ACTIONABLE**

## MINOR Issues

9. **Phase 4 Holistic reviewer criteria numbering not specified**
   Files: Holistic reviewer prompt file
   Flagged by Holistic and Software Architecture reviewers. New criteria ("Invariant compliance" and "Fitness function awareness") need numbers 12 and 13 to maintain sequential convention.
   Resolution: **DIRECTLY_ACTIONABLE**

10. **Phase 1 `maturity-conventions.md` consumer guide table is stale on creation**
    Files: `maturity-conventions.md`
    Flagged by Software Architecture reviewer. Consumer guide maps fitness functions only to SW Architecture reviewer, but Phase 4 also adds them to Holistic reviewer.
    Fix: Either update Phase 1 table to include both reviewers, or add Phase 4 task to update consumer guide.
    Resolution: **DIRECTLY_ACTIONABLE**

11. **Phase 2 redundant `mkdir -p .project/architecture/` in Step 9c**
    Files: Phase 2 plan
    Flagged by Software Architecture reviewer. Harmless but misleading — architecture/ already exists at this point.
    Fix: Remove or annotate as safety check.
    Resolution: **DIRECTLY_ACTIONABLE**

12. **Phase 3 refine-architecture context loading insertion point unspecified**
    Files: `refine-architecture/SKILL.md`
    Flagged by Holistic reviewer. Task says "add: Read `maturity-conventions.md`" but doesn't say where in Step 0's 6 sub-steps.
    Fix: Insert after sub-step 1 (read architecture files), before sub-step 3 (prerequisite check).
    Resolution: **DIRECTLY_ACTIONABLE**

13. **Phase 1 `maturity-conventions.md` should include a table of contents**
    Files: `maturity-conventions.md`
    Flagged by Agent Skill reviewer. File will have 6 sections and likely exceed 100 lines.
    Resolution: **DIRECTLY_ACTIONABLE**

14. **Phase 1 verification is read-only — no Markdown rendering check**
    Files: Phase 1 verification section
    Flagged by Holistic reviewer. Suggest adding "Verify maturity table format example renders as valid Markdown."
    Resolution: **DIRECTLY_ACTIONABLE**

## DIRECTLY_ACTIONABLE (for loop exit)

1. **Step numbering collision** (Issues #1, #7): In Phase 2 tasks, explicitly state renumbering scheme. Recommended approach: insert new steps as 8f (Maturity Table), 8g (Invariants), 8h (Fitness Candidates) — after Step 8e (architecture writing) and before Step 9 (CLAUDE.md Update). This also resolves Issue #2 (CLAUDE.md sequencing). Update Phase 2 verification to confirm existing Expertise Check step is renumbered and present.

2. **CLAUDE.md sequencing** (Issue #2): Resolved by placing new steps before Step 9. No separate fix needed if #1 uses 8f/8g/8h approach.

3. **Finding categories for audit-architecture** (Issue #3): In Phase 3 tasks for `audit-architecture/references/guidance.md`, add explicit requirement to define four finding categories with severity mapping: stale-fitness-function (gap), missing-fitness-function (improvement), invariant-violation (gap), invariant-amendment-needed (improvement). Include template format for each.

4. **Canonical fitness function location** (Issue #4): In Phase 1 `maturity-conventions.md` Fitness Function Convention section, specify: full entries go in `## Fitness Functions` section of each `<subsystem>-api.md`; maturity table column contains summary pointer only. Remove "or `_overview.md`" alternative from Phase 2 Step 9d.

5. **Editor guardrails for maturity** (Issue #5): Add Phase 3 task to update `refine-architecture/references/sub-agent-prompts.md` with three rules: maturity changes need evidence, fitness entries follow conventions format, invariant changes require user confirmation.

6. **Graceful stop completeness** (Issue #6): In Phase 3 audit-architecture section, specify marker text for Steps 3b, 3c, 3d using existing `<!-- partial — interrupted during ... -->` pattern. State insertion between existing Step 3 and Step 4 in graceful stop section.

7. **Conflict resolution table** (Issue #8): Add Phase 3 task to update `refine-architecture/references/guidance.md` conflict resolution table with maturity assessment row.

8. **Holistic reviewer numbering** (Issue #9): Phase 4 Holistic reviewer additions should be numbered 12 (Invariant compliance) and 13 (Fitness function awareness).

9. **Consumer guide staleness** (Issue #10): Update Phase 1 consumer guide table to include both SW Architecture and Holistic reviewers for fitness functions (since Phase 4 adds it to Holistic).

10. **Minor plan cleanup** (Issues #11-14): Remove redundant mkdir, specify context loading insertion point in refine-architecture, add TOC requirement for conventions file, add Markdown rendering verification to Phase 1.

## RESEARCH_NEEDED

None — all issues are directly actionable or require codebase exploration (see below).

**CODEBASE_EXPLORATION:**

1. **Shared reviewer/preamble file usage across skills** (from Holistic reviewer, Issue in Phase 4 verification): Confirm that `/refine-slices` and `/implement-plan` use the same `shared-preamble.md` and `reviewers-always.md` files that Phase 4 modifies. Tool strategy: `Grep` for `shared-preamble.md` and `reviewers-always.md` across all skill directories to confirm shared file paths.

## Contradictions Resolved

1. **CLAUDE.md sequencing severity**: Holistic and Agent Skill rated this CRITICAL; Software Architecture rated it IMPORTANT. Trusted Agent Skill (domain specialist for skill execution flow) — classified as CRITICAL because the practical impact is that `invariants.md` won't be loaded in future sessions, breaking the maturity workflow's core value proposition.

2. **Graceful stop incompleteness severity**: Holistic rated IMPORTANT; Agent Skill rated MINOR. Trusted Agent Skill (domain specialist for skill execution mechanics) — classified as IMPORTANT because graceful stops are a core skill reliability feature and incomplete markers would cause confusing resume behavior.

### Available Research

- `/Users/iwhite/Repos/goodplan/.project/side-quests/maturity-invariants-fitness/research/_codebase-context.md` — codebase context summary including step numbering findings and skill structure

**CODEBASE_EXPLORATION results (shared file blast radius):**

- `reviewers-cross-cutting.md` (Software Architecture): used by `refine-plan`, `refine-slices`, AND `implement-plan`. Changes affect 3 skills.
- `reviewers-always.md` (Holistic): used ONLY by `refine-plan`. Zero blast radius to other skills.
- `shared-preamble.md` (refine-plan's copy): used by `refine-plan` and `refine-slices`. `implement-plan` has its OWN independent copy — changes to refine-plan's shared-preamble do NOT affect implement-plan.

This means Phase 4's changes to `reviewers-cross-cutting.md` will automatically apply to `refine-slices` and `implement-plan` reviewers (correct behavior). Phase 4's changes to `reviewers-always.md` only affect `refine-plan`. Phase 4's changes to `shared-preamble.md` affect `refine-plan` and `refine-slices` but NOT `implement-plan` — if implement-plan should also check invariants, its own `shared-preamble.md` needs a separate update.

## Unresolved (USER_INPUT required)

None — all issues have clear resolutions within the reviewers' domain expertise. No cross-domain contradictions remain unresolved.
