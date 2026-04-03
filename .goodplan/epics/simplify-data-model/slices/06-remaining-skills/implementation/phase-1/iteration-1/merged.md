### CRITICAL Issues

None.

### IMPORTANT Issues

1. **Unused imports in `submit-explore.ts`** — Three imports (`submitExploreInputSchema`, `readStdin`, `validateInput`) are dead code after the refactor. The command now validates mutual exclusivity inline and passes `{ phase: "explore" }` directly. Remove all three.
   File: src/commands/subagent/submit-explore.ts:6,9-10
   Resolution: DIRECTLY_ACTIONABLE

2. **Missing condition evaluation in explore phase** — The create-epic skill loads `gp decision:list --json` and `gp learning:list --json`, filters for `reconsiderWhen`/`validUntil`, passes conditions to the explore-phase agent, and surfaces triggered conditions to the user. The create-side-quest skill omits this entirely. Either add condition loading (matching create-epic Step 4c pattern) or add a comment explicitly noting that condition evaluation is omitted for quests and why.
   File: skills/create-side-quest/SKILL.md (Step 4, Phase 2)
   Resolution: DIRECTLY_ACTIONABLE

3. **Refinement loop missing per-iteration context bundle reload and reviewer context** — The refinement loop loads `start-plan` once in Step 6a but doesn't reload per iteration. Reviewers and coordinators don't receive inline context or reference paths from the context bundle. Compare with create-epic Step 6d which reloads `start-refine-architecture` per iteration and passes `ContextBundle.inline key-value pairs` and `ContextBundle.references` to coordinators and reviewers. Add context bundle reload at start of each refinement iteration. Update coordinator, reviewer, and synthesis task prompts to include inline context and reference paths.
   File: skills/create-side-quest/SKILL.md (Step 6e)
   Resolution: DIRECTLY_ACTIONABLE

### MINOR Issues

1. **Transition table missing error rows for `BEGIN_QUEST_EXPLORE`** — The `questExploreTransitions` array omits `(error)` rows, while `quest-plan.ts` includes them. Add `(error)` rows for consistency.
   File: src/core/state/transitions/quest-explore.ts
   Resolution: DIRECTLY_ACTIONABLE

2. **Temp dir subdirectories not explicitly created** — Step 3a creates `$TMPDIR` but not subdirectories (`$TMPDIR/qa`, `$TMPDIR/draft`, `$TMPDIR/reviews`). The Write tool can create them but plan-slice explicitly creates them.
   File: skills/create-side-quest/SKILL.md (Step 3a)
   Resolution: DIRECTLY_ACTIONABLE

3. **Test harness Test 3 tests CLI, not skill error handling** — The error path test verifies CLI command behavior but doesn't invoke the skill via Agent SDK in an invalid context (e.g., no active epic).
   File: tools/dogfood/test-create-side-quest.ts
   Resolution: DIRECTLY_ACTIONABLE

### DIRECTLY_ACTIONABLE

1. Remove unused imports in `src/commands/subagent/submit-explore.ts`: delete imports of `submitExploreInputSchema`, `readStdin`, `validateInput`.
2. In `skills/create-side-quest/SKILL.md` Step 4, add condition evaluation loading (decisions and learnings with reconsiderWhen/validUntil) before spawning explore-phase agent, matching the create-epic Step 4c pattern. Pass conditions in the task prompt and check triggeredConditions in the return.
3. In `skills/create-side-quest/SKILL.md` Step 6e, add context bundle reload (`$GP start-plan --quest $QUEST_NAME --inline --json` or equivalent) at the start of each refinement iteration. Pass inline context and reference paths to coordinator, reviewer, and synthesis task prompts.
4. Add `(error)` rows to `questExploreTransitions` in `src/core/state/transitions/quest-explore.ts` for consistency with quest-plan.ts.
5. In `skills/create-side-quest/SKILL.md` Step 3a, create subdirectories: `mkdir -p "$TMPDIR/qa" "$TMPDIR/draft" "$TMPDIR/reviews"`.
6. Enhance test harness Test 3 to invoke the skill via `runSkillSession` in a project without an epic to verify skill error handling.

### RESEARCH_NEEDED

None.

### Contradictions Resolved

None — all reviewers aligned on the unused imports issue. Agent Skill reviewer's first "IMPORTANT" (user-invocable consistency) self-resolved as "No change required."

### Unresolved (USER_INPUT required)

None.
