# Phase 3: Side Quests

Exercise the quest lifecycle — both organic quests that emerge from Phase 2's `/complete` and at least one deliberate quest to ensure the path is fully tested.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls .project/side-quests/` — does not exist or is empty (no quests created yet)
- [ ] `goodplan quest:list --json` — returns empty list

**After implementation** (should pass / show presence):
- [ ] `goodplan quest:list --json` — returns at least 1 completed quest
- [ ] `ls .project/side-quests/~~archived~~*/` — at least one archived quest exists
- [ ] Quest lifecycle exercised: create → plan → implement → complete

### Tasks

#### Organic Quests
- [ ] **Check Phase 2 output**: Review `/complete` output from Phase 2 for proposed side quests (refactoring, debt, gaps)
- [ ] **Execute organic quests**: If any were proposed and approved, run them through the full lifecycle: `/create-plan` → `/refine-plan` → `/implement-plan` → `/complete`

#### Deliberate Quest
- [ ] **Create a deliberate quest** (if insufficient organic quests): Pick a small improvement that naturally fits — e.g., "add README.md with project overview" or "add type-check CI step". Create via `echo '{"name":"<name>","goal":"<goal>"}' | goodplan quest:create --json`
- [ ] **Plan and implement**: Run `/create-plan` → `/implement-plan` → `/complete` on the quest
- [ ] **Verify quest archived**: `ls .project/side-quests/~~archived~~<name>/` exists

#### Friction Tracking
- [ ] **Log friction**: Note any issues with quest creation, quest-scoped planning, or quest completion
- [ ] **Compare quest vs slice experience**: Note differences in friction between quest lifecycle and slice lifecycle

### Verification

1. At least 1 quest completed through full lifecycle
2. `goodplan quest:list --json` reflects correct quest states
3. Quest completion produced learnings and architecture review (even if "no updates needed")
