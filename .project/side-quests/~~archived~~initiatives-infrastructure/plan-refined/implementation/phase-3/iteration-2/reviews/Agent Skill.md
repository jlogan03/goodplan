## Issues

**[CRITICAL — RESOLVED]** Missing `architecture/` creation from proposal upon approval
Step 5c now exists and correctly handles both paths:
- **Proposal path**: Creates `architecture/`, copies `_overview.md`, merges `<subsystem>-changes.md` with top-level files, strips `new-` prefix for new subsystems, and copies unmodified top-level files to ensure completeness.
- **Skip path**: Copies top-level architecture as baseline, with a fallback minimal `_overview.md` if top-level is empty.
- **Verification**: Checks `_overview.md` exists, stops on failure.
This fully addresses the critical gap. The two-layer architecture model is now correctly implemented.
File: ~/.claude/skills/start-initiative/SKILL.md:236
Resolution: N/A (resolved)

**[IMPORTANT — RESOLVED]** Description under-specifies trigger phrases
The description now includes: 'review architecture proposal', 'ready to build', 'let's build this initiative', 'activate this'. These cover the natural language patterns users would use after `/define-architecture` completes.
File: ~/.claude/skills/start-initiative/SKILL.md:8
Resolution: N/A (resolved)

**[IMPORTANT — RESOLVED]** `approved.md` template unclear on skip-path content
Step 5b now has a clear preamble (lines 213-215) distinguishing the two entry paths and specifying what content each path produces for the Rationale and Architecture Proposal Files sections.
File: ~/.claude/skills/start-initiative/SKILL.md:211
Resolution: N/A (resolved)

**[IMPORTANT — RESOLVED]** State validation misses `needs-initiative-completion` state
Step 3 now includes `needs-initiative-completion` in the invalid-state list (line 136) with the message: "This initiative has finished all slices. Run `/complete` to wrap it up."
File: ~/.claude/skills/start-initiative/SKILL.md:136
Resolution: N/A (resolved)

**[IMPORTANT — RESOLVED]** Active-initiative check runs too late (fail-fast)
The active-initiative check is now Step 1b (lines 82-92), running immediately after initiative resolution and before state validation or context loading. This avoids unnecessary work before discovering activation is blocked.
File: ~/.claude/skills/start-initiative/SKILL.md:82
Resolution: N/A (resolved)

**[MINOR — RESOLVED]** No explicit handling of `__active__` prefix in argument
Step 1 normalization rule 5 (line 32) now checks if the resulting name starts with `__active__` or equals `initial`, and stops with a clear message.
File: ~/.claude/skills/start-initiative/SKILL.md:32
Resolution: N/A (resolved)

**[MINOR — RESOLVED]** Re-entry / partial-completion handling
Step 1c (lines 94-106) now detects when `approved.md` exists but the directory hasn't been renamed, and resumes from Step 5c.
File: ~/.claude/skills/start-initiative/SKILL.md:94
Resolution: N/A (resolved)

**[MINOR]** Active Slice field inconsistency with `create-initiative`
Step 7 sets Active Slice to `initiatives/<name>` (line 312, no `__active__` prefix), but `/create-initiative` Mode A sets it to `initiatives/__active__initial` (with prefix). The flow-log scope in the same step also uses `initiatives/<name>` (no prefix), which is consistent with `state-and-flow-formats.md` conventions. The inconsistency is between this skill and `/create-initiative`, not within this skill. Since `state-and-flow-formats.md` examples use bare names without prefix, this skill's choice is arguably more correct — but the two skills should agree. Either `/create-initiative` should drop the prefix from its Active Slice, or this skill should add it.
File: ~/.claude/skills/start-initiative/SKILL.md:312
Resolution: CODEBASE_EXPLORATION

Check all skills that write to state.md Active Slice field to determine the prevailing convention. If `/create-initiative` is the only outlier using the `__active__` prefix, the fix belongs there, not here. If the convention is split, a decision should be recorded.

**[MINOR]** Step 5c proposal path sub-step 3 is underspecified for the agent
The instruction to "merge the proposed changes into the top-level file's structure to produce the target state" (line 254) requires the agent to understand what a merged architecture file looks like. Unlike copying or renaming, merging is a judgment call — the agent must decide how to integrate changes into the existing file structure. A brief example or heuristic (e.g., "replace modified sections, preserve unmodified sections, append new sections") would reduce ambiguity.
File: ~/.claude/skills/start-initiative/SKILL.md:254
Resolution: DIRECTLY_ACTIONABLE

Add a one-sentence heuristic after the merge instruction, e.g.: "The merged file should read as a complete architecture document — replace sections that the proposal modifies, preserve sections it doesn't mention, and append any new sections."

## Score: 9/10

All critical and important issues from iteration 1 are properly fixed. The architecture creation step (5c) is thorough, covering both paths with verification. The fail-fast reorder, re-entry handling, and state validation improvements are all well-implemented. The remaining issues are minor: one cross-skill consistency question (Active Slice prefix) and one merge-instruction clarity improvement. Fixing the merge heuristic would bring this to 9.5+.

## Summary
- Critical: 0
- Important: 0
- Minor: 2 (1 new, 1 carried forward from iteration 1)
