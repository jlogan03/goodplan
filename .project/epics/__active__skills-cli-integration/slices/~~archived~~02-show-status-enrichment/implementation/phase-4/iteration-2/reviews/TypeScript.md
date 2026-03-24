## Issues

**[CRITICAL]** All 7 integration tests still fail — `tests/global-setup.ts` missing `--define` flag
The root cause is now identified: `tests/global-setup.ts` compiles the binary with `bun build --compile src/index.ts --outfile goodplan` but does NOT pass `--define __GOODPLAN_VERSION__='"1.0.0"'`. The production `package.json` build script passes it, but the test globalSetup does not. In the compiled binary, `readVersionFallback()` in `src/version.ts` tries to read `package.json` relative to `import.meta.dir`, which fails in a compiled Bun binary, so it falls back to `"0.0.0-dev"`. Then `parseSemver("0.0.0-dev")` throws `VALIDATION_INVALID_INPUT` because `"0.0.0-dev"` does not match `/^\d+\.\d+\.\d+$/`. This cascades into every test:
- Tests that expect exit code 0 get exit code 2 (the parseSemver error)
- The "major-behind" test expects `VALIDATION_VERSION_MAJOR_MISMATCH` but gets `VALIDATION_INVALID_INPUT`
- The `--version` test expects `"1.0.0"` but gets `"0.0.0-dev"`

Fix: update `tests/global-setup.ts` to mirror the production build script's `--define` flag. Read the version from `package.json` at build time:
```ts
const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf-8"));
execFileSync("bun", [
  "build", "--compile", "src/index.ts", "--outfile", outfile,
  "--define", `__GOODPLAN_VERSION__='\"${pkg.version}\"'`,
], { ... });
```
File: tests/global-setup.ts:15
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Biome import ordering violations in all three RPC files
The new `import { VERSION }` and `import { bumpDataVersionIfNeeded }` statements were appended at the bottom of the import blocks in `begin.ts`, `submit.ts`, and `complete.ts`. Biome's `organizeImports` rule requires alphabetical ordering by module path. The `../../version.js` import should sort before `../data/commit.js`; `./paths.js` should sort before `./types.js`; and `./version-stamp.js` sorts after `./types.js` (already correct). Additionally, existing imports that were reordered in Phase 3 (e.g., `DecisionEntry`, `LearningEntry` in `begin.ts`) need to stay in sorted order.
Files: src/core/rpc/begin.ts:20-23, src/core/rpc/submit.ts:20-23, src/core/rpc/complete.ts:27-31
Resolution: DIRECTLY_ACTIONABLE — run `npx biome check --fix` on these three files, or manually reorder imports.

**[IMPORTANT]** Biome formatting violations in all three RPC files
The same three RPC files have formatting issues (likely long lines that need wrapping). Biome reported `format` errors alongside the `organizeImports` errors.
Files: src/core/rpc/begin.ts, src/core/rpc/submit.ts, src/core/rpc/complete.ts
Resolution: DIRECTLY_ACTIONABLE — run `npx biome check --fix` on these files.

**[MINOR]** `checkVersionCompatibility` catches non-GoodplanError exceptions with a `debug:` prefix
The catch block at `src/index.ts:187-191` outputs `debug: version compatibility check failed: ...` to stderr. The prefix `debug:` is not a standard log level in this codebase (other messages use `warning:` with `pc.yellow()`). Consider using `pc.dim("debug:")` or just `pc.yellow("warning:")` for consistency. This is cosmetic.
File: src/index.ts:189
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10
The iteration 1 issues I1 (Biome formatting in `semver.ts`), I2 (import ordering in `index.ts`), I3 (`noUncheckedIndexedAccess` in `parseSemver`), M2 (docstring accuracy), and M3 (empty catch block) are all fixed. However, the critical issue (C1 — all integration tests failing) persists because the root cause was not addressed: `tests/global-setup.ts` still does not pass the `--define __GOODPLAN_VERSION__` flag. Additionally, the new imports in the three RPC files introduced new Biome violations (import ordering and formatting). Fixing the `global-setup.ts` build and the Biome violations would bring this to 9+.

## Summary
- Critical: 1
- Important: 2
- Minor: 1
