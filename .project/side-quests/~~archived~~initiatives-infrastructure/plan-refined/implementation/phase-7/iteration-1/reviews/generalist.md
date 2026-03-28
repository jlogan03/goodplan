# Generalist Review — Phase 7: Stale Assumption Detection + Two-Layer Architecture

## Issues

**[MINOR] Stale check `stat` fallback inconsistency between create-plan and guidance.md**
In `create-plan/SKILL.md` Step 3b, the stat fallback says `stat -f %m (macOS) or stat -c %Y (Linux)`. The `guidance.md` "Skip when" section says "use `stat` fallback" without specifying flags. These are consistent in intent but the guidance version is less specific — an implementer reading only guidance.md won't know which stat flags to use. Not a real problem since SKILL.md is the authoritative source and guidance.md is supplementary.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Scaffold detection scope ambiguity**
Both SKILL.md and guidance.md say "The top-level architecture is a scaffold — detected by the presence of a `<!-- scaffold -->` marker comment in `_overview.md`." This correctly applies to top-level `_overview.md`, but does not address whether initiative-level `architecture/_overview.md` could also be a scaffold. For the first initiative, `/define-architecture` writes directly to `architecture/` so it would not be a scaffold, but the check as written only looks at "the top-level" `_overview.md`. This is likely intentional and correct since initiative architecture is authored explicitly, but could be stated more clearly.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Two-layer loading in create-plan uses symlink-style glob**
SKILL.md Step 3 item 4 says to check for `initiatives/__active__*/architecture/`. This glob pattern is correct and consistent with the `__active__` prefix convention from initiative-conventions.md. The refine-plan shared-preamble uses the same pattern. Good consistency.
Resolution: N/A (not an issue, noting consistency)

## Consistency Check: create-plan vs refine-plan

**Stale detection**: Both skills implement the same check with the same skip conditions (`git log` returns nothing, scaffold marker). create-plan does it in Step 3b (Load Context), refine-plan does it in Step 2b (Codebase Context Discovery). The placement is appropriate for each skill's structure.

**Two-layer architecture**:
- create-plan SKILL.md Step 3 item 4: Loads initiative architecture, presents compatibility note for side quests, uses initiative arch as primary for initiative slices. Correct per initiative-conventions.md two-layer model.
- create-plan guidance.md: Has a dedicated "Two-Layer Architecture" section with a table and scope-dependent loading rules. References initiative-conventions.md. Correct.
- refine-plan shared-preamble.md: Added directive for reviewers to read `initiatives/__active__*/architecture/` and flag conflicts. Correct but lighter-weight than create-plan (appropriate since reviewers do codebase exploration rather than structured context loading).
- refine-plan SKILL.md Step 2b: Has "Initiative architecture awareness" directive. Consistent with shared-preamble.

**Frontmatter descriptions**: Both SKILL.md files updated to mention stale assumption detection and two-layer architecture. Correct.

## Verification Against Plan Tasks

All 7 tasks from the phase plan are addressed:
1. create-plan SKILL.md stale check -- present in Step 3b
2. refine-plan SKILL.md stale check -- present in Step 2b
3. create-plan guidance.md stale section -- present
4. create-plan context loading two-layer -- present in Step 3 item 4
5. refine-plan shared preamble two-layer -- present
6. create-plan guidance.md two-layer section -- present
7. SKILL.md description fields -- both updated

## Stale Check Correctness

The git date comparison approach is sound:
- Uses `git log -1 --format="%ai"` for commit dates (not author dates — `%ai` is author date ISO format, which is fine for this purpose)
- Correctly falls back to `stat` when git log returns nothing (uncommitted files)
- Scaffold skip prevents false positives on placeholder architecture
- The `git diff` presentation in create-plan lets the user see what actually changed

One subtlety: `%ai` gives author date, not commit date (`%ci`). For most workflows these are identical. In rebase scenarios they could differ, but author date is the more meaningful date for "when was this content written," so this is actually the better choice.

## Score: 9/10

Implementation is thorough and consistent across all four files. The two-layer model correctly follows initiative-conventions.md. Stale detection uses appropriate git mechanics with sensible skip conditions. Only minor polish items remain — no functional gaps.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
