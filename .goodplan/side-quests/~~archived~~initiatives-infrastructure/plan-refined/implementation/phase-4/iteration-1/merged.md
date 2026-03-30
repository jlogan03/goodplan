# Merged Review — Phase 4, Iteration 1

Reviewers: Generalist (8/10), Software Architecture (8/10), Agent Skill (8/10)
Consensus score: **8/10**

## Critical

None.

## Important

### 1. Scope resolution structure inconsistent between SKILL.md and status-logic.md
Sources: Generalist #1, Software Architecture #1

SKILL.md Step 5 implements 4 numbered steps (collapsing active-initiative-slice and active-initiative into sub-bullets of step 2). status-logic.md implements 5 numbered items matching the plan. Both reach the same outcome but an implementor sees different structures depending on which file they follow.

Additionally, Step 6's framing implies it only operates on the "active scope" from Step 5, but initiative scanning is actually unconditional (needed for Format B reporting even when a slice is the active scope). The opening of Step 6 should clarify that initiative scanning always happens for reporting purposes.

Resolution: Align SKILL.md and status-logic.md to the same step count. Reframe Step 6 opening to say initiative scanning always runs for reporting, independent of scope resolution result.
Files: `~/.claude/skills/project-status/SKILL.md:62-69`, `~/.claude/skills/project-status/references/status-logic.md`

### 2. Load initiative-conventions.md eagerly in Step 2, not lazily in Step 6
Sources: Agent Skill #2, Software Architecture #2

Step 2 currently loads only status-logic.md and decisions-format.md. initiative-conventions.md is first referenced in Step 6 (and indirectly by status-logic.md). This means the agent may not have initiative state machine context available when needed. status-logic.md also provides no guidance on distinguishing first-initiative (`__active__initial/`) vs subsequent-initiative state tables — that knowledge is only in initiative-conventions.md.

Resolution: Add initiative-conventions.md to Step 2's load list (when `.project/initiatives/` exists). Optionally add a note in status-logic.md about first-vs-subsequent initiative disambiguation so the primary reference is more self-sufficient.
Files: `~/.claude/skills/project-status/SKILL.md:30`, `~/.claude/skills/project-status/references/status-logic.md:52`

### 3. "No active initiative" mapping doesn't account for in-progress non-active initiatives
Source: Agent Skill #3

status-logic.md line 99 maps "no active initiative, project has initiatives dir" to `/create-initiative`. This is correct when all initiatives are archived/abandoned, but wrong when non-active initiatives exist in exploring or proposal-pending states. The agent could suggest creating a new initiative when one is already in progress but not yet active.

Resolution: Refine the mapping to check for non-archived/non-abandoned initiatives before suggesting `/create-initiative`. If in-progress initiatives exist, suggest the appropriate skill for the most advanced one.
File: `~/.claude/skills/project-status/references/status-logic.md:99`

### 4. `/complete-slice` vs `/complete` naming inconsistency
Sources: Generalist #2, Software Architecture minor #1

status-logic.md line 110 maps slice completion to `/complete-slice`. The actual skill directory is `complete-slice/` so this is currently correct. However, workflow.md and the plan overview reference `/complete`. The convention file and other skills also reference `/complete`.

Resolution: Verify intended name. If `/complete-slice` is correct now and rename happens later, add a comment noting this. If `/complete` is the intended name, fix the mapping.
File: `~/.claude/skills/project-status/references/status-logic.md:110`

## Minor

### 5. Initiative state display names use "Initiative:" prefix not matching canonical names
Source: Generalist #3

status-logic.md uses "Initiative: ready for exploration" while initiative-conventions.md uses "Ready for exploration". The "Initiative:" prefix is a display convention — either document it as such or match exactly.
File: `~/.claude/skills/project-status/references/status-logic.md:89`

### 6. No error handling for multiple `__active__` directories
Source: Agent Skill minor #2

Convention says at most one `__active__` initiative exists, but if multiple are found, the skill has no handling. A brief warning to the user would make it more robust.
File: `~/.claude/skills/project-status/SKILL.md:62`

### 7. Description frontmatter could include initiative-specific trigger phrases
Source: Agent Skill minor #3

The description mentions "initiative detection" but lacks common trigger phrases like "which initiative is active" or "initiative status". There's room within the 1024-char limit.
File: `~/.claude/skills/project-status/SKILL.md:2`

### 8. Format B template formatting inconsistency
Source: Generalist minor #1

Backtick wrapping of skill commands is inconsistent across template lines. Worth standardizing.
File: `~/.claude/skills/project-status/SKILL.md:175`

### 9. Format B without-initiatives doesn't mention `/create-initiative` for legacy projects
Source: Generalist minor #3

Low priority — `/project-status` reports what exists, not what could exist. No change needed unless desired.

### 10. Format B "Active Initiative" section doesn't indicate first-vs-subsequent state table
Source: Software Architecture minor #2

For transparency, could indicate which state table was applied. Minor since the state name is usually sufficient context.
File: `~/.claude/skills/project-status/SKILL.md:174`
