# Holistic Review — onboard-repo Plan (Round 3)

## Issues

**[IMPORTANT]** Phase 1 test architecture task is now detailed but test file location conflicts with existing test patterns

Phase 1 specifies `tests/integration/onboard-skill.test.ts` as the test file. The existing integration tests in `tests/integration/` are all CLI integration tests that run the `goodplan` binary directly (e.g., `workflow-epic.test.ts`, `migrate.test.ts`). The onboard-repo test is fundamentally different — it uses the Anthropic Claude SDK (`@anthropic-ai/claude-agent-sdk`) to run an LLM session, similar to `tools/dogfood/harness.ts`. Placing it in `tests/integration/` conflates two different test categories. It should either go in `tools/dogfood/` (alongside the existing harness) or a new `tests/skill-integration/` directory. The plan should also reference the existing `tools/dogfood/harness.ts` as the pattern to follow (it already imports `query` from `@anthropic-ai/claude-agent-sdk` and handles `AskUserQuestionInput` responses), rather than designing the test architecture from scratch.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 Expected Behavior "Before" check is still weak (carried from Round 2)

The before check for Phase 1 is: "Running `goodplan status --json` in the synthetic fixture repo returns error — no `.project/`". This tests the fixture state, not the skill. It's a trivially true precondition (the fixture generation script obviously won't create `.project/`). Round 2 flagged this. The plan addressed other Round 2 items but this one persists. Replace with a meaningful before check: verify that invoking `/onboard-repo` is not yet registered as a skill (i.e., `skills/onboard-repo/SKILL.md` does not exist and the install script does not list `onboard-repo`).

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 quest creation still uses ambiguous `echo | goodplan` syntax instead of referencing cli-interaction.md invocation pattern

Round 2 flagged that Step 9 mixes `stdin:` syntax with shell pipe syntax. The plan now shows `echo '{"name":"<name>","goal":"<goal>"}' | goodplan quest:create --json` in Step 9. This is a valid shell command but not how skills actually invoke CLI commands — skills use the Bash tool with a separate stdin parameter, or use the `echo | command` pattern in a Bash tool call. The plan should reference `cli-interaction.md` section 4 (Invocation Patterns) and show the canonical pattern: `echo '{json}' | goodplan quest:create --json` as a Bash tool command string. The current description is workable but inconsistent with how other skills document CLI invocations. Since this was raised in Round 2 and partially addressed, upgrading the reference to cli-interaction.md section 4 would close it cleanly.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 Step 7 interview has improved guardrails but "max of 3 exchanges" isn't justified

Step 7 now says "Single confirmation round with a max of 3 exchanges (present findings, ask for corrections, apply — matching `/create-epic` Step 3's wrap-up heuristic)." This is much better than the open-ended loop from Round 2. However, the reference to "matching `/create-epic` Step 3's wrap-up heuristic" assumes the reader knows what that heuristic is. A brief inline justification — "3 exchanges: present, correct, confirm" — would make the step self-contained. This is minor because the intent is clear.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 smoke test now has concrete success criteria but doesn't specify which real repo to use

Phase 5 says "Clone a small open-source repo, run the full skill end-to-end via Claude SDK." The fixture test covers the automated path; the smoke test is the real-world validation. But "a small open-source repo" is ambiguous — different repos will exercise different heuristics. The plan should either name a specific repo (e.g., a well-known small TypeScript project) or define selection criteria (TypeScript, 50-500 commits, 3+ contributors, has PRs on GitHub). Without this, the smoke test is non-reproducible.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Overview step map and Phase 1 skeleton are now consistent (Steps 0-12) but the Overview "Core flow" narrative doesn't match the step map

The Overview has two descriptions of the flow: (1) "Core flow: Scan repo -> detect conventions -> extract architecture & subsystems -> estimate maturity -> interview user for validation -> detect migrations & debt -> profile expertise -> identify hot spots -> scaffold .project/ -> update CLAUDE.md -> optionally create first epic and/or side quests" and (2) "Step map: Step 0: version check, Step 1: pre-flight, Step 2: scan, Step 3: init..." The core flow narrative puts "scaffold .project/" near the end, but the step map correctly puts init (Step 3) early. The core flow should be updated to match the step map ordering, or removed since the step map is the authoritative description.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Convention heuristics task (Phase 2) specifies "sampling src/ files" for naming detection but doesn't say how many

"Detect by sampling src/ files" — how many files? 5? 20? All? For large repos, scanning all files is expensive in LLM context. For small repos, 5 files might not be representative. The heuristic reference should specify a reasonable sample size (e.g., "up to 20 files, prioritizing files with the most git commits") to make the heuristic reproducible.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has made strong progress across three rounds. All critical issues from Rounds 1-2 are resolved: CLAUDE.md update step exists (Step 12), verification uses Anthropic Claude SDK harness, shared references are integrated, step numbering is consistent (0-12), re-entry handling is present per step, quest creation validated against research, Write tool usage for LLM-owned markdown files is explicit, and the fixture approach is well-defined. The remaining issues are refinement-level: test file placement should match existing codebase patterns (the dogfood harness), one carried-forward Phase 1 before-check weakness, and a few minor precision items. To reach 9+: fix the test file location to align with `tools/dogfood/harness.ts` patterns, fix the Phase 1 before check, and update the Overview core flow narrative to match the step map.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
