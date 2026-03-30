# Software Architecture Review

## Round 2 Issue Resolution Check

All 4 issues from round 2 attributed to this reviewer have been addressed:

- **IMPORTANT Step 9 adaptation inconsistency**: Resolved. The "Handle intermediate steps" task now explicitly says "use AskUserQuestion to present findings: leftover temp files, stale state entries, or dangling references to the initiative. Let the user decide which to address (interactive, not automated)." This makes clear it's an interactive check, consistent with the existing Step 9 pattern.

- **IMPORTANT Artifact promotion destinations**: Resolved. Step 6e now specifies concrete destination paths (`.project/research/`, `.project/brainstorm/`, `.project/prototypes/`), creation on demand ("create if they don't exist"), and conflict handling ("If a file with the same name already exists, prefix with `<initiative-name>_`").

- **MINOR Re-entry handling for initiative scope**: Resolved. Step 2 now includes re-entry detection for initiative scope: checks for `completion/learnings.md` (learnings done) and `completion/architecture-updates.md` (reconciliation done) to distinguish partial progress states, with explicit resume points.

- **MINOR Phase 1 no-op files**: Resolved. Phase 1 task 4 now says "Note: `workflow.md`, `CLAUDE.md`, and `.project/idea.md` already use `/complete` -- verify they have no residual references but expect no changes needed." This reframes them as verification rather than update targets.

## Issues

**[MINOR]** Archive numbering counter is ambiguous for first initiative

The plan says "Count existing `~~archived~~` directories in `.project/initiatives/` to determine `NN`." If there are zero archived directories, the count is 0, producing `~~archived~~00_<name>`. But the example in `initiative-conventions.md` starts at `01` (`~~archived~~01_initial/`). The convention file says "`NN` = completion-order counter" which is also ambiguous -- is it zero-indexed or one-indexed? The plan should specify: use `count + 1` (matching the convention's `01`-start example) or use `count` (zero-indexed). Since `initiative-conventions.md` examples start at `01`, the plan should explicitly say "NN = count of existing archived directories + 1" or reference the convention file's algorithm directly ("count existing `~~archived~~` directories" from the convention file, which produces the same result if the first archived directory was numbered `00`). This is a minor inconsistency that could cause an off-by-one in the archive name.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Artifact promotion conflict prefix creates inconsistent naming

Step 6e specifies that when a file with the same name exists at the destination, prefix with `<initiative-name>_`. This creates inconsistent naming: some files at `.project/research/` would be `topic.md` while others would be `initial_topic.md`. A more conventional approach would be to use subdirectories per initiative (`<initiative-name>/topic.md`) which preserves original filenames and naturally namespaces. However, the current approach is workable -- just noting that the flat-with-prefix strategy may be confusing when browsing `.project/research/` later. No action required unless the team prefers subdirectory isolation.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan is architecturally sound. All round 2 issues are resolved. Module boundaries are clear: Phase 1 handles the mechanical rename, Phase 2 adds initiative completion as a new scope type extending the existing step-by-step workflow. The two-layer architecture reconciliation (initiative target vs top-level reality) is well-designed and consistent with `initiative-conventions.md`. Data flow is explicit -- initiative-level learnings are cross-slice syntheses (not rehashes), artifact promotion copies rather than moves (preserving archive context), and archive numbering follows the established convention. The intermediate step decisions (skip 6b/6c, apply 6d/7/9b, adapt 9) are individually justified and consistent with initiative completion being a meta-operation rather than a feature implementation. The re-entry surface is now properly handled with partial state detection. To reach 10: resolve the archive numbering ambiguity (off-by-one risk) and consider whether flat-file artifact promotion will scale.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
