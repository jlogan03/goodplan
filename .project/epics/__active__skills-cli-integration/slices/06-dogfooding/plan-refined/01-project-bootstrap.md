# Phase 1: Project Bootstrap & First Epic Creation

Set up the nondet-eval repo, install CLI-integrated skills locally, initialize via goodplan CLI, and create the first epic — exercising empty-state entity creation.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `ls ~/Repos/nondet-eval` — directory does not exist (expected non-zero exit)
- [x] `ls ~/Repos/nondet-eval/.claude/skills/` — does not exist (expected non-zero exit)

**After implementation** (should pass / show presence):
- [x] `goodplan status --json` — returns valid JSON with `project.name === "nondet-eval"` and `activeEpic === null` (epic is created but not yet activated)
- [x] `ls ~/Repos/nondet-eval/.claude/skills/` — contains all 14 skill directories (including the `migrate/` stub) plus `_shared/`
- [x] `goodplan epic:show --epic core-provider --json` — returns epic details with correct name and `status === "created"`
- [x] `bun tsc --noEmit` — passes with strict TypeScript configuration

### Tasks

- [x] **Create repo**: `mkdir ~/Repos/nondet-eval && cd ~/Repos/nondet-eval && git init`
- [x] **Initialize TypeScript project**: `bun init` or equivalent, set up `package.json` with TypeScript and `"type": "module"` (required for `verbatimModuleSyntax`)
- [x] **Configure strict TypeScript**: Set up `tsconfig.json` with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, and standard strict settings. Verify with `bun tsc --noEmit`.
- [x] **Write `.project/idea.md`**: Define the nondeterministic eval library idea — project name, goal ("TypeScript eval framework on Promptfoo for measuring skill quality via Monte Carlo execution"), scope, and constraints. Content will be written during execution.
- [x] **Build goodplan binary**: In the goodplan repo, `bun run build`. Symlinked to `~/bin/goodplan` (friction: `/usr/local/bin` requires sudo).
- [x] **Initialize goodplan**: `goodplan init --name nondet-eval --json` (friction: fails if `.project/` dir exists without `project.json` — must write idea.md AFTER init)
- [x] **Install skills (in-project only)**: `cp -r ~/Repos/goodplan/skills/* ~/Repos/nondet-eval/.claude/skills/` — skills now use relative paths (friction #3 fixed hardcoded absolute paths). User-level skills NOT overwritten to preserve old-format skills for other projects.
- [x] **Verify skill reference paths**: Skills now use relative paths (`../_shared/references/`). In-project `_shared/references/` is the active copy.
- [x] **Install dependencies**: `bun add promptfoo @anthropic-ai/sdk` — install known dependencies early so `bun tsc --noEmit` won't fail on unresolved modules during Phase 2
- [x] **Set up CLAUDE.md**: Create initial CLAUDE.md pointing to `.project/idea.md` and conventions
- [x] **Create first epic**: Created via `goodplan epic:create` CLI directly (not `/create-epic` skill) — named "core-provider". Wrote `goal.md` manually. Verify via `goodplan epic:show --epic core-provider --json`.
- [x] **Verify CLI state**: `goodplan status --json` shows `activeEpic === null` (epic created but not yet activated) and `goodplan epic:show --epic core-provider --json` shows `status === "created"`
- [x] **Log friction**: 5 friction items recorded in friction-log.md

### Verification

1. [x] `goodplan status --json` returns valid JSON with `activeEpic === null` and epic visible via `epic:show`
2. [x] Skills directory contains 14 skill directories (including `migrate/` stub) plus `_shared/` (15 total)
3. [x] `bun tsc --noEmit` passes
4. [x] Git has initial commit with project structure
