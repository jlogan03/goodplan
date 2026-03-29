# Plan: Rename to gp

## Overview

Rename the CLI binary from `goodplan` to `gp` and the state directory from `.project/` to `.goodplan/`. Keep `project.json`, `__GOODPLAN_VERSION__`, and `GOODPLAN_DIR` as-is to minimize scope. The rename is a clean break — no backward compatibility shim.

The change touches three areas: source code (binary name, directory literals, path construction), skills/docs (CLI invocation references, path references), and build config (outfile, install script, gitignore). All tests must pass after each phase.

## Phase 1: Source Code Rename

Rename the binary and `.project/` directory references in all source code and tests.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run build && ./gp --version` — fails: no `gp` binary exists (binary is named `goodplan`)
- [ ] `./goodplan init --name test --json` in a temp dir — creates `.project/`, not `.goodplan/`

**After implementation** (should pass / show presence):
- [ ] `bun run build && ./gp --version` — succeeds, prints `gp <version>`
- [ ] `./gp init --name test --json` in a temp dir — creates `.goodplan/project.json`, not `.project/project.json`
- [ ] `./gp status --json` in the initialized dir — returns valid status
- [ ] `bun run test` — all tests pass

### Tasks

- [ ] `src/commands/main.ts` — change citty `name:` from `"goodplan"` to `"gp"`
- [ ] `src/index.ts` — change version output from `goodplan ${VERSION}` to `gp ${VERSION}`
- [ ] `src/core/data/project.ts` — change `".project"` literal in walk-up logic to `".goodplan"`
- [ ] `src/core/rpc/migrate.ts` — change `.project-old-<timestamp>` backup dir prefix to `.goodplan-old-<timestamp>`; update all `.project` path references
- [ ] `src/util/debug.ts` — change `[goodplan]` stderr prefix to `[gp]`
- [ ] All remaining `src/` files with `.project/` in string literals, error messages, JSDoc, and comments — update to `.goodplan/` (approximately 15 files per the audit)
- [ ] `package.json` — change build script `--outfile goodplan` to `--outfile gp`
- [ ] `tests/integration/helpers.ts` — change `BINARY_PATH` from `"goodplan"` to `"gp"`; change `path.join(tmpDir, ".project")` to `path.join(tmpDir, ".goodplan")`
- [ ] All test files with `.project/` path assertions — update to `.goodplan/` (approximately 14 files)
- [ ] `tests/integration/state.test.ts` — update version output assertion from `/^goodplan /` to `/^gp /`
- [ ] Rename fixture directories: `tests/fixtures/*/.project/` → `tests/fixtures/*/.goodplan/` (use `git mv`)
- [ ] `vitest.config.ts` — no change needed (`__GOODPLAN_VERSION__` stays)
- [ ] `tests/global-setup.ts` — no change needed (`__GOODPLAN_VERSION__` stays)

### Verification
Run `bun run test` — all unit, integration, and fitness tests must pass. Create a temp directory, run `./gp init --name verify --json`, then `./gp epic:create`, `./gp status` to verify the full lifecycle with new paths. Confirm `.goodplan/` is created, not `.project/`.

## Phase 2: Skills and Documentation

Update all skill bodies, shared references, and documentation from `goodplan` → `gp` (CLI invocations) and `.project/` → `.goodplan/` (path references).

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -rl 'goodplan ' skills/ --include="*.md" | grep -v 'goodplan workflow\|goodplan project\|goodplan-managed\|"goodplan"\|name.*goodplan\|goodplan-marketplace\|goodplan-cli\|goodplan-dev'` — returns files with `goodplan` CLI invocation references
- [ ] `grep -rl '\.project/' skills/ --include="*.md"` — returns files with `.project/` path references

**After implementation** (should pass / show presence):
- [ ] `grep -rl 'goodplan ' skills/ --include="*.md" | grep -v 'goodplan workflow\|goodplan project\|goodplan-managed\|"goodplan"\|name.*goodplan\|goodplan-marketplace\|goodplan-cli\|goodplan-dev'` — returns no results (all CLI invocations use `gp`)
- [ ] `grep -rl '\.project/' skills/ --include="*.md"` — returns no results (all paths use `.goodplan/`)
- [ ] `grep -rl '\.project/' .project/architecture/ --include="*.md"` — returns no results

### Tasks

- [ ] `skills/_shared/references/cli-interaction.md` — highest leverage: update all `goodplan` CLI examples to `gp`, all `.project/` paths to `.goodplan/`. This propagates context to all skills.
- [ ] `skills/_shared/references/epic-conventions.md` — update `.project/` paths to `.goodplan/`, CLI examples to `gp`
- [ ] All remaining `skills/_shared/references/*.md` files — update `.project/` → `.goodplan/` (6 files per audit)
- [ ] All `skills/*/SKILL.md` files — update `goodplan` CLI invocations to `gp`, `.project/` paths to `.goodplan/` (27 files per audit). Keep prose "goodplan" product name references (e.g., "goodplan-managed project").
- [ ] All `skills/*/references/*.md` files — update CLI and path references (14 files per audit)
- [ ] `.project/architecture/*.md` — update `.project/` → `.goodplan/`, `goodplan` CLI → `gp` in examples (7 files)
- [ ] `CLAUDE.md` — update all `.project/` paths to `.goodplan/`, CLI invocation examples to `gp`, section headings referencing `.project/`
- [ ] `.gitignore` — change `.project/` entries to `.goodplan/`, change `goodplan` binary entry to `gp`
- [ ] `biome.json` — change `".project"` ignore to `".goodplan"`
- [ ] `scripts/install-skills.sh` — change `--outfile goodplan` to `--outfile gp`, update copy target from `goodplan` to `gp`, update echo messages

### Verification
Run `grep -r "goodplan" skills/ --include="*.md" -l` and manually inspect results — only prose product name references should remain, not CLI invocations. Run `grep -r '\.project/' skills/ .project/architecture/ CLAUDE.md --include="*.md" -l` — should return no results. Run `bun run install:skills` to verify the install script works with the new binary name.
