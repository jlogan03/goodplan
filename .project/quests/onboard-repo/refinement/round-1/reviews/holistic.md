# Holistic Review — onboard-repo Plan

## Issues

**[CRITICAL]** Plan does not include CLAUDE.md update step

The confirmed goal and existing skill patterns (see `/create-epic` Step 9) require updating the project root's `CLAUDE.md` with a `## Project Context` section referencing `.project/idea.md`, `.project/conventions.md`, and architecture files. This is how the LLM discovers project context in future sessions. No phase in the plan addresses this. Without it, the scaffolded `.project/` is effectively invisible to future Claude sessions.

Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Fixture repo approach is infeasible — skill is LLM-executed, not programmatic

The plan treats the skill as code that can be "run on the fixture" (e.g., Phase 1: "Run the skill's scanning + init flow on the synthetic fixture repo"). But this is a SKILL.md — a prompt that instructs an LLM. You cannot invoke it like a test suite. The Expected Behavior checks say "After running the skill's Phase 1 flow on the fixture" but there's no mechanism to run a partial skill flow in a test harness. The verification strategy needs to be rethought: either (a) manually invoke the skill via Claude Code on the fixture repo and verify interactively, or (b) write shell scripts that replicate the scanning heuristics and test those. The plan should be explicit about which approach is used and how repeatability is achieved.

Resolution: USER_INPUT

**[IMPORTANT]** Missing shared reference usage — output-templates.md and cli-interaction.md

All existing skills reference `../_shared/references/output-templates.md` for done summaries and `../_shared/references/cli-interaction.md` for CLI interaction patterns. The plan's SKILL.md skeleton (Phase 1, task 2) doesn't mention loading these shared references. The skill should follow established patterns: load `cli-interaction.md` for error handling conventions, use the Done Summary Template (Variant B — loose checklist) from `output-templates.md` for the final summary, and include an expertise check step at the end per `expertise-tracking.md`.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 expertise profiling writes to memory system but plan doesn't specify the exact paths or format

The plan says "write to memory system (`expertise_<domain>.md`)" but doesn't reference the two-layer expertise tracking protocol from `skills/_shared/references/expertise-tracking.md`. The format is specific: `~/.claude/CLAUDE.md` `## Expertise` section plus `~/.claude/projects/<project>/memory/expertise_<domain>.md` files. The plan should explicitly reference this shared reference and follow its format, rather than inventing a new approach. The plan also says "write expertise profile" but doesn't distinguish between the always-loaded summary layer and the detailed memory file layer.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Step numbering in SKILL.md skeleton is inconsistent with phase descriptions

Phase 1 describes Steps 0-4 with Steps 5-9 as placeholders. Phase 2 says "Step 5" is convention detection. Phase 3 says "Steps 6-7" are architecture + interview. Phase 4 says "Steps 8-9" are migration + side quests. Phase 5 says "Step 10" is the summary. But the plan also says expertise profiling and hot spot analysis need their own steps — where do they fit? The step numbering doesn't add up: Steps 0-4 (Phase 1) + Step 5 (Phase 2) + Steps 6-7 (Phase 3) + Steps 8-9 (Phase 4) + expertise/hotspots/summary (Phase 5) = at least 12 steps but only Step 10 is mentioned for summary. The step map needs to be made explicit and consistent across all phases.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Quest creation command format is incorrect

Phase 4 shows: `echo '{"name":"<name>","goal":"<goal>"}' | goodplan quest:create --json`. This is correct per the CLI schema I verified. However, the plan doesn't mention that quest creation requires no active quest (error `STATE_QUEST_ALREADY_ACTIVE`). If the skill creates multiple quests, it needs to handle this — quests must be created then immediately have their status advanced past "active" or the second creation will fail. The plan should address how multiple quests are created in sequence.

Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** No idempotent re-entry handling

Existing skills follow an "idempotent re-entry" pattern (documented in `cli-interaction.md` section 10). If the user runs `/onboard-repo` and it fails partway, re-running should resume from where it left off. The plan doesn't address this. Given the skill has 10+ steps with user interaction, partial failure is likely. Each phase should specify how to detect and skip already-completed work (e.g., if `.project/` already exists from a partial run, skip init; if `conventions.md` already has content, skip or offer to re-detect).

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 Expected Behavior "before" check is weak

The "before" check is `ls skills/onboard-repo/SKILL.md` fails. This is trivially true and doesn't test anything meaningful. A better before check would be: "Running `/onboard-repo` in Claude Code shows no matching skill" or simply dropping this check since it's self-evident for file creation.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 Expected Behavior "before" check uses grep in a fragile way

`grep -c 'convention' skills/onboard-repo/SKILL.md` returns "only placeholder mentions" — this is subjective and not falsifiable. What count constitutes "only placeholder"? Better: check that Step 5 contains the literal text "placeholder" or "TODO".

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Missing documentation update task

The plan doesn't include updating `.project/conventions.md` repo structure section to add `onboard-repo/` to the skills list. It also doesn't mention updating the CLAUDE.md project context to reference the new skill if relevant.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Smoke test on real repo (Phase 5) lacks specific success criteria

"Verify it produces reasonable output without errors" is not falsifiable. What specific checks demonstrate success? At minimum: `.project/` exists, `idea.md` is non-empty, `conventions.md` has at least 3 detected conventions, `architecture/_overview.md` has a subsystem table with at least 1 row, `goodplan status --json` succeeds.

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan has good coverage of the functional scope and a logical phase ordering, but has critical gaps: no CLAUDE.md update step (required by all project-init skills), an unclear verification strategy that treats an LLM skill as runnable test code, and missing integration with established shared references. The step numbering is inconsistent across phases, and re-entry handling is absent despite this being a long interactive skill. To reach 9+: fix the two critical issues, add shared reference integration, clarify the verification approach, add idempotent re-entry, and tighten Expected Behavior checks.

## Summary
- Critical: 2
- Important: 5
- Minor: 4
