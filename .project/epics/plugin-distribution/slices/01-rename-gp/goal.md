# Rename to gp

## What We're Building
Rename the CLI binary from `goodplan` to `gp`, the state directory from `.project/` to `.goodplan/`, and the root state file from `project.json` to `goodplan.json`. Update all references across the codebase: source code, skills, shared references, architecture docs, CLAUDE.md, and tests. This is a clean break — no backward compatibility shim.

## Behavior
1. `bun run build` produces a binary named `gp` instead of `goodplan`
2. `gp init` creates `.goodplan/` instead of `.project/`
3. All CLI commands read/write `.goodplan/goodplan.json` instead of `.project/project.json`
4. All skill bodies reference `gp` instead of `goodplan` for CLI invocations
5. All shared references (`cli-interaction.md`, etc.) use `gp` in examples and conventions
6. Architecture docs reference `.goodplan/` paths
7. `__GOODPLAN_VERSION__` renamed to `__GP_VERSION__` in build define and source
8. `install:skills` script updated to build binary as `gp`
9. Existing tests updated to use `.goodplan/` and `goodplan.json`
10. CLAUDE.md updated with new paths and binary name

## Verification
- [ ] `bun run build` completes — output binary is named `gp`
- [ ] `./gp --version --json` — returns `{"version":"<expected>"}`
- [ ] `./gp init --name test-project --json` in a temp directory — creates `.goodplan/goodplan.json`, not `.project/project.json`
- [ ] `./gp status --json` in the initialized directory — returns valid status response
- [ ] `./gp epic:create` with stdin — creates epic under `.goodplan/epics/`
- [ ] `bun run test` — all tests pass with renamed paths
- [ ] `grep -r "goodplan" skills/ --include="*.md" -l` — returns zero results for CLI invocation references (prose "goodplan" product name references are OK)
- [ ] `grep -r '\.project/' src/ --include="*.ts" -l` — returns zero results

Run the full test suite after the rename. Create a temp directory, run `./gp init`, then `./gp epic:create`, `./gp status`, `./gp epic:show` to verify the full lifecycle works with new paths. Confirm that `.goodplan/` is the only state directory created — no `.project/` remnants.

## Scope Boundaries
**In scope:** Binary name, state directory name, state file name, version define, all source code references, all skill references, all shared reference docs, all architecture docs, CLAUDE.md, test fixtures, `install:skills` script
**Out of scope:** Plugin structure (slice 2), HMAC signatures (slice 3), hooks (slice 4), CI/CD (slice 7). The `.project/` directory in this repo managed by the installed CLI stays as-is — we are not migrating this repo's state as part of this slice.
