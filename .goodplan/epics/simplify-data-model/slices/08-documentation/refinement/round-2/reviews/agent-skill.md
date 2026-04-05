# Agent Skill Review — Round 2

## Issues

**[IMPORTANT]** Phase 3 stale reference sweep: The plan lists many files in skills/ and agents/ that no longer contain stale references. Codebase grep confirms stale `/`-prefixed skill names exist in only 5 files: `start-epic/SKILL.md` (13 matches), `status/references/status-logic.md` (13 matches), `explore/SKILL.md` (4 matches), `upgrade/references/migration-heuristics.md` (1 match — `/migrate`), and `init/references/expertise-profiling.md` (1 match — `/onboard-repo`). The plan's task list claims stale references in `create-epic/SKILL.md` (~10), `plan-slice/SKILL.md` (~2), `audit/SKILL.md` (~4), `create-side-quest/SKILL.md` (~1), `_shared/references/cli-interaction.md` (~2), `_shared/references/decisions-format.md` (~1), `_shared/references/README.md` (~1), `_shared/references/audit-conventions.md` (~1), `init/references/repo-scanning.md` (~1), `init/references/migration-detection.md` (~1), and all three agent files (`audit-architecture-phase.md`, `audit-docs-phase.md`, `audit-tests-phase.md`). Grep across all of these returns zero matches. An implementer following this task list will waste time searching for non-existent references, or worse, incorrectly modify files. The task list should be trimmed to the 5 files that actually contain stale references.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 stale reference sweep: The plan also tasks updating `output-templates.md` and `iteration-loop.md` for old skill names, but these use bare names (e.g., `refine-plan`, `refine-architecture`) in "Used by" annotations and substitution rule docs, not `/`-prefixed invocation references. The plan's grep-based verification pattern (`/create-architecture\|...`) won't catch these bare-name references. The plan should either (a) add a separate grep for bare old skill names in `_shared/references/` and include it in the verification step, or (b) explicitly list the bare-name replacements needed: `refine-plan` -> `plan-slice (refinement phase)`, `refine-architecture` -> `create-epic (architecture refinement phase)`, `refine-slices` -> `create-epic (slice refinement phase)`, `implement-plan` -> `implement`, `create-slices` -> `create-epic (slices phase)`, `create-plan` -> `plan-slice (creation phase)`, `create-architecture` -> `create-epic (architecture phase)`, `complete` -> `complete-epic`. Without this, these ~15 bare references will survive the sweep.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 start-epic rewrite: The plan's Step 4 says "Present Architecture: Load architecture file paths from `gp status --json --query '.artifacts.architecture'`. Read and present them to the user for review." This loads ALL architecture files (both top-level and epic-level — currently 15 files). The skill should only present the epic's architecture, not the full project architecture. The correct approach is `gp epic:show --epic <name> --json` to get the epic's architecture path, then read files under that path. Reading all 15 architecture files bloats the orchestrator context unnecessarily and presents irrelevant top-level architecture to the user when they only need to review the epic's target architecture.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 1 start-epic rewrite: Step 3 (Pre-activation Check) enumerates wrong-status cases with remedies, which is good (round-1 fix applied). However, the `slices-defined` case says "tell user to run `/gp:refine-slices` (or `/gp:create-epic`) to refine slices first." The `/gp:refine-slices` skill no longer exists — slice refinement is part of `/gp:create-epic`. The remedy should be simply "run `/gp:create-epic` to continue epic setup" (same as the `created` and `explored` cases). This is the exact type of stale reference Phase 3 is meant to catch, appearing in the Phase 1 plan text itself.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 E2E validation: The plan says to use `--model claude-opus-4-6` "if needed" but the harness's `--model` flag should use the standard model identifier format. Verify the exact model string the harness accepts — the harness scripts in `tools/dogfood/` may use different identifiers than what's shown here.
Resolution: CODEBASE_EXPLORATION

Research: Check `tools/dogfood/validate-consolidated.ts` for how the `--model` flag is parsed and what model identifier format it expects.

**[MINOR]** Phase 2 Bug B (quest creation syntax): The plan says to replace `quest:create --title` with `echo '{"name":"<name>","goal":"<goal>"}' | $GP quest:create --json`. The plan correctly identifies line 226 as the location. However, the plan's replacement uses `name` in the JSON payload — verify this matches the actual `quest:create` input schema. The CLI command research file doesn't cover `quest:create`'s input schema. If the field name is `title` (not `name`) in the schema, the fix would still be wrong.
Resolution: CODEBASE_EXPLORATION

Research: Check `src/schemas/commands/quest.ts` or `src/commands/quest/create.ts` for the `quest:create` input schema — specifically whether the field is called `name` or `title`.

## Score: 8/10

Round 2 is substantially improved from round 1. The critical issues (epic:activate preconditions, learningInputSchema format, context discipline, harness-bug distinction) were all addressed well. The remaining issues are concentrated in Phase 3's stale reference sweep, which lists many files that no longer contain stale references (likely based on stale codebase context from before prior slices cleaned them up) and misses bare-name references in shared reference files. Phase 1 has one residual stale reference (`/gp:refine-slices`) in its own text. To reach 9+: trim Phase 3's file list to the 5 files that actually have stale references, add bare-name sweep coverage, fix the architecture file loading scope in Phase 1, and remove the `/gp:refine-slices` reference from Phase 1's Step 3.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
