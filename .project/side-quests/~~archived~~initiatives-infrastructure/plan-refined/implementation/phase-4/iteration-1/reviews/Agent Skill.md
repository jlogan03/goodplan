# Agent Skill Review — Phase 4: Project Status Update

## Issues

**[IMPORTANT]** SKILL.md exceeds 500-line guideline threshold at 274 lines but embeds full output format templates
The SKILL.md is 274 lines — within the 500-line limit. However, both Format A and Format B (with two sub-variants) are inlined in the SKILL.md body. These output templates are reference material that could live in `references/` and be loaded on-demand, reducing the SKILL.md body and making templates easier to maintain independently. This is a judgment call — the current approach works, and 274 lines is well within bounds — but as the skill grows, the templates are the natural extraction point.
File: /Users/iwhite/.claude/skills/project-status/SKILL.md:126
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Initiative state machine delegation is indirect — skill must load two files
Step 6 says "apply the initiative state machine from `~/.claude/skills/_shared/references/initiative-conventions.md`" and the status-logic.md also says "Initiative-level state machine is defined in `~/.claude/skills/_shared/references/initiative-conventions.md`." This means the agent must load three files total (SKILL.md, status-logic.md, initiative-conventions.md) to execute initiative state resolution. The delegation is correct and avoids duplication, but the SKILL.md body should make clearer that `initiative-conventions.md` must be loaded in Step 2 (alongside status-logic.md), not discovered mid-execution in Step 6. Currently Step 2 only loads status-logic.md and decisions-format.md — the initiative conventions file is first mentioned in Step 6, which means context may not be available when the agent needs it.
File: /Users/iwhite/.claude/skills/project-status/SKILL.md:30
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** State-to-next-skill mapping for "No active initiative" may confuse agent
In `status-logic.md` line 99, the mapping says: "No active initiative, project has initiatives dir → `/create-initiative`". This is correct for a project where all initiatives are archived/abandoned and the user needs a new one. But consider the case where non-active initiatives exist in exploring or proposal-pending states — the correct action is to continue working on those (e.g., `/explore <path>` or `/start-initiative <path>`), not to create a new initiative. The current mapping could lead the agent to suggest creating a new initiative when one is already in progress but just not active yet.
File: /Users/iwhite/.claude/skills/project-status/references/status-logic.md:99
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Format B "Active Initiative" section lacks state-to-skill inline hint
In Format B with Active Initiative (SKILL.md line 163-198), the template shows `State: <state> | Next: /<skill>` for the active initiative header, which is good. But the "Other Initiatives" section at line 183 shows `<name> — <state> → /<skill> <args>` without clarifying that the skill mapping comes from the initiative state machine (not the slice state machine). The step text at line 230 says "use the state-to-next-skill mapping from references/status-logic.md" but the initiative mappings in status-logic.md are a delegation to initiative-conventions.md. The chain works but adds cognitive load. Consider adding a brief note that non-active initiatives use the initiative state mappings.
File: /Users/iwhite/.claude/skills/project-status/SKILL.md:183
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `__active__` detection glob pattern has no fallback for multiple matches
Step 5 and status-logic.md both use `ls -d .project/initiatives/__active__*/ 2>/dev/null` to detect the active initiative. The convention says "at most one `__active__` initiative exists at a time," but if something goes wrong and two exist, the skill has no error handling for that case. A brief note to warn the user if multiple `__active__` directories are found would make the skill more robust.
File: /Users/iwhite/.claude/skills/project-status/SKILL.md:62
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Triggering description could be more "pushy" for initiative-related queries
The current description mentions "initiative detection" which is good. But it doesn't include common trigger phrases related to initiatives like "what initiative am I working on", "which initiative is active", "initiative status". Given that initiative awareness is a key new capability, the description could benefit from a couple of initiative-specific trigger phrases. The description is 319 chars — well under the 1024 limit — so there's room.
File: /Users/iwhite/.claude/skills/project-status/SKILL.md:2
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is solid and well-structured. The initiative state machine is correctly delegated to the shared reference file rather than duplicated. Format B with the active initiative variant is well-designed with clear section hierarchy. The `__active__` detection pattern is correct and consistent with initiative-conventions.md. The state-to-next-skill mappings cover initiative states comprehensively. The two main improvements that would bring this to 9+: (1) load initiative-conventions.md eagerly in Step 2 instead of discovering it in Step 6, and (2) refine the "no active initiative" mapping to account for non-active initiatives that are still in progress.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
