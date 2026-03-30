# Software Architecture Review — Rename to gp

## Issues

**[IMPORTANT] `withFixture` and `withTempDir` set `GOODPLAN_DIR` to `.project` unconditionally — mismatch after rename**

The plan correctly identifies that `helpers.ts` must change `GOODPLAN_DIR: path.join(tmpDir, ".project")` to `path.join(tmpDir, ".goodplan")` in both `withFixture` and `withTempDir`. However, the atomicity requirement ("must be in the same commit as fixture directory renames") is necessary but insufficient. The real concern is that `GOODPLAN_DIR` is an **override** — it bypasses the walk-up logic in `resolveProjectDir()`. After the rename, the walk-up logic looks for `.goodplan/`, but `GOODPLAN_DIR` skips walk-up entirely and just checks the path exists. This means if `GOODPLAN_DIR` points to `.goodplan` but the fixture directory is still `.project` (or vice versa), tests will fail with `DATA_NO_PROJECT` rather than an obvious "wrong directory name" error. The plan's atomicity constraint handles this, but the plan should note that `resolveProjectDir` itself does NOT validate that the dir name matches `PROJECT_DIR_NAME` — it trusts whatever path `GOODPLAN_DIR` provides. This is correct behavior (the env var is an explicit override), but it means a stale `GOODPLAN_DIR` in test helpers would silently use the wrong directory. The atomicity constraint is the correct mitigation; just confirming it's architecturally sound.

Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT] `migrate.ts` dual-path resolution introduces a new dependency direction concern**

The plan says `migrate.ts` should "check for `.goodplan/` first (re-migration), then `.project/` (legacy migration)." This is correct for the command layer. However, the plan routes this detection to the command layer (`src/commands/global/migrate.ts`) while the actual migration logic lives in the RPC layer (`src/core/rpc/migrate.ts`, line 1335: `if (!fs.existsSync(projectDir))`). The RPC layer's `rpcMigrate` receives `projectDir` as a parameter and checks its existence. The command layer currently hardcodes `const projectDir = path.join(cwd, ".project")` and passes it down.

The plan's approach — resolve in the command layer, pass the resolved path to `rpcMigrate` — is architecturally correct. The command layer is responsible for argument resolution, and the RPC layer operates on the resolved path. But the plan should be explicit that the RPC layer's error message at line 1339 (`"No .project/ directory found"`) also needs updating to be generic (e.g., "No project directory found") since it may now receive either `.project/` or `.goodplan/` paths. The plan currently says "update all `.project` path references including error message at ~line 1339" which covers this, but the message should be path-agnostic since the RPC layer doesn't know which path variant was resolved.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] `PROJECT_DIR_NAME` export creates a new public API surface on the Data Layer**

The plan exports `PROJECT_DIR_NAME` from `src/core/data/project.ts` so that `init.ts` and `migrate.ts` can import it. This is a reasonable deduplication, but it adds a new public export to the Data Layer that Commands depend on. Currently, Commands depend on the Data Layer only for `resolveProjectDir()` and `loadState()`/`assembleState()`. Adding `PROJECT_DIR_NAME` as a constant export is a minor surface expansion — it's a stable string constant, not behavior. Acceptable for a Developing-maturity subsystem, and the alternative (each command hardcoding the directory name) is worse.

No action needed — just noting the dependency surface expansion is intentional and appropriate.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Phase 2 `scripts/install-skills.sh` cleanup step removes old binary but doesn't handle PATH conflicts**

The plan adds `rm -f "$INSTALL_DIR/goodplan"` to remove the old binary. This is good. However, if the user has shell aliases, completions, or other tooling that references `goodplan`, those will silently break. This is acceptable for a "clean break, no backward compatibility" scope decision, but the install script should print a notice: "Removed old 'goodplan' binary. Update any shell aliases or completions to use 'gp'." This is a minor UX concern, not an architectural one.

Resolution: DIRECTLY_ACTIONABLE

**[MINOR] Unit test `project.test.ts` uses hardcoded `.project` strings that need updating**

The plan mentions "All test files with `.project/` path assertions" but doesn't explicitly call out `tests/unit/data/project.test.ts`. This file has at least 8 references to `.project` including the error message assertion (`"No .project/ directory found"`). It should be explicitly listed since it tests the core walk-up logic that is being modified — these tests directly validate the renamed behavior and are more architecturally significant than integration test path assertions.

Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10

The plan is architecturally sound. The two-phase structure (source code first, then skills/docs) is correct — it ensures the binary works before updating documentation. The dependency direction is preserved: Commands resolve paths, RPC operates on resolved paths, Data Layer owns the constant. The `PROJECT_DIR_NAME` export is the right deduplication approach. The `migrate.ts` dual-path resolution is correctly placed in the command layer. The fixture handling and atomicity constraints are appropriate. The scope decisions (keeping `GOODPLAN_DIR`, `__GOODPLAN_VERSION__`, etc.) are well-reasoned — they separate the product name from the binary name. Minor issues are all directly actionable polish items.

## Summary
- Critical: 0
- Important: 2
- Minor: 3
