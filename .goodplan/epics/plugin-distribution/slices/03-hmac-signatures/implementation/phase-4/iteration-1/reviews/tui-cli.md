# TUI and CLI Review — Phase 4: Verify Commands & Build Defines

## Issues

**[IMPORTANT]** Unused imports in test file
The test file imports `signStateTree` from `hmac.js` and `assembleState` from `assemble.js`, neither of which is used. Biome flags these as `noUnusedImports` errors. While 580 lint errors exist across the codebase, new code should not add to the count.
File: tests/unit/commands/verify.test.ts:5
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Import ordering in schema.ts
The `LEGACY_DIR_NAME, PROJECT_DIR_NAME` import from `../../core/data/project.js` is out of sort order relative to the other imports. Biome's `organizeImports` rule flags this. The import was likely appended when adding the verify command registration rather than inserted in sorted position.
File: src/commands/global/schema.ts:27
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `--quiet` flag not forwarded on error paths
In `verify.ts` line 105, the error handler constructs `jsonArgs` without `quiet`:
```typescript
const jsonArgs = args.query || args.json ? ({ json: true } as const) : {};
```
This means `gp verify --quiet` on a failing project still prints the error to stderr. The `state.ts` command has the same pattern (always JSON errors), but `verify` has a human-readable error path where `--quiet` could reasonably suppress stderr output. This is a minor inconsistency -- errors on stderr are arguably always important -- but worth noting for consistency with `output()` which does respect `--quiet`.
File: src/commands/global/verify.ts:105
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No test for `--quiet` flag behavior
The test suite covers `--json`, `--fix`, human-readable, bootstrap, and tampered scenarios, but does not test `--quiet` mode (which should suppress all stdout). Since `--quiet` is a global arg and `output()` handles it, this is low risk, but a single test asserting no stdout with `--quiet` on a passing project would complete coverage of the output modes.
File: tests/unit/commands/verify.test.ts:116
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `--query` flag not tested
Similarly, `--query` (jq expression filtering) is not tested. For example, `gp verify --json --query '.status'` should return `"pass"`. The `output()` function handles this, but a test would confirm the verify command's output shape is query-friendly.
File: tests/unit/commands/verify.test.ts:116
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Human-readable output uses picocolors without fallback test
The human output path uses `pc.green()` and `pc.dim()` for colored output. There is no test verifying behavior when `NO_COLOR=1` is set. This is a low-risk concern since picocolors handles this internally, but the evaluation criteria call out NO_COLOR/FORCE_COLOR respect.
File: src/commands/global/verify.ts:83
Resolution: DIRECTLY_ACTIONABLE

## Score: 8/10

The CLI command follows established patterns well: consistent use of `globalArgs`, proper dual-mode output (JSON/human), correct exit codes per INV-007, proper error handling with `GoodplanError`, and appropriate registration in both `main.ts` and the schema command registry. The `--fix` flag is a boolean with sensible default. Help text is clear and actionable. The build defines in `package.json` and `build-plugin.sh` correctly inject `__GP_HMAC_KEY__` with a dev fallback. Tests cover the critical paths (pass, fail, fix, bootstrap) in both JSON and human modes.

To reach 9+: fix the two lint issues (unused imports, import ordering) and add basic `--quiet` and `--query` test coverage.

## Summary
- Critical: 0
- Important: 2
- Minor: 4
