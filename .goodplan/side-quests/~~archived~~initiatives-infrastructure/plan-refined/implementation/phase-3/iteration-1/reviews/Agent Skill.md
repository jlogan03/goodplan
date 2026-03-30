## Issues

**[CRITICAL]** Missing `architecture/` creation from proposal upon approval
The initiative-conventions.md consumer guide (line 260) states: `architecture/` (subsequent init) is "Created by `/start-initiative` (from proposal upon approval)". The directory structure comment (line 90) confirms: `architecture/ # target architecture (created by /start-initiative from proposal upon approval)`. However, the SKILL.md has no step that creates `initiatives/<name>/architecture/` by transforming the `architecture-proposal/` files into a full `architecture/` directory. Step 5b writes `approved.md` and Step 6 renames the directory, but the proposal-to-architecture conversion is completely absent. Without this, downstream skills like `/define-slices`, `/create-plan`, and `/implement-plan` that read `initiatives/<name>/architecture/` will find nothing.
File: ~/.claude/skills/start-initiative/SKILL.md:196
Resolution: DIRECTLY_ACTIONABLE

Add a step between Step 5b and Step 6 that creates `initiatives/<name>/architecture/` from the proposal files. The convention uses `_overview.md` as the main file, `<subsystem>-changes.md` for modifications, and `new-<subsystem>.md` for additions. The new step should:
1. Create `initiatives/<name>/architecture/` directory
2. Copy `_overview.md` from the proposal
3. Transform `<subsystem>-changes.md` and `new-<subsystem>.md` files into the target architecture format (merging with top-level architecture files where applicable)
4. If architecture-proposal was skipped (Step 4b path), copy top-level `.project/architecture/` as the baseline instead

**[IMPORTANT]** Description under-specifies the first-initiative exclusion
The description says "The approval/activation gate for subsequent initiatives (not the first)." While accurate, it does not mention common phrases a user might say when they have a subsequent initiative with a pending proposal. Users who say "let's build this" or "ready to build" after `/define-architecture` completes should also trigger this skill. The description also does not mention "review architecture" or "review proposal" as triggers, which are natural phrases for the proposal-review workflow this skill implements.
File: ~/.claude/skills/start-initiative/SKILL.md:3
Resolution: DIRECTLY_ACTIONABLE

Add trigger phrases like: 'review architecture proposal', 'ready to build', 'let's build this initiative', 'review proposal', 'activate this'. This avoids under-triggering when users naturally express readiness to proceed.

**[IMPORTANT]** Step 5b writes `approved.md` but Step 4b path also reaches Step 5b — inconsistent `## Architecture Proposal Files` section
When Step 4b (skip architecture) flows to Step 5b, the `approved.md` template includes `## Architecture Proposal Files` with a bulleted list or "N/A — architecture proposal skipped". However, Step 5b is labeled "Write approved.md" without distinguishing the two entry paths clearly. The template mentions listing "all files in architecture-proposal/" — but on the skip path, there is no `architecture-proposal/` directory. While the template does have the "N/A" fallback text, the flow could be clearer about which path produces which content.
File: ~/.claude/skills/start-initiative/SKILL.md:196
Resolution: DIRECTLY_ACTIONABLE

Add a brief note at the top of Step 5b clarifying: "This step is reached from either Step 4b (skip path) or Step 5 (approve path). Use the appropriate Architecture Proposal Files content based on which path was taken."

**[MINOR]** Step 7 state.md update — Active Slice uses path without `__active__` prefix
Step 7 says to set Active Slice to `initiatives/__active__<name>` but the state-and-flow-formats.md examples use initiative names without the `__active__` prefix in scope paths (e.g., `initiatives/<name>`). The flow-log entry in the same step correctly uses `initiatives/<name>` (without prefix). The Active Slice field and flow-log scope should be consistent. Check how other skills reference the active initiative path in state.md.
File: ~/.claude/skills/start-initiative/SKILL.md:241
Resolution: CODEBASE_EXPLORATION

Check what format `/create-initiative` Mode A uses for Active Slice (it writes `initiatives/__active__initial`). Determine whether the convention is to include or exclude the prefix in state.md and flow-log scope fields, and make this skill consistent.

**[MINOR]** No explicit handling of `__active__initial/` as a "not applicable" case
Step 3 checks for invalid states but does not explicitly handle the case where the user passes `__active__initial` as the argument. The `__active__` check in Step 3 would catch it ("already active"), but Step 1's normalization logic could strip `__active__` and then fail to find the directory without the prefix. The normalization should either preserve `__active__` prefixes or handle them explicitly.
File: ~/.claude/skills/start-initiative/SKILL.md:28
Resolution: DIRECTLY_ACTIONABLE

Add a normalization rule: "If the name starts with `__active__`, tell the user this initiative is already active and stop."

## Score: 6/10

The skill has a well-structured workflow with good state validation, clear user interaction points, and proper error handling. However, the missing architecture creation step is a critical gap — it means the skill does not fulfill a core responsibility documented in initiative-conventions.md, and downstream skills will break. Fixing the critical issue and the two important issues would bring this to 9+.

## Summary
- Critical: 1
- Important: 2
- Minor: 2
