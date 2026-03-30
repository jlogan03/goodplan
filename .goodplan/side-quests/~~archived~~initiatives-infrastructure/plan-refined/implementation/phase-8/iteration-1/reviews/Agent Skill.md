# Agent Skill Review — Phase 8: Complete Slice + Refine Slices Scope Resolution

## Issues

**[IMPORTANT]** Step 10b archive example missing initiative slice path
The archive step shows `mv` examples for top-level vertical-slices and side-quests but omits the initiative slice case (`initiatives/__active__<name>/vertical-slices/<slice>`). Since this phase explicitly adds initiative slice support, the archive step should show the third pattern. An agent encountering an initiative slice completion could guess the path but might also skip archiving or archive at the wrong level (the initiative directory instead of the slice directory).
File: ~/.claude/skills/complete-slice/SKILL.md:189
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Signal tracking glob misses archived initiative directories
Step 6d discovery scans `.project/initiatives/__active__*/vertical-slices/*/completion/learnings.md`. Once an initiative is archived (`~~archived~~NN_<name>/`), its completed slices would no longer match this glob. The guidance.md signal tracking section has the same pattern. Top-level vertical-slices and side-quests handle this because `*` matches `~~archived~~<name>`, but for initiatives the `__active__` prefix is a literal that gets replaced by `~~archived~~NN_` on initiative completion. This means signal tracking loses historical data when an initiative completes.
File: ~/.claude/skills/complete-slice/SKILL.md:122
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Refine-slices flow-log scope includes `__active__` prefix
The flow-log entry records scope as e.g. `initiatives/__active__<name>/vertical-slices`. When the initiative is later archived and the `__active__` prefix is removed, correlating flow-log entries with filesystem paths requires extra logic. Other skills (complete-slice signal tracking) already strip `~~archived~~` — this is consistent but worth noting. No action needed unless the team wants to normalize scope values.
File: ~/.claude/skills/refine-slices/SKILL.md:115
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Refine-slices cleanup on interruption could leave stale `-refining.md` files in initiative scope
The cleanup section says to "glob `*-refining.md` under `<slices-root>` if no manifest" — this works for both top-level and initiative-scoped since `<slices-root>` is already parameterized. No actual issue, just confirming the parameterization covers this correctly.
File: ~/.claude/skills/refine-slices/SKILL.md:119
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Both skills are well-structured with clear initiative-scoped path patterns. The `<slices-root>` parameterization in refine-slices is clean and consistent. Complete-slice's two-layer architecture handling (Step 6 initiative slice handling) is thorough and correctly references the shared conventions. The description fields are appropriately detailed for triggering. Two IMPORTANT issues prevent a 9: the missing archive example for initiative slices is a gap that could cause incorrect archiving behavior, and the signal tracking glob will silently lose data when initiatives are archived.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
