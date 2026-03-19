# Agent Skill Review — Phase 4: Project Status Update (Iteration 2)

## Issues

**[MINOR]** Step 6 opening framing still implies it operates only on the active scope
The Initiative Directory Scanning section now has a corrective note: "Initiative scanning always runs when `.project/initiatives/` exists — it is needed for Format B reporting regardless of what the active scope resolved to." This is good. However, the opening sentence of Step 6 still says "For the active scope, run `ls` commands on the relevant directory to inspect which files exist." An agent reading top-to-bottom encounters the misleading framing before the corrective note. The correction is buried in a subsection rather than in the opening paragraph. The Software Architecture reviewer flagged this as IMPORTANT in iteration 1 — the fix partially addresses it but the misleading opening sentence remains.
File: /Users/iwhite/.claude/skills/project-status/SKILL.md:72
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `/complete-slice` clarification note still hedges rather than resolves
The slice state mapping now reads: `/complete-slice <path>` (note: skill is currently named `/complete-slice`, may be renamed to `/complete` later). The Generalist reviewer in iteration 1 flagged this as IMPORTANT — the note does clarify the current name is intentional and a rename may come, which is sufficient. However, the parenthetical is written as an agent-facing instruction note, which is unusual inside a mapping table. If the rename is planned for a later phase, the note should be a comment explaining it is tracked (e.g., "rename handled in Phase 8") rather than leaving the agent uncertain about which name to use. As written, an agent might still emit `(note: skill is currently named...)` in a user-facing suggestion. Low risk but worth tightening.
File: /Users/iwhite/.claude/skills/project-status/references/status-logic.md:113
Resolution: DIRECTLY_ACTIONABLE

## Verified Fixes

The four IMPORTANT issues identified across iteration-1 reviewers were addressed as follows:

**Fix 1 — Scope resolution step count alignment (Generalist IMPORTANT #1):** Confirmed fixed. SKILL.md Step 5 now lists 5 numbered steps (1–5) matching the 5-item list in `status-logic.md`. Both files present identical structure. The previous 4-step/5-step inconsistency is resolved.

**Fix 2 — Eager loading of initiative-conventions.md (Agent Skill IMPORTANT #2):** Confirmed fixed. Step 2 now conditionally loads `~/.claude/skills/_shared/references/initiative-conventions.md` when `.project/initiatives/` exists, citing the exact reasons needed: "initiative state machine resolution, first-vs-subsequent initiative disambiguation, and directory structure conventions." The agent no longer discovers this dependency mid-execution in Step 6.

**Fix 3 — Split "no active initiative" mapping (Agent Skill IMPORTANT #3 / Generalist IMPORTANT #2 overlap):** Confirmed fixed. The `status-logic.md` State-to-Next-Skill mapping table now has two distinct rows: one for "No active initiative, non-archived/non-abandoned initiatives exist" (suggesting the appropriate in-progress skill) and one for "No active initiative, all initiatives archived/abandoned" (suggesting `/create-initiative`). The previous single-row ambiguity is resolved.

**Fix 4 — /complete-slice naming clarified (Generalist IMPORTANT #2):** Partially fixed. The mapping now has a parenthetical note documenting that the current name is intentional. The underlying ambiguity about whether an agent should emit the note text is a minor residual issue (flagged above).

**Bonus — First-vs-subsequent initiative disambiguation (Software Architecture IMPORTANT #2):** Confirmed fixed. `status-logic.md` lines 54–56 now contain an explicit "First vs subsequent initiative" block explaining the `__active__initial/` naming signal and which state table to apply.

**Bonus — Step 6 unconditional scanning framing (Software Architecture IMPORTANT #1):** Partially fixed. The corrective note was added within the subsection, but the opening sentence of Step 6 still misleads. Downgraded to MINOR since the note is present.

## Score: 9/10

All four IMPORTANT issues were addressed, with one partially resolved (Step 6 framing) and one with a minor residual (complete-slice note phrasing). The skill is now structurally sound and self-sufficient: initiative-conventions.md loads eagerly, scope resolution is consistent across both files, and the "no active initiative" mapping correctly branches on whether in-progress initiatives exist. Two minor cleanup items remain but neither affects correctness.

## Summary
- Critical: 0
- Important: 0
- Minor: 2
