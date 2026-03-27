## Issues

**[IMPORTANT]** `buildMigrationState` constructs `epicJsonContent` as `Record<string, unknown>` — type safety hole
Phase 2 correctly removes `sliceSequence` from line 256, but the plan does not address the broader type safety issue: `epicJsonContent` at line 250 is typed as `Record<string, unknown>`, which means the compiler cannot catch mismatches between the constructed object and `epicSchema`. This is how `sliceSequence` survived in the output for so long — the loose type hid the schema violation. The plan should include a task to type `epicJsonContent` using `z.input<typeof epicSchema>` (or the inferred `Epic` type) so that future schema changes are caught at compile time. Currently `commitState` silently strips unknown keys via Zod parse (line 122 of `commit.ts`), which masks bugs rather than surfacing them.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `renameProjectDir` timestamped naming needs race-condition and type-safety consideration
The plan says to use `.project-old-<timestamp>/` for backup naming but does not specify the timestamp format or collision handling. If `Date.now()` is used (millisecond epoch), two rapid re-migrations could theoretically collide. The implementation task should specify: (1) use ISO 8601 compact format (`YYYYMMDD-HHmmss`) for human readability, (2) retain the existing `fs.existsSync` guard as a collision check (just update the path), and (3) type the return value of `renameProjectDir` explicitly as `string` (it already is, but the function signature should document the new naming convention in a JSDoc comment). The plan's current task description at Phase 2 bullet 3 is too vague for a clean implementation.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 2 re-migration warning uses stderr but no stderr utility exists in the codebase
The plan says to "emit a stderr warning" when `project.json` exists. The codebase uses `console.error` nowhere — all output goes through the `output()` utility (`src/util/output.ts`). Writing directly to `process.stderr` would bypass the structured output pattern. The plan should either: (a) use `console.warn` which writes to stderr but is at least a standard API, or (b) add the warning as a `warning` field in the structured JSON result (consistent with how `goodplan status --json` handles warnings). Option (b) is more consistent with INV-007's structured error responses philosophy and keeps the output machine-parseable for the `/migrate` skill.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `startContext.test.ts` fixture has stale `sliceSequence` — plan handling is ambiguous
Phase 1 says to "check `sliceSequence` at line 43" and conditionally skip or remove. The investigation shows this is a raw `ProjectState` object typed inline (not validated against `epicSchema`), so `sliceSequence` is just extra data that flows through without causing failures. However, with `exactOptionalPropertyTypes: true` and the `Epic` type not having `sliceSequence`, this should already be a compile error — unless the fixture uses `Record<string, unknown>` or `as` assertions to bypass it. The plan should simply say: remove `sliceSequence` from the fixture. The conditional "check and skip" language adds unnecessary ambiguity.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 migration unit test changes reference specific line numbers that may shift after Phase 1
The plan says "remove `sliceSequence` from output assertions at lines 86, 300, 359, 432, 571" in `tests/unit/rpc/migrate.test.ts`. These line numbers are correct as of the current file state but could shift if any earlier changes in Phase 1 touch this file (Phase 1 does not touch this file, but if the implementer reorders phases or batches changes, the line numbers become misleading). This is minor — the implementer should grep for `sliceSequence` rather than relying on line numbers. The plan could note "all `sliceSequence` references in output assertions" instead of listing line numbers.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 2 integration test task description is vague about which `sliceSequence` assertions to keep vs remove
The plan says "remove `sliceSequence` from output assertions (~8 locations)" in `tests/integration/migrate.test.ts`. However, `sliceSequence` appears in both Q&A *input* assertions (which should remain — the migration still collects `sliceSequence` via `epicDetailResponseSchema`) and *output* assertions (which should be removed). The current grep shows `sliceSequence` at lines 79, 212, 399, 439, 493, 521, 592, 598 — of these, lines 79, 399, 493, 521, 592, 598 are in Q&A input data and should remain. Only lines 212 and 439 are output assertions that should be removed. The "~8 locations" estimate is wrong; it's 2 output assertion removals.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is functionally sound and correctly identifies all the work needed. The TypeScript-specific concerns are around type safety gaps (`Record<string, unknown>` bypassing schema types in `buildMigrationState`), imprecise task descriptions that could lead to incorrect implementation (stderr warning, `sliceSequence` assertion counts), and a missed opportunity to strengthen compile-time safety. To reach 9+: (1) type `epicJsonContent` with the `Epic` type, (2) specify the structured warning approach, (3) correct the integration test `sliceSequence` removal count from ~8 to 2.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
