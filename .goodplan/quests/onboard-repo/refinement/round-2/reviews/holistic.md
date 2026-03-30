# Holistic Review — onboard-repo Plan (Round 2)

## Issues

**[IMPORTANT]** Phase 1 Expected Behavior "Before" checks are still weak for a skill-creation plan

The "Before" checks in Phase 1 are: `skills/onboard-repo/` directory does not exist, and `goodplan status --json` in fixture returns error. The first is trivially true for any new file creation and tests nothing meaningful. The second tests the fixture state, not the skill. Better before checks would be: "No `/onboard-repo` trigger matches in Claude Code skill list" or simply remove the first check since it adds no signal. Phase 2-5 before checks are much improved (checking for placeholder text, file absence) — Phase 1 should match their quality.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 4 quest creation uses `stdin:` syntax but doesn't show the Bash tool invocation pattern

Step 9 says `stdin: '{"name":"<name>","goal":"<goal>"}'` passed to `goodplan quest:create --json`. This mixes Claude Code Bash tool API syntax (the `stdin:` parameter) with shell command syntax in a way that could confuse the LLM executor. Other skills use the Bash tool with explicit command and stdin parameters. The task should show the full Bash tool invocation pattern, or reference `cli-interaction.md` section 4 which documents the correct invocation pattern. Currently the description is half-pattern, half-prose.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Automated test verification tasks are vague about what the test actually checks

Each phase says "Verify via test harness" and "Extend automated test" but the test structure is never defined. Phase 1 creates the test, but subsequent phases say "extend" without specifying: Is it one test file with multiple assertions? Multiple test files? Does each phase's test run the full skill or just the new steps? For the Claude SDK test harness pattern (see `tools/dogfood/harness.ts`), the test needs: (1) a prompt to send, (2) expected tool calls or AskUserQuestion responses to handle, (3) post-condition filesystem checks. The plan should specify the test architecture in Phase 1 and define "extend" concretely in later phases — e.g., "add post-condition checks for `conventions.md` content" rather than the generic "extend automated test."

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 CLAUDE.md update task doesn't mention preserving existing content structure

Step 12 says "If CLAUDE.md already exists, append the section without overwriting existing content." Good. But it doesn't mention where in the file to place the section. The `## Project Context` section should go near the top (after any existing frontmatter/title) since it's the primary orientation for LLMs reading the file. The create-epic skill's Step 9 pattern should be explicitly referenced as the template for placement logic.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 3 architecture interview (Step 7) uses AskUserQuestion but doesn't specify the minimal-questions principle

The confirmed goal says "Only asks the user about things that can't be inferred." Step 7 presents subsystems and maturity for validation, which is appropriate. But it frames the interaction as iterative ("Iterate until user approves") without guardrails. The skill should present findings as a confirmation (single yes/corrections round) rather than an open-ended loop, consistent with the goal of minimal user interaction. One AskUserQuestion with "These are the subsystems I found — correct, or what should I change?" is better than multiple rounds.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 smoke test success criteria could verify expertise output

The smoke test criteria list `.project/` exists, `idea.md` non-empty, `conventions.md` has 3+ conventions, `architecture/_overview.md` has subsystem table, `goodplan status --json` succeeds, CLAUDE.md has Project Context. But expertise profiling (a key differentiator of this skill vs `/create-epic` Mode A) has no smoke test criteria. Add: "expertise memory file exists in `~/.claude/projects/<project>/memory/`" or similar.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Overview step map says "Step 12: CLAUDE.md update + summary" but Phase 5 tasks split this into two separate concerns

The overview lists Step 12 as a single step combining CLAUDE.md update and summary output. But in Phase 5's tasks, these are described as distinct activities: writing/updating CLAUDE.md (a file mutation) and presenting the done summary (terminal output). They should remain a single step (they're both wrap-up activities and have no meaningful ordering dependency), but the task description should make clear they're two sub-activities of one step rather than looking like they might warrant separate steps.

Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The plan has addressed all critical issues from Round 1 effectively: definitive step map with consistent numbering across all phases, explicit Write tool usage for LLM-owned markdown files, CLAUDE.md update step (Step 12), fixture generation script approach, automated test harness via Anthropic Claude SDK, shared reference integration, re-entry handling per step, and quest creation validated against research. The remaining issues are mostly about precision in verification task descriptions and minor interaction design concerns. To reach 9+: tighten the test architecture description in Phase 1 so later phases can reference it concretely, and fix the Phase 1 before-check weakness.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
