## Issues

**[CRITICAL]** `tests/global-setup.ts` outfile must change from `goodplan` to `gp`
The plan lists `vitest.config.ts` and `tests/global-setup.ts` as "no change needed" because `__GOODPLAN_VERSION__` stays. However, `tests/global-setup.ts` line 11 hardcodes `const outfile = path.join(projectRoot, "goodplan")` — the compiled binary name used by all integration and fitness tests. If `package.json` build script changes `--outfile` to `gp`, this file MUST also change to `"gp"`. Without this, the global setup compiles a binary named `goodplan`, but `helpers.ts` (which the plan does update to `"gp"`) will look for `gp`, causing every integration and fitness test to fail with "Compiled binary not found".
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** `tests/integration/helpers.ts` has additional `goodplan` string literals beyond BINARY_PATH
The plan says to change `BINARY_PATH` from `"goodplan"` to `"gp"` and the `.project` path join. However, the file also contains `goodplan-integration-` in temp directory prefixes (lines 122 and 149). These are cosmetic (temp dir naming) so they won't cause failures, but more importantly the `GOODPLAN_DIR` env var at line 131 is set to `path.join(tmpDir, ".project")` — this MUST change to `path.join(tmpDir, ".goodplan")`. The plan mentions changing `path.join(tmpDir, ".project")` but there are actually TWO such occurrences (line 131 in `withFixture` and line 153 in `withTempDir`). The plan should explicitly call out both.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `src/commands/global/init.ts` error message still references `.project/`
The plan's bulk task "All remaining `src/` files with `.project/` in string literals, error messages" covers this, but the `init.ts` file deserves explicit mention because it has both a path literal (`path.join(cwd, ".project")` on line 31) and an error message string (`".project/ exists"` on line 42). The error message is user-facing and will confuse users if it says `.project/` when the actual directory is `.goodplan/`. Listing it explicitly reduces risk of being missed in a bulk sweep.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `src/index.ts` version output says `goodplan` but `--json` version output is not mentioned
Line 148 outputs `goodplan ${VERSION}` for non-JSON `--version`. The plan covers changing this to `gp ${VERSION}`. However, line 146 outputs `{ version: VERSION }` for `--json --version` — this is fine as-is (no binary name in JSON output). Worth noting that the plan correctly identifies the non-JSON path but should confirm the JSON path needs no change, since the error message on line 118 also says `"Project data requires goodplan >= ..."` which needs updating.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `src/core/data/project.ts` error message references `goodplan init`
Line 43: `"No .project/ directory found. Run \`goodplan init\` to create one."` — this contains both the old directory name AND the old CLI name. The plan correctly identifies the `.project` literal change but doesn't explicitly call out the `goodplan init` in the error message. This is user-facing output.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Fixture directories use `.project` not `.project/` in glob
The plan says to rename `tests/fixtures/*/.project/` to `tests/fixtures/*/.goodplan/` using `git mv`. The fixture directories exist (confirmed: `fresh-init/.project`, `epic-created/.project`, etc.). The plan correctly identifies this task. Just noting that `git mv` on directories works fine but the implementer should verify each fixture individually since some may have nested structures.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `package.json` `name` field is still `"goodplan"`
The plan scope says to keep `project.json`, `__GOODPLAN_VERSION__`, and `GOODPLAN_DIR` as-is. But `package.json`'s `"name": "goodplan"` field is not explicitly addressed. This is the npm package name, not the binary name. The plan's overview says this is a clean break rename, so the `name` field arguably should change to `"gp"` too — or the plan should explicitly state it stays as `"goodplan"` and why (e.g., npm package identity vs binary name).
Resolution: USER_INPUT

**[MINOR]** Temp directory prefix strings in helpers.ts still say `goodplan-integration`
Lines 122 and 149 use `goodplan-integration-` as temp directory prefixes. These are internal test infrastructure and won't cause failures, but for completeness of the rename they could be updated to `gp-integration-`. Low priority.
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10
The plan is well-structured and identifies the major rename targets correctly. The critical gap is `tests/global-setup.ts` which is explicitly marked "no change needed" but absolutely must change — without it, every integration and fitness test will fail. The second critical issue is that `withTempDir` in helpers.ts has a second `.project` path join that could be missed. Several user-facing error messages containing the old names need explicit callouts rather than relying on bulk sweeps. To reach 9+: fix the global-setup.ts oversight, explicitly enumerate all user-facing strings that contain `goodplan` or `.project/` in error messages, and clarify the `package.json` name field decision.

## Summary
- Critical: 2
- Important: 3
- Minor: 3
