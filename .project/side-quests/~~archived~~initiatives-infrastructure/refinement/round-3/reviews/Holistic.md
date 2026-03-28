# Holistic Review — Initiatives Infrastructure (Round 3)

## Issues

**[IMPORTANT]** `/refine-architecture` and `/audit-architecture` are not addressed in any phase

Both `/refine-architecture` and `/audit-architecture` hardcode `.project/architecture/` as their operating path. `/refine-architecture` says "No arguments — always operates on `.project/architecture/`." `/audit-architecture` Step 1 globs `.project/architecture/**/*.md`. When the first initiative's architecture lives at `initiatives/__active__initial/architecture/`, neither skill will find it. The confirmed goal says "Done when all skills work within initiative scope," but neither skill appears in any phase. Either add tasks to Phases 5 or 8 to update these skills' path resolution (at minimum: detect active initiative and resolve architecture path accordingly), or explicitly document them as out-of-scope follow-up. The `maturity-conventions.md` file already references initiatives in its descriptions of `/audit-architecture` behavior (line 81), making the gap more visible.

Resolution: USER_INPUT

---

**[MINOR]** Phase 1 consumer guide should list `/refine-architecture` and `/audit-architecture` as architecture readers

Phase 1 includes a "Consumer Guide: Which skills create/read/update initiative artifacts." `/refine-architecture` reads and updates `architecture/` files; `/audit-architecture` reads them and proposes side quests. Both need to appear in the consumer guide even if their initiative-awareness updates are deferred, so that future implementers know these skills exist and need eventual updates.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 8 `/refine-slices` run directory path uses a different convention than the working copy path

Phase 8 says run directory is `.project/initiatives/__active__<name>/vertical-slices/slices-refining/` but the current `/refine-slices` SKILL.md uses in-place working copies alongside originals (e.g., `goal-refining.md` next to `goal.md`). The run directory change is clear, but there's no task to update the manifest construction logic or the Scope Exclusion clause. The current Scope Exclusion says "Only vertical slice goal files under `.project/vertical-slices/` are in scope" — Phase 8 correctly identifies this needs updating to include `initiatives/__active__*/vertical-slices/`, which is present. No action needed on Scope Exclusion. However, the manifest construction (which globs for `goal.md` files and creates `goal-refining.md` working copies) will also need path updates. This is implicit in the scope resolution task but should be called out explicitly since it's a separate code path in the skill.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 Mode A verification missing check for `initiatives/` directory creation

Phase 2 verification says "Smoke test: run Mode A in a temp directory, verify `initiatives/__active__initial/goal.md` exists and `vertical-slices/` does not." This is good but should also verify `initiatives/` directory itself exists (the `mkdir -p` on `__active__initial` creates it implicitly, but confirming is cheap and catches edge cases).

Resolution: MINOR

---

## Round 2 Fix Verification

All Round 2 issues have been addressed:

1. **Phase 5 `/define-architecture` output path** (R2 IMPORTANT): Fixed. Phase 5 now specifies the skill reads state.md to detect the active initiative and uses the convention file to derive the correct output path. Initiative-type detection logic is explicitly called out.

2. **Phase 8 `/complete-slice` architecture update direction** (R2 IMPORTANT): Fixed. Phase 8 now correctly says `/complete-slice` should "(a) compare the implementation against the initiative's `architecture/` (the target) to verify alignment, (b) propose updates to top-level `.project/architecture/` (current reality — reflecting what was actually built), (c) leave the initiative's `architecture/` unchanged." This aligns with the two-layer model.

3. **Phase 1 first-initiative row 5 empty directory edge case** (R2 IMPORTANT): Fixed. Row 5 now reads "`architecture/_overview.md` exists (not just empty directory), no sequencing" — checking for a specific file rather than just directory existence.

4. **Phase 5 `explore-logic.md` update task** (R2 MINOR): Fixed. Explicit task added to "Update `explore-logic.md`" with an "Initiative" row.

5. **Phase 1 transition table split** (R2 MINOR): Fixed. Transition tables are now split into "First initiative transitions" and "Subsequent initiative transitions" with clear labels.

6. **Phase 2 Mode B active initiative notification** (R2 MINOR): Fixed. Task now includes notification text: "Note: Initiative '<name>' is currently active..."

7. **Phase 7 scaffold marker specification** (R2 MINOR): Fixed. Now specifies `<!-- scaffold -->` marker comment in `_overview.md`.

8. **Phase 4 Format B side quest section** (R2 MINOR): Fixed. Template now includes `## Side Quests` section.

9. **Phase 6 `guidance.md` update task** (R2 MINOR): Fixed. Explicit task added for updating `define-slices/references/guidance.md`.

## Score: 9/10

The plan is in excellent shape after two rounds of refinement. All Round 1 and Round 2 issues have been addressed. The phasing is logical, tasks are well-specified with clear success criteria, and the verification steps now include smoke tests. The remaining gap is that `/refine-architecture` and `/audit-architecture` are not addressed — whether they should be in-scope or explicitly deferred is a user decision. The three MINOR items are small polish. To reach 10: resolve the `/refine-architecture` + `/audit-architecture` scope question and add the two small clarifications.

## Summary
- Critical: 0
- Important: 1
- Minor: 3
