# Learnings

## Non-breaking Zod union transitions create cleanup debt — tighten immediately after migration
_Source: learnings-directory-pattern_

The `z.union([schemaNew, schemaLegacy])` approach let existing data validate while new features were built, but every code path touching learnings had to handle both variants (type guards, conditional spreads, dual-branch logic). The transition period should be as short as possible. Phase 4 tightened the schema immediately after migration ran, which simplified 5+ files by removing dead branches. Future schema migrations should plan union → tighten as an atomic pair.

## The RPC layer is the correct transformation boundary for input-to-storage mapping
_Source: learnings-directory-pattern_

Mapping `LearningInput` (with `detail`) to `LearningEventEntry` (with `file`) in the RPC layer preserves state machine purity (INV-003) and the load-reduce-commit pattern. Slug derivation and path assignment happen before `reduce()`, but `.md` file writes happen after `reduce()` succeeds — no orphan files on failure. This pattern generalizes: any input-to-storage transformation that involves I/O should happen in the RPC layer, not the state machine.

## Skill artifacts with similar names need explicit disambiguation in plans
_Source: learnings-directory-pattern_

`completion/learnings.md` (re-entry detection artifact) and `.project/learnings.md` (monolithic project learnings) are completely different things. Plan refinement caught this as a CRITICAL issue when 5 reviewers flagged it simultaneously. Any plan touching a file that shares a name with another artifact at a different scope must explicitly distinguish them in the Overview and in every phase that references either.

## Re-migration through the CLI is the correct way to convert .project/ state — never scripts
_Source: learnings-directory-pattern_

The initial attempt to convert learnings.md with a bun script directly modifying `.project/` files was wrong — CLAUDE.md explicitly prohibits this. Running `goodplan migrate` handles the conversion as part of its standard pipeline, maintaining state consistency. Future conversions of .project/ data should always go through migration, even if the interactive Q&A feels heavyweight.

## Plans should distinguish implementation tasks from verification-only tasks
_Source: learnings-directory-pattern_

Three of Phase 2's eight tasks required no code changes — `learning:list`, `assembleState`, and `status` already handled the new format correctly due to JSONL passthrough and automatic directory walking. Marking these as "verification" rather than "implementation" would have saved review budget and set clearer expectations for the implementation agent.
