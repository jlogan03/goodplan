# Agent Skill Review

## Issues

**[CRITICAL]** Phase 5 skill lacks version check step (Step 1)
Every existing skill (e.g., `create-epic`) starts with a version check step (`goodplan --version --json`) per `cli-interaction.md` section 1. Phase 5's skill design jumps straight to "Step 1 -- Start migration" without a version check. The skill frontmatter declares `requires: goodplan >= 1.0.0` but the plan never instructs the skill to verify the version at startup. This is a mandatory pattern for all CLI-integrated skills.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Phase 5 skill uses wrong stdin piping syntax
Phase 5 task list says "Pipe answers as JSON to `goodplan migrate --json` via stdin" but does not specify the Claude Code `stdin:` parameter syntax documented in `cli-interaction.md` section 4. Existing skills use `stdin: "" | goodplan ...` (Claude Code Bash tool API) or `echo '...' | goodplan ...`. The plan should specify the exact invocation pattern to avoid the compiled binary blocking on empty stdin, per the documented convention: "The compiled binary reads stdin and will block if nothing is piped."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 skill description will under-trigger -- too vague for the use case
The current stub's `description` is "Assists with goodplan skill migration and consolidation workflows." The plan (Phase 5 tasks) specifies frontmatter but doesn't provide a concrete description. The description must include BOTH what the skill does AND when to use it. A good description would be something like: "Migrate a pre-CLI .project/ directory to CLI-managed state. Use when a project has epics, slices, and quests in the old format and `goodplan status` returns DATA_NO_PROJECT. Runs `goodplan migrate --json` and answers its questions by reading old-format artifacts." Without a pushy, specific description, the skill will never trigger on natural user prompts like "migrate my project" or "convert this old project."
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 skill is missing error handling for the version check and initial CLI call failures
The existing `create-epic` skill (a good reference) has explicit error handling patterns: "If the CLI is not found or the version is too old: [message]. Stop the skill. Do not fall back to direct file access." Phase 5 mentions error handling at the end but doesn't follow the established Step 1 pattern of failing fast before doing any work. The skill should follow the same structure: version check first, then status detection, with explicit stop conditions.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 skill is missing `cli-interaction.md` reference
All existing workflow skills reference `../_shared/references/cli-interaction.md` for error handling patterns (e.g., `create-epic` Step 1: "For all CLI commands in this skill, follow error handling patterns in `../_shared/references/cli-interaction.md`"). Phase 5 mentions "Verify skill references correct CLI command syntax per `cli-interaction.md` conventions" as a task but doesn't instruct the skill itself to reference this shared file. The skill body should include an explicit pointer to `cli-interaction.md` for error handling, just like other skills do.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 skill lacks progressive disclosure -- no references/ directory considered
The skill tasks describe writing substantial content directly into SKILL.md: status inference heuristics, source path conventions, Q&A loop instructions, error handling guidance. Per the Agent Skill evaluation criteria, SKILL.md body should be under 500 lines, with domain-specific content split into `references/` files. The status inference heuristics and directory scanning conventions are prime candidates for a `references/migration-heuristics.md` file, keeping the main SKILL.md focused on workflow steps. This also aligns with the existing skill pattern where `create-epic` references `references/templates.md`.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 verification is weak -- only checks file content, doesn't invoke the skill
The verification for Phase 5 is: "Read the skill and confirm it covers all question types" and "Confirm status inference heuristics match." This is file-existence verification, not behavioral verification. A skill phase should invoke the skill end-to-end (or at minimum test the CLI interaction pattern) to verify the skill actually works when triggered. At minimum, the verification should run `goodplan migrate --json` on a test copy and confirm the skill's documented invocations produce valid output.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 skill status inference is incomplete for some edge cases
The status inference heuristics in Phase 5 cover most cases but miss:
- Epic with `__active__` prefix but in a state beyond `activated` (e.g., was active, then got more phases done). The existing `.project/epics/` shows `~~archived~~03_skills-cli-integration` which was the most recent active epic -- the `__active__` prefix convention is already documented but the plan doesn't address how to detect which epic was most recently active if none has the `__active__` prefix.
- Slices with `plan.md` but no `plan-refined.md` should be `plan-created`, not `planning`. The heuristics list `plan-refined.md exists -> plan-refined` and `plan.md exists -> plan-created` which is correct, but the ordering matters and should be explicit (already is in Phase 5 -- "check in order, first match wins" -- just confirming).
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 missing `goal` field in `CREATE_QUEST` -- plan says quests have goals but quest creation may need it
Phase 1 inventory schema has `quests` with `goal` field, but looking at the existing `StateEvent` union, `CREATE_QUEST` takes `{ name: string; goal: string; ts: string }`. The MIGRATE_PROJECT event (Phase 4) constructs quests with goals, but the plan should explicitly note that quest goals come from the inventory answers and are passed through to the MIGRATE_PROJECT payload. This is implied but easy to miss during implementation.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan has a solid overall architecture for the migration Q&A protocol, and Phases 1-4 (CLI/state machine work) are well-specified. However, Phase 5 (the skill itself) has significant gaps relative to the established skill conventions in this codebase. The skill design doesn't follow the patterns established by existing skills like `create-epic` -- it's missing the version check step, the `cli-interaction.md` reference, proper stdin piping syntax, a triggerable description, and behavioral verification. These are all patterns that are documented and consistently followed across existing skills, so omitting them is a meaningful gap.

To reach 9+: Add version check step to the skill, reference cli-interaction.md, use proper stdin syntax, write a specific description, split heuristics into references/, and add behavioral verification that actually runs the migration flow.

## Summary
- Critical: 2
- Important: 5
- Minor: 2
