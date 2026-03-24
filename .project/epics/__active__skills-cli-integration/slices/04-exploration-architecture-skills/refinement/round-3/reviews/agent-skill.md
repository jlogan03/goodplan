# Agent Skill Review — Round 3

## Issues

**[MINOR]** explore skill: `start-explore --inline` flag syntax needs clarification
The plan says sub-agents use `goodplan start-explore --epic <name> --inline` for context bundling and notes "`start-*` commands always output JSON — no `--json` flag needed." This is accurate per codebase (`start-explore.ts` line 42 forces `json: true`). However, the `--inline` flag accepts an optional byte budget (`--inline=<bytes>`), parsed via `parseInlineBudget`. The plan uses bare `--inline` (which triggers the default budget via `DEFAULT_INLINE_BUDGET`). This is fine as a default, but the plan should note that `--inline` accepts an optional `=<bytes>` suffix for skills that need to control context size. Without this note, an implementer hitting context limits during sub-agent spawning won't know the lever exists. One sentence in the Phase 2 or Phase 3 task would suffice: "Note: `--inline` accepts an optional `=<bytes>` suffix to control context budget (default: ~32KB)."
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 smoke test: `submit-refine-architecture` missing `--override` flag documentation
The smoke test step 10 says `goodplan submit-refine-architecture --epic smoke --json` with "(expected stdin payload: scores)". The actual command also supports `--override` to bypass the score threshold circuit breaker (`submit-refine-architecture.ts` line 17). In a smoke test context with dummy scores, the threshold guard may reject the submission. The smoke test should either (a) provide scores that pass the threshold, or (b) use `--override` and note why. Without this, the smoke test may fail at step 10 with a guard error, which would be confusing.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** explore skill: `submit-explore` writes `explore-complete.md` claim not verified
Phase 2 says "Use `goodplan submit-explore --epic <name> --json` to complete (writes `explore-complete.md`)". Looking at `submit-explore.ts`, the command calls `submit()` which triggers `COMPLETE_EXPLORE` — this is a state machine transition, not a file writer. The `explore-complete.md` file is currently written by the skill itself (Step 5 in the current SKILL.md). The plan should clarify that `explore-complete.md` is still skill-written markdown (LLM artifact), and `submit-explore` only transitions the state. The parenthetical "(writes `explore-complete.md`)" is misleading — it implies the CLI writes this file.
Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4 smoke test steps 11-16 are outside slice scope
Steps 11-16 exercise `epic:define-slices`, `submit-slices`, `epic:refine-slices`, `submit-refine-slices`, `epic:add-verification`, and `epic:activate`. These are slice-definition and activation commands, not related to the 4 skills being migrated in this slice (audit-architecture, explore, create-architecture, refine-architecture). Including them isn't harmful — a full lifecycle smoke test is good practice — but they should be annotated as "bonus lifecycle verification" so an implementer knows steps 1-10 are the required scope and 11-16 are optional.
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan is now comprehensive and accurate for all 4 skills. Round 2 issues were well-addressed: the refine-architecture resume detection correctly specifies dual detection (lifecycle status via `epic:show --json` + directory structure inspection), the create-architecture graceful stop redesign maps all 6 scenarios to file-existence signals, the explore scope resolution specifies explicit `activeSlice` > `activeQuest` > `activeEpic` priority, `start-architecture` non-usage is explained, and skill-owned working directories are called out. CLI command names, flag syntax, response shapes, and state machine guards all verified against actual source code. The remaining issues are all minor clarifications that would help an implementer but don't affect correctness.

## Summary
- Critical: 0
- Important: 0
- Minor: 4
