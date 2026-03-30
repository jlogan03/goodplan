## Audit skills should use `goodplan quest:create` for side quest proposals, not filesystem writes
_Source: audit-docs-and-tests_

The existing audit-architecture skill uses direct filesystem writes (`mkdir -p .project/side-quests/<name>`) for side quest creation, which predates the CLI. New audit skills should use `echo '{"name":"...","goal":"..."}' | goodplan quest:create --json` — the CLI-native mechanism. This was flagged during plan refinement and resulted in a tracked divergence (side quest `audit-arch-quest-create` to update audit-architecture). Future skills should always check if a CLI command exists before falling back to filesystem operations.

## Dash convention in graceful stop markers matters for resume detection
_Source: audit-docs-and-tests_

Graceful stop markers like `<!-- partial — interrupted during ...` are canonical keys — resume detection parses them to determine where to continue. The plan specified em-dashes (—) but initial implementation used double hyphens (--). This was caught in code review as CRITICAL because it would break resume parsing. Future skill implementations must match the exact marker text from the plan/spec, including punctuation.

## Shared audit conventions reduce drift risk across the audit skill family
_Source: audit-docs-and-tests_

All three audit skills (architecture, docs, tests) share identical severity definitions, reviewer output format, and side quest template. Extracting these to `skills/_shared/references/audit-conventions.md` with per-skill guidance.md files cross-referencing it prevents drift. When adding new skills to a family, extract shared conventions early rather than letting duplication accumulate.

## Running audit skills on the project itself is the best end-to-end verification
_Source: audit-docs-and-tests_

Running `/audit-docs` on the goodplan repo revealed 13 real findings (task entity missing from docs, stale primer, stale fitness function status). Running `/audit-tests` found 15 findings (untested helpers.ts, stale event counts, missing fitness functions). These were genuine issues, not contrived test scenarios. Future skill verification should prioritize running the skill on a real codebase over grep-based file existence checks.

## install-skills.sh has a hardcoded SKILL_DIRS array that must be updated manually
_Source: audit-docs-and-tests_

New skills are not auto-discovered — they must be manually added to the `SKILL_DIRS` array in `scripts/install-skills.sh`. This was flagged as CRITICAL during plan refinement because without it, `bun run install:skills` silently skips the new skills. Consider making this dynamic (scanning the `skills/` directory) to prevent this class of error.
