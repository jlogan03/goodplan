# Agent Skill Review — Round 2

## Issues

**[IMPORTANT]** Phase 5 skill description is better but may still under-trigger for the most common entry point
The current description ("Migrate a pre-CLI .project/ directory to CLI-managed state. Use when DATA_NO_PROJECT error occurs but old-format .project/ exists.") is good for the error-driven trigger but misses the proactive trigger. Users will often say "I want to use the CLI with my existing project" or "convert my project to goodplan" without having seen a `DATA_NO_PROJECT` error. Consider appending a clause like: "Also use when user wants to convert an existing .project/ directory to CLI-managed format, or says 'migrate project', 'convert to CLI', 'upgrade project'." This follows the `create-epic` pattern of including common trigger phrases. The description is 1024 chars max so there's room.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 SKILL.md references `../_shared/references/cli-interaction.md` but the skill lives at `skills/migrate/SKILL.md` — verify the relative path resolves correctly
The plan says the skill should reference `../_shared/references/cli-interaction.md`. From `skills/migrate/SKILL.md`, `../` goes to `skills/`, then `_shared/references/cli-interaction.md` — this path is correct. However, the plan also creates `skills/migrate/references/migration-heuristics.md`. The SKILL.md should reference this local file as `references/migration-heuristics.md` (relative to the skill directory). The plan's Phase 5 tasks mention "See `references/migration-heuristics.md`" which is correct, but the task for creating the file says `skills/migrate/references/migration-heuristics.md` (absolute). Make sure the SKILL.md body uses the relative path `references/migration-heuristics.md` consistently, matching the convention in other skills (e.g., `create-epic` references `references/templates.md`).
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 5 skill doesn't address the `readStdin()` return type constraint for the migrate command
The existing `readStdin()` in `src/util/stdin.ts` returns `Record<string, unknown>` and rejects non-object JSON (arrays, primitives). Phase 2 says the migrate command accepts `MigrationResponse` on stdin: `{ round: number, answers: MigrationAnswer[] }`. This works fine with `readStdin()` since it's a JSON object. However, the skill needs to know that the stdin payload must be a single JSON object — it cannot pipe an array or bare value. The skill's Step 3/4 show `echo '<json>' | goodplan migrate --json` which is correct, but the skill should explicitly note the payload must be a `{ round, answers }` object, not just "answers as JSON." This matters because the LLM might try to pipe just the answers array without the envelope.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 heuristic ordering could miss `activated` epics that also have `completion/` artifacts
The heuristics in `references/migration-heuristics.md` check `abandoned.md` first, then `completion/learnings.md`. An epic marked completed should indeed be `completed`. But the real `.project/` shows all epics are `~~archived~~` prefixed AND have `completion/` directories. The heuristics correctly handle this (completion -> completed). However, there's no explicit mention in the heuristics of what to do when an epic has BOTH `~~archived~~` prefix AND `__active__` prefix — the plan says "Strip `~~archived~~NN_` prefix" and "Strip `__active__` prefix" but doesn't clarify that these are mutually exclusive in practice. A brief note confirming they never co-occur would prevent implementer confusion.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 skill size constraint (15KB / 500 lines) should be verified against actual content volume
The plan specifies `wc -c < skills/migrate/SKILL.md` < 15360 (15KB) and "under 500 lines." The skill has 9 major sections (frontmatter, 6 steps, error handling, intermediate status handling) plus references to heuristics. The existing `complete` skill (similar complexity with scope resolution, multiple steps, error handling) is a good benchmark. The plan correctly splits heuristics into `references/migration-heuristics.md`, which should keep the main SKILL.md within bounds. This is a minor point — just confirming the split is necessary to meet the constraint, which it appears to be.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 verification mentions "Run `goodplan migrate --json` on a test fixture" but the test fixture doesn't exist until Phase 6
Phase 5 verification says: "Run `goodplan migrate --json` on a test fixture and confirm the skill's documented invocations produce valid output (behavioral verification)." But the synthetic test fixture at `tests/fixtures/pre-cli-project/` is created in Phase 6. During Phase 5 implementation, the implementer would need to use a copy of the real repo's `.project/` (which Phase 6 also does first as "manual dogfood"). The verification could clarify: "Run on a copy of the real repo's `.project/`" for Phase 5, since the synthetic fixture isn't available yet.
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

Significant improvement from round 1 (6/10). All critical issues from round 1 are addressed: version check step is present, stdin syntax is corrected, triggerable description is written, cli-interaction.md is referenced, heuristics are split to references/, and behavioral verification is added. The remaining issues are IMPORTANT-level refinements around trigger coverage, path consistency, and stdin payload format clarity. The skill design now follows established patterns (matching `create-epic` and `complete` structure) and the progressive disclosure via `references/migration-heuristics.md` is well-designed.

To reach 9+: Add common trigger phrases to the description, ensure SKILL.md body explicitly mentions the `{ round, answers }` envelope format, and clarify the Phase 5 verification to use a real repo copy rather than the not-yet-created fixture.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
