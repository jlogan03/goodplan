## Issues

**[CRITICAL — RESOLVED]** Missing `architecture/` directory creation from proposal upon approval

The iteration-1 critical issue is fully addressed. Step 5c now creates the initiative's `architecture/` directory with a well-defined transformation pipeline:
- Copies `_overview.md` from the proposal.
- Merges `<subsystem>-changes.md` files with corresponding top-level architecture files to produce target state.
- Strips the `new-` prefix from `new-<subsystem>.md` files.
- Copies unmodified top-level architecture files to ensure completeness.
- Handles the skip path (copies top-level wholesale, or creates minimal `_overview.md`).
- Includes a verification step requiring at least `_overview.md` to exist.

This correctly implements the two-layer architecture model and satisfies the Consumer Guide in `initiative-conventions.md`.

**[IMPORTANT — RESOLVED]** State validation now includes `needs-initiative-completion`

Step 3 now lists `needs-initiative-completion` as an invalid state with the message: "This initiative has finished all slices. Run `/complete` to wrap it up." This aligns with the shared state row 3 in the initiative state machine.

**[IMPORTANT — RESOLVED]** Active-initiative check reordered for fail-fast

The active-initiative check is now Step 1b, running immediately after initiative resolution (Step 1) and before state validation (Step 3) or proposal presentation (Step 5). This prevents unnecessary work when activation is blocked.

**[MINOR — RESOLVED]** `approved.md` template now distinguishes proposal vs skip path rationale

Step 5b now explicitly describes both paths: proposal path draws from user confirmation and proposal content; skip path draws from user confirmation and initiative goal only. The Architecture Proposal Files section uses "N/A -- architecture proposal skipped" for the skip case.

**[MINOR — RESOLVED]** Re-entry handling added

Step 1c detects partial completion (approved.md exists but no `__active__` prefix) and offers to resume from Step 5c (architecture directory creation). This handles the most likely interruption point — after approval but before activation.

**[MINOR]** Step 5c merge instruction is underspecified for the executing agent

Step 5c item 3 instructs: "read it and the corresponding top-level `.project/architecture/<subsystem>-*.md` file (if it exists). Merge the proposed changes into the top-level file's structure to produce the target state." The word "merge" leaves significant ambiguity for the executing LLM — should it append sections, replace matching sections, or do a semantic merge? Since `<subsystem>-changes.md` files describe *changes* (not complete target state), the agent needs to understand the delta format to produce the correct target. However, given that the executing agent will have both files in context and can reason about the merge, this is a minor concern — the intent is clear even if the mechanics are not fully prescribed.

File: ~/.claude/skills/start-initiative/SKILL.md:254
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Re-entry skip-to target assumes architecture creation is the bottleneck

Step 1c skips to Step 5c (Create Architecture Directory) on re-entry. This is correct for the most likely failure case (crash between approval and rename). However, if the failure occurred during Step 5c itself (e.g., partial architecture directory), the skill would re-run Step 5c without checking whether `architecture/` already has some files. The `mkdir -p` and `cp` commands are idempotent, so this is safe in practice, but explicitly noting "Step 5c is safe to re-run" in the re-entry section would make this clearer.

File: ~/.claude/skills/start-initiative/SKILL.md:94
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

All five iteration-1 issues have been resolved. The critical architecture-creation gap is thoroughly addressed with a well-structured transformation pipeline covering proposal path, skip path, and verification. The fail-fast reordering and re-entry handling bring the skill in line with patterns used by other skills in the codebase. The two remaining minor items are about documentation clarity rather than functional gaps — they would not cause failures in practice.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
