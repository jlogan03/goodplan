# Merged Review Feedback — 02-project-init Plan (Round 1)

## CRITICAL Issues

None.

## IMPORTANT Issues

**IMP-1: `StateError` vs `GoodplanError` dual-error system unspecified**
Phase 4's `reduce()` returns `StateError` (plain object per `state-machine-api.md`: `{ code, message, detail? }`), but the existing codebase uses `GoodplanError` (class extending `Error`). The plan never specifies how Phase 5's RPC layer maps `StateError` to `GoodplanError`. The INIT_PROJECT guard failure should explicitly use `STATE_ALREADY_INITIALIZED` code in the task description (not just the test spec). Add: (1) explicit `StateError` shape definition in Phase 4, (2) explicit `StateError`-to-`GoodplanError` mapping note in Phase 5.
Sources: Software Architecture, TypeScript
Resolution: DIRECTLY_ACTIONABLE

**IMP-2: Debug logging `GOODPLAN_DEBUG=1` contradicts `--verbose` convention**
Phase 3 specifies `GOODPLAN_DEBUG=1` for debug logging. `conventions.md` documents `--verbose` for diagnostics on stderr and says "No other env vars initially" beyond `GOODPLAN_DIR`. The `--verbose` global flag already exists in `global-args.ts` but is unused. Either wire debug logging to `--verbose`, or document `GOODPLAN_DEBUG` as an intentional dev-time mechanism distinct from `--verbose` and update conventions.md. An env var is reasonable for test-time debugging (no CLI flag available), but the divergence must be acknowledged.
Sources: Holistic, Software Architecture, TypeScript, TUI and CLI
Resolution: DIRECTLY_ACTIONABLE

**IMP-3: `assembleState` walk-scope description is confused about root**
Phase 3 says "Skip dotfiles other than `.project/`" but the walk starts inside `.project/`, so there is no `.project/` child to skip. The skip rules should be: skip `.state-cache.json` within `.project/`, skip `node_modules` if present. Remove the "dotfiles other than `.project/`" clause.
Sources: Software Architecture
Resolution: DIRECTLY_ACTIONABLE

**IMP-4: `commitState` deferred concurrent modification detection needs explicit callout**
`data-layer-api.md` contracts say commitState "verifies that on-disk content matches oldState before writing." The plan defers this to slice 03 but never says so explicitly. Add a code-comment TODO note (`// TODO: concurrent modification detection deferred to slice 03`) so implementers know this is intentional deferral, not an oversight.
Sources: Software Architecture
Resolution: DIRECTLY_ACTIONABLE

**IMP-5: Missing `projectSchema` in Phase 2 schema registry**
Phase 2 schema registry task only lists new schemas (epic, slice, quest, overview, records). The existing `projectSchema` at `src/schemas/entities/project.ts` must be included in the registry mapping for `project.json`, since `commitState` validates against the registry.
Sources: Software Architecture
Resolution: DIRECTLY_ACTIONABLE

**IMP-6: `setEntry` intermediate directory creation policy unspecified**
Phase 4's INIT_PROJECT handler calls `setEntry` for paths like `epics/overview.json` which requires `epics/` to exist as a `DirectoryEntry`. The plan mentions "missing intermediate directories" as a test edge case but never specifies whether `setEntry` auto-creates intermediates or requires pre-creation. Specify auto-creation (matching `mkdirSync({ recursive: true })` semantics).
Sources: TypeScript
Resolution: DIRECTLY_ACTIONABLE

**IMP-7: JSONL append detection in `commitState` needs explicit comparison strategy**
Phase 3 says commitState detects appended JSONL entries by "comparing lengths" but doesn't specify whether existing entries are verified unchanged. Specify: trust the reducer (pure functions per INV-003 don't mutate existing entries), compare only lengths, append new entries. Make this an explicit decision.
Sources: TypeScript
Resolution: DIRECTLY_ACTIONABLE

**IMP-8: Phase 1 before-check references wrong directory**
Phase 1's "Before implementation" checks `ls src/core/state/` but Phase 1 creates files in `src/core/data/tree.ts`. The before-check should verify `src/core/data/tree.ts` does not exist.
Sources: Holistic
Resolution: DIRECTLY_ACTIONABLE

**IMP-9: Phase 5 `GOODPLAN_DIR` verification uses wrong semantics**
Phase 5 verification sets `GOODPLAN_DIR=/tmp/alt` and runs `goodplan init`, but `resolveProjectDir()` expects `GOODPLAN_DIR` to point to the `.project/` directory itself, not the project root. The init command ignores `GOODPLAN_DIR` (always uses cwd). Either fix the verification step or add a task to update init to respect `GOODPLAN_DIR`.
Sources: Holistic
Resolution: DIRECTLY_ACTIONABLE

**IMP-10: Phase 5 missing human-readable and quiet-mode output verification**
Phase 5 verifies JSON output thoroughly but never tests: (1) `goodplan status` human-readable output (no flags), (2) `goodplan init --quiet` suppresses output, (3) `goodplan init --json` returns structured JSON. The refactor from `readProject()` to `assembleState()` could silently break human-readable output paths.
Sources: TUI and CLI
Resolution: DIRECTLY_ACTIONABLE

**IMP-11: Missing schema registry test coverage for JSONL path patterns**
Phase 2 test spec says "schema registry resolves correct schema for each entity path pattern, unknown paths return undefined" but doesn't explicitly list JSONL patterns (`activity-log.jsonl`, `slices/foo/learnings.jsonl`, `slices/foo/architecture-deltas.jsonl`). These must be tested since `assembleState` uses them.
Sources: Holistic
Resolution: DIRECTLY_ACTIONABLE

## MINOR Issues

**MIN-1: Phase 3 mentions skipping `.state-cache.json` without context**
The task says "Skip `.state-cache.json`" but the cache is deferred to slice 03. Add a "(future-proofing)" note to clarify intent.
Sources: Holistic
Resolution: DIRECTLY_ACTIONABLE

**MIN-2: Phase 5 does not verify `activity-log.jsonl` content**
Phase 5 verifies structural outputs but never checks that `activity-log.jsonl` was written with the init entry. Add: `cat .project/activity-log.jsonl | head -1 | jq .phase` should return `"init"`.
Sources: Holistic
Resolution: DIRECTLY_ACTIONABLE

**MIN-3: No explicit cleanup mention of `tests/unit/data/json.test.ts`**
Phase 5 says "Remove or update `src/core/data/json.ts`" but doesn't mention the corresponding test file. Since `readEntity`/`writeEntity` will have zero callers, specify removing both `json.ts` and `json.test.ts` (or the file entirely if `deterministicStringify` already lives in `src/util/json.ts`).
Sources: Holistic, TypeScript
Resolution: DIRECTLY_ACTIONABLE

**MIN-4: Phase 2 `activityEntrySchema` `phase` field needs constrained type**
The plan doesn't specify whether `phase` should be `z.string()` or `z.enum([...])`. At minimum use `z.string().min(1)`. Defining a full enum can be deferred.
Sources: TypeScript
Resolution: DIRECTLY_ACTIONABLE

**MIN-5: Phase 2 `StateEvent` re-export indirection is unnecessary but harmless**
Phase 2 creates types in `src/schemas/state-events.ts`, Phase 4 re-exports from `src/core/state/types.ts`. The indirection is fine architecturally; note that `types.ts` is a thin re-export layer.
Sources: Software Architecture
Resolution: DIRECTLY_ACTIONABLE

**MIN-6: Missing `import type` / `export type` reminder for `verbatimModuleSyntax`**
With `verbatimModuleSyntax: true`, all type-only imports must use `import type`. Phase 4's re-exports from schemas must be `export type`. Add a brief note in Phase 1 or 2.
Sources: TypeScript
Resolution: DIRECTLY_ACTIONABLE

**MIN-7: `assembleState` path parameter semantics unclear**
Does `assembleState(projectDir?)` accept the `.project/` path (matching `resolveProjectDir`'s return) or the project root? Should be stated explicitly to avoid mismatch.
Sources: Software Architecture
Resolution: DIRECTLY_ACTIONABLE

**MIN-8: `getJson<T>` is an unchecked assertion**
`assembleState` erases the concrete `T` from Zod inference into `JsonEntry<unknown>`. `getJson<T>` is effectively an `as T` cast guarded by runtime schema validation. Add a note in Phase 1 acknowledging this so callers use the correct type parameter.
Sources: TypeScript
Resolution: DIRECTLY_ACTIONABLE

**MIN-9: Phase 5 missing `--query` without `--json` error verification**
Existing status command throws `VALIDATION_INVALID_INPUT` when `--query` is passed without `--json`. Verify this error path survives the refactor.
Sources: TUI and CLI
Resolution: DIRECTLY_ACTIONABLE

**MIN-10: Phase 5 missing error output format verification**
Phase 5 verifies init error exits with code 3 and `STATE_ALREADY_INITIALIZED` but not the error format. Verify both human mode (stderr message) and JSON mode (`{ "error": { "code": ... } }` to stdout) per INV-007.
Sources: TUI and CLI
Resolution: DIRECTLY_ACTIONABLE

## DIRECTLY_ACTIONABLE (for loop exit)

All 21 issues (11 IMPORTANT + 10 MINOR) are DIRECTLY_ACTIONABLE. No issues require research, codebase exploration, or user input.

## RESEARCH_NEEDED

None.

## Contradictions Resolved

**Debug logging approach (IMP-2):** Holistic and TUI/CLI reviewers said to use `--verbose` per conventions. TypeScript and Software Architecture reviewers acknowledged the conflict but noted an env var is reasonable for test-time debugging. Resolution: the TUI/CLI reviewer is the domain specialist for CLI conventions, so the primary recommendation is to wire to `--verbose`. However, the TypeScript reviewer's point about test-time debugging is valid. Merged recommendation: wire production debug logging to `--verbose`, and if a test-only env var is needed, document it as `GOODPLAN_DEBUG` for dev/test use only in conventions.md.

**`StateEvent` re-export (MIN-5 vs IMP-1):** Software Architecture called the re-export "unnecessary indirection" (MINOR), while TypeScript flagged the `StateError` shape confusion as IMPORTANT. These are compatible — the re-export layer is fine, but the shapes need explicit documentation. No contradiction.

## Unresolved (USER_INPUT required)

None.
