# Software Architecture Review: Create Initiative Skill (Phase 2)

## Issues

**[IMPORTANT]** Stale `start-project` reference in `refine-slices` SKILL.md working directory example
The `refine-slices` skill's Loop Parameters table uses `.project/vertical-slices/01-start-project/goal-refining.md` as an example path. This is not in the changed files list for this phase, but it is a live skill file that still references the old name. Users invoking `/refine-slices` will see the old name in the working directory convention, creating naming inconsistency across the skill suite.
File: ~/.claude/skills/refine-slices/SKILL.md:24
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `initiative-conventions.md` retains parenthetical `/start-project` reference
Line 30 of `initiative-conventions.md` says `Created by /create-initiative (replaces /start-project)`. This "(replaces /start-project)" parenthetical was appropriate during the transition (Phase 1), but now that Phase 2 has completed the rename across all active skill files and workflow docs, the parenthetical is stale context. It should be removed so that `initiative-conventions.md` (the single source of truth for initiative structure) uses `/create-initiative` cleanly without referencing a skill name that no longer exists.
File: ~/.claude/skills/_shared/references/initiative-conventions.md:30
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `create-initiative` SKILL.md Step 14 references `/start-initiative` with old comment style
Step 14 in Mode B says `Do NOT use the __active__ prefix -- that is applied by /start-initiative upon approval.` This is correct behavior, but the skill `/start-initiative` does not yet exist (it is Phase 3 of this quest). Consider adding a brief note like "(future skill)" so implementers of Mode B are not confused by the forward reference. This is minor since the behavior (not adding `__active__`) is correct regardless.
File: ~/.claude/skills/create-initiative/SKILL.md:240
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `decisions-format.md` Reader list includes `/create-initiative` but Writer list does not
The Readers list on line 80 includes `/create-initiative` (correct -- it loads decisions as context). The Writers list on line 78 does not include `/create-initiative`, which is also correct since `create-initiative` does not write decisions. However, the `create-initiative` SKILL.md Step "Transition -- Load Formats and Decisions" loads decisions and flags `revisiting` status to the user, which implies it could potentially resolve a revisiting decision. If that is intentional, `/create-initiative` should be in the Writers list. If not, the SKILL.md should clarify that it only reads decisions, never resolves them.
File: ~/.claude/skills/_shared/references/decisions-format.md:78
Resolution: USER_INPUT

## Score: 8/10

The rename from `/start-project` to `/create-initiative` is clean and thorough across the primary changed files. Module boundaries are respected -- each skill's SKILL.md owns its own behavior, shared references are the single source of truth for cross-cutting conventions, and the two-mode design (Mode A / Mode B) in `create-initiative` is a well-scoped extension that keeps the interface narrow. The dependency direction is correct: `create-initiative` reads shared references but doesn't create coupling in the other direction. To reach 9+: fix the two IMPORTANT issues (stale references in `refine-slices` and `initiative-conventions.md`) so the rename is fully consistent across all live skill files.

## Summary
- Critical: 0
- Important: 2
- Minor: 2
