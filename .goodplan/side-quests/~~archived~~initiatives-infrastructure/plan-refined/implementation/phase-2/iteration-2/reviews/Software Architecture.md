# Software Architecture Review: Create Initiative Skill (iteration 2)

## Issues

**[IMPORTANT]** `refine-slices` SKILL.md example path still references `01-start-project`
The iteration 1 IMPORTANT issue flagged `.project/vertical-slices/01-start-project/goal-refining.md` in the refine-slices Working directory parameter. This was NOT fixed in iteration 2 — the stale reference is still present. The example path uses the old skill name and would mislead any developer looking at `/refine-slices` documentation to understand the expected directory naming convention. A future slice named after the skill will naturally inherit that convention.
File: ~/.claude/skills/refine-slices/SKILL.md:24
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `decisions-format.md` USER_INPUT issue from iteration 1 remains unresolved (expected)
The iteration 1 review flagged this as USER_INPUT (requires user decision on whether `/create-initiative` should appear in the Writers list). No decision was recorded and no change was made. This is expected behavior for USER_INPUT items — they require user input before action. Flagging here to ensure it is surfaced for user resolution.
File: ~/.claude/skills/_shared/references/decisions-format.md:78
Resolution: USER_INPUT

## Verified Fixes from Iteration 1

The following iteration 1 IMPORTANT/MINOR issues were correctly addressed:

1. **`initiative-conventions.md` parenthetical** — Line 30 now reads `Created by /create-initiative as __active__initial/ — starts active, no approval gate.` The `(replaces /start-project)` parenthetical has been cleanly removed.

2. **Eager `architecture/` creation** — The `mkdir -p` command in Step 2 no longer includes `architecture/` or `initiatives/__active__initial/architecture/`. The directory is created only by `/define-architecture` when the user actually defines architecture.

3. **`/start-initiative` forward reference note** — Step 14 now reads `Do NOT use the __active__ prefix — that is applied by /start-initiative (future skill) upon approval.` The "(future skill)" qualifier is in place.

4. **`idea.md` references in `idea.md`** — The skill inventory table in `.project/idea.md` correctly uses `/create-initiative` in both the table row and the CLAUDE.md section description.

5. **`workflow.md` and `CLAUDE.md` renames** — All four `/start-project` occurrences in `workflow.md` and the one in `CLAUDE.md` correctly name `/create-initiative`.

## Score: 9/10

The two IMPORTANT issues from iteration 1 are now addressed correctly. The architecture of the `create-initiative` skill remains clean: single responsibility, correct dependency direction (reads shared references, doesn't create coupling back), two-mode design is well-scoped, and the state machine contract is respected (no architecture/ created eagerly, first initiative auto-active without approval gate, subsequent initiatives left without `__active__` prefix). The one remaining IMPORTANT issue (`refine-slices` example path) was flagged in iteration 1 and not fixed — it is a live inconsistency in the skill suite. The USER_INPUT item requires a user decision before action. To reach 10/10: fix the `refine-slices` example path and resolve the `decisions-format.md` writer-list question.

## Summary
- Critical: 0
- Important: 1
- Minor: 1
