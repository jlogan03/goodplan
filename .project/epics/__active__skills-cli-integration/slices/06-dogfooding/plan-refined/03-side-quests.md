# Phase 3: Quests

Exercise the quest lifecycle — both organic quests that emerge from Phase 2's `/complete` and at least one deliberate quest to ensure the path is fully tested.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `goodplan quest:list --json` — returns `{"items":[]}` (empty quest list)

**After implementation** (should pass / show presence):
- [ ] `goodplan quest:list --json` — returns at least 1 quest with `status === "completed"`
- [ ] Quest lifecycle exercised: create → plan → implement → complete

### Tasks

#### Organic Quests
- [ ] **Check Phase 2 output**: Review `/complete` output from Phase 2 for proposed quests — look in the "Suggested Quests" or "Recommended Follow-ups" section of the completion summary
- [ ] **Create organic quests**: For each approved quest from `/complete` output, create via CLI: `echo '{"name":"<name>","goal":"<goal>"}' | goodplan quest:create --json`. Quest creation is CLI-only (no skill wrapper).
- [ ] **Execute organic quests**: For each quest:
  - [ ] Transition to planning: `stdin: "" | goodplan quest:plan --quest <name> --json`
  - [ ] Run `/create-plan` → `/refine-plan` → `/implement-plan` → `/complete`
  - [ ] Verify between steps: `goodplan quest:show --quest <name> --json` — check status transitions

#### Deliberate Quest
- [ ] **Create a deliberate quest** (if no organic quests were created from Phase 2 output): Pick a small improvement that naturally fits — e.g., "add README.md with project overview" or "add Zod schemas for config validation". Create via `echo '{"name":"<name>","goal":"<goal>"}' | goodplan quest:create --json`
- [ ] **Transition to planning**: `stdin: "" | goodplan quest:plan --quest <name> --json`
- [ ] **Plan and implement**: Run `/create-plan` → `/implement-plan` → `/complete` on the quest. Skip `/refine-plan` for the deliberate quest to test the direct plan-to-implement path.
- [ ] **Verify quest completed**: `goodplan quest:show --quest <name> --json` → `status === "completed"`

#### Friction Tracking
- [ ] **Log friction**: Note any issues with quest creation, quest-scoped planning, or quest completion
- [ ] **Compare quest vs slice experience**: Note differences in friction between quest lifecycle and slice lifecycle

### Verification

1. At least 1 quest completed through full lifecycle
2. `goodplan quest:list --json` reflects correct quest states
3. Quest completion produced learnings and architecture review (even if "no updates needed")
4. Exit codes correct: 0 on success, 3 with structured error JSON on invalid transitions
