# Plan: Rename to gp

## Overview

Rename the CLI binary from `goodplan` to `gp` and the state directory from `.project/` to `.goodplan/`. Clean break — no backward compatibility shim.

The change touches three areas: source code (binary name, directory literals, path construction), skills/docs (CLI invocation references, path references), and build config (outfile, install script, gitignore). All tests must pass after each phase.

### Scope Decisions (intentionally kept as-is)

| Item | Decision | Rationale |
|---|---|---|
| `project.json` filename | **Keep** | Internal state filename, not user-facing. Not part of binary/directory rename scope. |
| `__GOODPLAN_VERSION__` define name | **Keep** | Product name is still "goodplan" internally. Only binary name and state directory change. |
| `GOODPLAN_DIR` env var | **Keep** | References the product name, not the directory name. Renaming would break existing integrations for no user benefit. |
| `GOODPLAN_DEBUG` env var | **Keep** | Same rationale as `GOODPLAN_DIR`. |
| `__goodplan_force` / `__goodplan_verbose` globalThis flags | **Keep** | Internal implementation detail, not user-facing. |
| `GoodplanError` class name / error code prefixes | **Keep** | Internal identifier. Product name is still "goodplan". |
| `package.json` `"name"` field | **Keep as `"goodplan"`** | Package name is the product name; binary name is controlled by `--outfile` and `bin` field. |
| `.project/architecture/*.md` references | **Leave as-is** | Managed by the installed CLI, not the repo source code. Will migrate when installed CLI updates. |

## Phase 1: Source Code Rename

Rename the binary and `.project/` directory references in all source code and tests.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run build && ./gp --version` — fails with `zsh: no such file or directory: ./gp` (binary is named `goodplan`)
- [ ] `bun run build && ./goodplan init --name test --json` in a fresh temp dir — creates `.project/`, not `.goodplan/` (prerequisite: temp dir has no existing `.project/` or `.goodplan/`)

**After implementation** (should pass / show presence):
- [ ] `bun run build && ./gp --version` — succeeds, prints `gp <version>` (not `goodplan <version>`)
- [ ] `./gp init --name test --json` in a temp dir — creates `.goodplan/project.json`, not `.project/project.json`
- [ ] `./gp status --json` in the initialized dir — returns valid status
- [ ] `bun run test` — all tests pass

### Tasks

- [x] `src/commands/main.ts` — change citty `name:` from `"goodplan"` to `"gp"`
- [x] `src/index.ts` — change version output from `goodplan ${VERSION}` to `gp ${VERSION}`; change version compatibility error `"Project data requires goodplan >= ..."` to `"Project data requires gp >= ..."`
- [x] `src/core/data/project.ts` — change `".project"` literal in walk-up logic to `".goodplan"`; **export** `PROJECT_DIR_NAME` constant so `init.ts` and `migrate.ts` can import it instead of hardcoding; change error message from `"No .project/ directory found. Run \`goodplan init\`"` to `"No .goodplan/ directory found. Run \`gp init\`"`
- [x] `src/commands/global/init.ts` — import `PROJECT_DIR_NAME` from `project.ts` instead of hardcoding `".project"`/`".goodplan"`; update error message at ~line 41 (`".project/ exists"` → `".goodplan/ exists"`). **Note:** the description "Initialize a new goodplan project" (~line 18) stays as-is — "goodplan" here is the product name, not the CLI binary name. **Ordering constraint:** this task depends on the `project.ts` task adding `export` to `PROJECT_DIR_NAME` (currently module-scoped `const`). Apply `project.ts` changes first or in the same commit.
- [x] `src/commands/global/migrate.ts` — import `PROJECT_DIR_NAME` from `project.ts` instead of hardcoding; replace the hardcoded `const projectDir = path.join(cwd, ".project")` (~line 44) with dual-path resolution: check for `.goodplan/` first (re-migration), then `.project/` (legacy migration), error if neither exists. Import `PROJECT_DIR_NAME` for the primary `.goodplan/` check, hardcode `".project"` as a legacy fallback constant. Detection belongs in the command layer (consistent with `init.ts` pattern). Update `.project-old-*` references and error messages. Update `meta.description` (~line 34) and `schema.ts` registry entry (~line 127) to mention **both** `.project/` and `.goodplan/` directories, since migrate accepts both. The schema registry description is stale and should be updated to reflect re-migration support.
- [x] `src/core/data/commit.ts` — change `[goodplan]` stderr prefix (~line 261) to `[gp]`
- [x] `src/core/rpc/migrate.ts` — update all `.project` path references; change error message at ~line 1339 to `"No project directory found"` (generic — the RPC layer receives a resolved path and doesn't know whether `.goodplan/` or `.project/` was passed; the command layer handles path resolution); change `[goodplan]` stderr prefixes (~lines 979, 989, 999) to `[gp]`; update `.project-old-*` JSDoc references. **Note:** `renameProjectDir` computes backup path from `projectDir` argument — only comments/JSDoc need updating, not the backup path logic itself.
- [x] `src/util/debug.ts` — change `[goodplan]` stderr prefix to `[gp]`
- [x] `src/commands/global/schema.ts` — update `.project/` references in command descriptions (~lines 121-141) to `.goodplan/`, **except** the `migrate` command entry at ~line 127, which should mention both `.project/` and `.goodplan/` per the `migrate.ts` task
- [x] All remaining `src/` files with `.project/` in string literals, error messages, JSDoc, and comments — update to `.goodplan/`; also update any `goodplan` CLI invocation references in user-facing strings to `gp` (~64 files per grep audit, upper bound — actual count will be lower after applying JSDoc policy). **Exclusion:** do NOT rename `.project/` references in `src/commands/global/migrate/schemas.ts` `.describe()` strings or `src/core/rpc/migrate.ts` hint strings (~lines 1026, 1034, 1042) — these describe the legacy input format and are semantically correct as `.project/`. **JSDoc policy:** backtick-quoted CLI invocations like `` `goodplan slice:create` `` become `` `gp slice:create` `` (binary name change). Prose product name references like "goodplan workflow" or "goodplan-managed" stay as-is. **Verification:** after completing the bulk rename, run `grep -rn '\.project' src/` and manually inspect remaining references to confirm only intentional legacy references survive.
- [x] `package.json` — change build script `--outfile goodplan` to `--outfile gp`
- [x] `tests/global-setup.ts` — change `const outfile = path.join(projectRoot, "goodplan")` to `path.join(projectRoot, "gp")`; update any log messages referencing the binary name (`__GOODPLAN_VERSION__` define stays as-is)
- [x] `tests/integration/helpers.ts` — change `BINARY_PATH` from `"goodplan"` to `"gp"`; change `GOODPLAN_DIR: path.join(tmpDir, ".project")` to `path.join(tmpDir, ".goodplan")` in both `withFixture` and `withTempDir`; optionally update temp directory prefix strings from `goodplan-integration` to `gp-integration`. **Atomicity requirement:** `GOODPLAN_DIR` path updates must be in the same commit as fixture directory renames. **Trust model note:** `resolveProjectDir()` does NOT validate that the directory name matches `PROJECT_DIR_NAME` — it trusts whatever path `GOODPLAN_DIR` provides (env var is an explicit override). A stale `GOODPLAN_DIR` pointing to `.project` when fixtures have been renamed to `.goodplan` would produce `DATA_NO_PROJECT` rather than an obvious mismatch error; the atomicity constraint is the correct mitigation.
- [x] All test files with `.project/` path assertions — update to `.goodplan/` (approximately 35 files with ~98 occurrences based on grep); explicitly includes `tests/unit/data/project.test.ts` (at least 8 `.project` references including the error message assertion `"No .project/ directory found"` — directly tests the walk-up logic being modified) and `tests/integration/workflow-init.test.ts` (5 hardcoded `.project` assertions at ~lines 24-29, 59, 65; note the `withTempDir`/`init.ts` nuance: `withTempDir` sets `GOODPLAN_DIR` to `.project`, but `init.ts` checks `cwd` directly — after rename, subsequent commands in these tests going through `resolveProjectDir` would use `GOODPLAN_DIR` and look at `.project/`, which won't exist)
- [x] `tests/integration/state.test.ts` — update version output assertion from `/^goodplan /` to `/^gp /`
- [x] `tests/integration/runner-modes.test.ts` — update `expect(result.stdout).toContain("goodplan")` to use a word-boundary regex like `/\bgp\b/` (~line 44); `"gp"` as a plain substring would match words like "helping" — `state.test.ts` correctly uses `/^gp /` as a model
- [x] `tests/integration/migrate.test.ts` — update `withMigrateFixture` helper (hardcoded `.project` at ~lines 27, 238, 289, 305) to support both `.project/` (legacy input) and `.goodplan/` (re-migration input). Add test coverage for `.goodplan/` input if not already present. **Note:** `withMigrateFixture` should keep its `.project` paths — it copies the `pre-cli-project` fixture which uses `.project/` to represent legacy input. Only assertions about the **output** directory should use `.goodplan/`.
- [x] `tests/integration/migrate-learnings.test.ts` — has `.project` references at ~lines 30, 335, 341. Apply the same "support both" guidance as `migrate.test.ts`: legacy input references stay as `.project/`, output references become `.goodplan/`.
- [x] Rename fixture directories: `tests/fixtures/*/.project/` → `tests/fixtures/*/.goodplan/` (use `git mv`), **except** `tests/fixtures/pre-cli-project/.project/` which keeps `.project/` (it represents legacy migrate input). **Must be atomic with helpers.ts `GOODPLAN_DIR` path updates.**
- [x] `.gitignore` — add `gp` binary entry **alongside** `goodplan` (do not replace); if someone checks out an older branch or runs the old install script, a `goodplan` binary could reappear and become tracked
- [x] `biome.json` — **keep** `".project"` in `files.ignore` (installed CLI still writes to `.project/` for this repo) and **add** `".goodplan"` alongside it
- [x] `vitest.config.ts` — no change needed (`__GOODPLAN_VERSION__` define stays as-is)

### Verification
Run `bun run test` — all unit, integration, and fitness tests must pass. Then manually verify:
- `./gp --version` — prints `gp <version>`
- Create a temp directory, run `./gp init --name verify --json`, then `./gp epic:create`, `./gp status` to verify the full lifecycle with new paths. Confirm `.goodplan/` is created, not `.project/`.
- `./gp migrate` in a directory with a legacy `.project/` — verify migrate works from `.project/` input
- `./gp init --name remigrate-test --json` in a fresh temp dir, then `./gp migrate` — verify re-migration works from `.goodplan/` input
- `GOODPLAN_DIR=/tmp/test/.goodplan ./gp status --json` — verify env var override works with new path

## Phase 2: Skills and Documentation

Update all skill bodies, shared references, and documentation from `goodplan` → `gp` (CLI invocations) and `.project/` → `.goodplan/` (path references).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -rn 'goodplan ' skills/ --include="*.md" | head -20` — shows files with `goodplan` CLI invocation references
- [ ] `grep -rl '\.project/' skills/ --include="*.md"` — returns files with `.project/` path references

**After implementation** (should pass / show presence):
- [x] `grep -rn 'goodplan ' skills/ --include="*.md"` — manually inspect: only prose product name references should remain (e.g., "goodplan workflow", "goodplan-managed"), not CLI invocations like `goodplan status`
- [x] `grep -rl '\.project/' skills/ --include="*.md"` — returns no results (all paths use `.goodplan/`)
- [x] `bun run test` — all tests pass (Phase 2 modifies build-affecting files)
- [x] `bun run check` — lint passes (pre-existing 575 errors unrelated to Phase 2 changes)

### Tasks

- [x] `skills/_shared/references/cli-interaction.md` — highest leverage: update all `goodplan` CLI examples to `gp`, all `.project/` paths to `.goodplan/`. This propagates context to all skills.
- [x] `skills/_shared/references/epic-conventions.md` — update `.project/` paths to `.goodplan/`, CLI examples to `gp`
- [x] All remaining `skills/_shared/references/*.md` files — update `.project/` → `.goodplan/` (6 files per audit)
- [x] All `skills/*/SKILL.md` files — update `goodplan` CLI invocations to `gp`, `.project/` paths to `.goodplan/` (~40 files per audit). Keep prose "goodplan" product name references (e.g., "goodplan-managed project").
- [x] All `skills/*/references/*.md` files — update CLI and path references (~30 files per audit)
- [x] `CLAUDE.md` — update `.project/` paths to `.goodplan/` and CLI invocation examples to `gp`, **except** the "Three Separate Things" section (headings, prose, and the Rules table). That section describes the currently-installed CLI's behavior (`goodplan` binary at `~/.local/bin/goodplan`, writing to `.project/`) and should only be updated when the renamed CLI is actually installed via `bun run install:skills`. Update all other sections (Project Context file paths, Workflow Evolution references, etc.).
- [x] `.gitignore` — **keep** existing `.project/` path entries (e.g., `.project/state.md`, `.project/activity-log.jsonl`, etc.) because the installed CLI still writes to `.project/` for this repo. Add `.goodplan/` equivalents **alongside** (not replacing) the existing entries. Binary entry already moved to Phase 1.
- [x] `scripts/install-skills.sh` — change `--outfile goodplan` to `--outfile gp`, update copy target from `goodplan` to `gp`, update echo messages. Add cleanup step: `rm -f "$INSTALL_DIR/goodplan"` to remove the old binary from PATH, followed by a print statement: `"Removed old 'goodplan' binary. Update any shell aliases or completions to use 'gp'."` (consistent with clean-break scope decision).

### Verification
Run `grep -r "goodplan" skills/ --include="*.md" -l` and manually inspect results — only prose product name references should remain, not CLI invocations. Run `grep -r '\.project/' skills/ --include="*.md" -l` — should return no results. **Note:** scope this grep to `skills/` only, not `CLAUDE.md`; CLAUDE.md's "Three Separate Things" table intentionally uses `.project/` to describe the installed CLI's current state directory and those references are correct — including CLAUDE.md would produce a false failure. Run `bun run install:skills` to verify the install script works with the new binary name — confirm binary is installed at `~/.local/bin/gp` (not `goodplan`). Run `bun run test` and `bun run check` to verify no regressions from build-affecting file changes.
