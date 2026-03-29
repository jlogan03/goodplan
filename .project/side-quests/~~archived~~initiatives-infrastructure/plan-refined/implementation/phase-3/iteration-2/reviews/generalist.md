# Phase 3 Review: `/start-initiative` Skill — Iteration 2

**Reviewer**: Generalist
**Score**: 9/10

## Summary

All critical and important fixes from iteration 1 have been addressed effectively. The skill now covers the full lifecycle: resolve initiative, fail-fast on active initiative, validate state, present proposal, write approval, create architecture directory, activate, and update state. The architecture creation step (5c) is thorough and handles both proposal and skip paths correctly. Re-entry handling is a good addition. One minor issue remains.

## Critical (0)

No critical issues. The previously-critical missing `architecture/` directory creation is now thoroughly addressed in Step 5c with clear handling for proposal path (copy + merge + backfill) and skip path (copy top-level baseline). The verification check at the end of Step 5c is a good safeguard.

## Important (0)

All three previously-important issues resolved:

- **`needs-initiative-completion` state** (was I1): Now listed in Step 3 invalid states with appropriate message pointing to `/complete`.
- **Fail-fast active-initiative check** (was I2): Moved to Step 1b, runs immediately after resolving the initiative name and before any state validation or file reading. Correct ordering.
- **Trigger phrases** (was I3): Added to frontmatter description. Good coverage of natural language triggers including "pull the trigger", "ready to build", "activate this", etc.

## Minor (1)

### M1: Step 5c merge instruction is underspecified for edge cases

**Location**: SKILL.md Step 5c, item 3

The instruction to "merge the proposed changes into the top-level file's structure to produce the target state" is correct in intent, but leaves ambiguity about what "merge" means concretely. If a `<subsystem>-changes.md` describes additions to an existing subsystem, the agent must decide how to integrate those additions into the existing file's structure (append sections? interleave? replace specific sections?). The instruction "If no top-level file exists, transform the changes file into a standalone architecture file" is clearer by comparison.

This is minor because the agent will likely handle it reasonably in context, and over-prescribing merge logic could be brittle. But a one-sentence heuristic (e.g., "preserve existing structure; add or replace sections as the proposal indicates") would reduce variance in output quality.

**Fix**: Add a brief heuristic for the merge operation, or note that the agent should preserve existing file structure and apply changes as the proposal describes them.

## Verification of Specific Fixes

| Fix | Status | Notes |
|---|---|---|
| C1: architecture/ creation (Step 5c) | Fixed | Comprehensive: copy overview, merge changes, copy new subsystems, backfill unmodified top-level files, skip-path baseline copy, verification step |
| I1: needs-initiative-completion state | Fixed | Added to Step 3 invalid states |
| I2: Fail-fast active check | Fixed | Moved to Step 1b, before state validation |
| I3: Trigger phrases | Fixed | Added to frontmatter with good coverage |
| M1: Active Slice format | Fixed | Step 7 now uses `initiatives/<name>` without `__active__` prefix |
| M2: approved.md skip-path clarity | Fixed | Step 5b now explicitly describes both paths and what content each produces |
| M3: Re-entry handling | Fixed | Step 1c detects approved.md without __active__ prefix, resumes at Step 5c |
| M4: __active__initial rejection | Fixed | Step 1 normalization rule 5 catches `__active__` prefix and `initial` name |
