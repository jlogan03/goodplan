# Software Architecture Review — Phase 4: `/project-status` Update

## Issues

**[IMPORTANT]** Scope resolution step 2 conflates "active initiative with no in-progress slice" with "initiative itself is active scope" — but initiative may be in a non-slice state (e.g., needs-architecture, exploring)

In SKILL.md Step 5, item 2 says: "If the active initiative exists but has no in-progress slice, the initiative itself is the active scope." This is correct, but then Step 6 only describes initiative directory scanning under the heading "Initiative Directory Scanning" and applies the initiative state machine. The relationship between Step 5's scope resolution result and Step 6's initiative scanning is unclear — Step 6 always scans initiatives regardless of what Step 5 determined as the active scope. This means if the Work Stack has an entry (Step 5 item 1), Step 6 still scans initiatives for Format B reporting. This is actually the right behavior (you need the initiative picture for reporting even when a slice is active), but the framing suggests Step 6 only applies to "the active scope" from Step 5. The opening sentence of Step 6 says "For the active scope, run `ls` commands" but the initiative scanning section scans unconditionally.

Suggestion: Reframe Step 6 opening to say "Apply the state machine to the active scope AND scan initiatives for the full picture" — making it explicit that initiative scanning always happens for reporting purposes, not just when the initiative is the active scope.

File: ~/.claude/skills/project-status/SKILL.md:69
Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** `status-logic.md` references `initiative-conventions.md` by delegation but does not specify how to distinguish first vs subsequent initiative

The Per Initiative section in `status-logic.md` (line 52-54) says "Initiative-level state machine is defined in `~/.claude/skills/_shared/references/initiative-conventions.md`." The initiative-conventions file has two separate state tables (first initiative vs subsequent) with different conditions for states #5-9. However, `status-logic.md` provides no guidance on how to determine which table to apply. The `__active__initial/` naming convention is the signal, but this is only documented in initiative-conventions.md. Since `status-logic.md` is the primary reference loaded by the skill, it should at minimum note: "First initiative (`__active__initial/`) uses the first-initiative state table; all others use the subsequent-initiative table."

File: ~/.claude/skills/project-status/references/status-logic.md:52
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** State-to-next-skill mapping uses `/complete-slice` but the plan overview mentions the skill was renamed to `/complete`

In `status-logic.md` line 110, the slice state mapping says `Slice: needs completion -> /complete-slice <path>`. The actual skill directory is `complete-slice` (confirmed by checking `~/.claude/skills/complete-slice/SKILL.md`), so this is currently correct. However, the plan overview (`_overview.md`) Phase 8 title says "complete-slice" while `workflow.md` line 27 says "/complete." If a rename is planned for a later phase, this is fine as-is. Just flagging the naming inconsistency for awareness — no change needed now if the rename happens in Phase 8.

File: ~/.claude/skills/project-status/references/status-logic.md:110
Resolution: USER_INPUT

---

**[MINOR]** Format B "Active Initiative" section doesn't show which state table was applied

In SKILL.md lines 174-175, Format B shows `State: <state> | Next: /<skill>` for the active initiative. For debugging/transparency, it might be useful to indicate whether this is the first initiative or a subsequent one, since the state machines differ. However, this is minor — the state name itself is usually sufficient context.

File: ~/.claude/skills/project-status/SKILL.md:174
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The implementation is architecturally sound. The key design decisions are correct: initiative-conventions.md is the single source of truth for the initiative state machine, status-logic.md references it rather than duplicating, and the scope resolution order properly layers initiative awareness between work stack and legacy active-slice fallback. The stale-path detection for state.md Active Slice entries is a good defensive measure. The two Format B variants (with/without initiatives) maintain backward compatibility for pre-initiative projects.

To reach 9+: (1) Clarify the relationship between Step 5 scope resolution and Step 6 scanning — the current framing implies Step 6 only works on the active scope but initiative scanning is actually unconditional for reporting. (2) Add the first-vs-subsequent initiative disambiguation note to status-logic.md so the skill's primary reference is self-sufficient for determining which state table to apply.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
