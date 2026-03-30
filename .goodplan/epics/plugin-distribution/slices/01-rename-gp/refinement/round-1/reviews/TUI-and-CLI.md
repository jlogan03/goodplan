## Issues

**[IMPORTANT]** Plan misses version output test in `runner-modes.test.ts`

The plan lists `tests/integration/state.test.ts` for the version output assertion update (`/^goodplan /` to `/^gp /`) but misses a second test in `tests/integration/runner-modes.test.ts` (line 44) that asserts `expect(result.stdout).toContain("goodplan")`. This test will fail after the rename unless updated.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Plan misses `[goodplan]` stderr prefix in `src/core/rpc/migrate.ts`

The plan correctly identifies `src/util/debug.ts` for the `[goodplan]` prefix change, but `src/core/rpc/migrate.ts` also uses `[goodplan]` as a stderr prefix in three warning messages (lines 979, 989, 999). These are not routed through the debug utility — they write directly to `process.stderr`. They will print `[goodplan]` after the rename unless updated. The Phase 1 task "All remaining `src/` files with `.project/` in string literals..." would catch `.project/` references but not the `[goodplan]` prefix, since those lines don't contain `.project/`.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `withTempDir` in test helpers hardcodes `".project"` in temp dir prefix string

The plan correctly identifies updating `GOODPLAN_DIR: path.join(tmpDir, ".project")` in helpers.ts, but the `fs.mkdtempSync` calls also embed `"goodplan-integration-"` as the temp dir prefix. While this is cosmetic (not functional), it is inconsistent with the rename and could cause confusion during debugging. More importantly, the plan's task description for helpers.ts only mentions `BINARY_PATH` and `path.join(tmpDir, ".project")` — but `BINARY_PATH` resolves from `../../goodplan` which also needs updating to `../../gp`. Both `withFixture` and `withTempDir` functions need GOODPLAN_DIR updated from `.project` to `.goodplan`.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Plan doesn't address `GOODPLAN_DIR` env var semantics or error message referencing it

In `src/core/data/project.ts`, the error message for DATA_NO_PROJECT says `"No .project/ directory found. Run \`goodplan init\` to create one."` — the plan's bulk task covers `.project/` references but this message also contains `goodplan init` which should become `gp init`. The plan should explicitly call this out since it's a user-facing error message and easy to miss in a bulk find-replace (the `.project/` part would be caught but `goodplan init` is a separate pattern).

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Error message in `src/index.ts` line 119 references `goodplan` in a user-facing error

The version compatibility error message reads `"Project data requires goodplan >= ..."`. This is a user-visible error string. The plan's Phase 1 tasks don't explicitly list `src/index.ts` error messages — only the `--version` output and the `name:` in `main.ts`. Since this is a user-facing CLI error, it should use the new binary name `gp`.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Expected Behavior grep patterns in Phase 2 are fragile

The "Before implementation" grep pattern in Phase 2 uses a long exclusion chain (`grep -v 'goodplan workflow\|goodplan project\|goodplan-managed\|...'`). This is fragile — if new prose forms appear, the grep silently passes. A more robust approach: after the bulk rename, manually inspect each remaining `goodplan` match rather than trying to pre-enumerate all prose exceptions in a regex.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan doesn't mention `src/commands/global/migrate.ts` line 22 JSDoc reference

The JSDoc comment in `src/commands/global/migrate.ts` says `"renamed to .project-old-<YYYYMMDD-HHmmss>/"`. This is documentation, not functional code, but the plan's Phase 1 task for migrate only mentions `src/core/rpc/migrate.ts`, not the command wrapper at `src/commands/global/migrate.ts`. The bulk task "All remaining `src/` files" should catch it, but the specificity of other tasks suggests this file might be overlooked.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Verification for Phase 1 doesn't test `--version` output

Phase 1 verification says "Run `bun run test`" and a manual lifecycle check, but the Expected Behavior section already covers `--version`. The verification section should explicitly include confirming `./gp --version` prints `gp <version>` (not `goodplan <version>`), since this is one of the most visible user-facing changes and could be missed if only the test suite is checked.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan covers the major rename correctly and the phasing is sensible (source first, docs second). However, there are multiple user-facing CLI outputs and test assertions that are missed or only implicitly covered by a vague bulk task. For a CLI rename, every user-facing string matters — the plan needs explicit callouts for all error messages, version strings, and test assertions that reference the old name. To reach 9+: (1) add explicit tasks for the five missed locations above, (2) make the bulk task more concrete by listing the ~15 files it covers, and (3) strengthen verification to explicitly test `--version` output format.

## Summary
- Critical: 0
- Important: 5
- Minor: 3
