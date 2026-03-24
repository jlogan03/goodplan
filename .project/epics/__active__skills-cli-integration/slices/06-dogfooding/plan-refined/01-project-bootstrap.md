# Phase 1: Project Bootstrap & First Epic Creation

Set up the nondet-eval repo, install CLI-integrated skills locally, initialize via goodplan CLI, and create the first epic — exercising empty-state entity creation.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls ~/Repos/nondet-eval` — directory does not exist (expected non-zero exit)
- [ ] `ls ~/Repos/nondet-eval/.claude/skills/` — does not exist (expected non-zero exit)

**After implementation** (should pass / show presence):
- [ ] `goodplan status --json` — returns valid JSON with `project.name === "nondet-eval"` and `activeEpic === null` (epic is created but not yet activated)
- [ ] `ls ~/Repos/nondet-eval/.claude/skills/` — contains all 14 skill directories (including the `migrate/` stub) plus `_shared/`
- [ ] `goodplan epic:show --epic core-provider --json` — returns epic details with correct name and `status === "created"`
- [ ] `bun tsc --noEmit` — passes with strict TypeScript configuration

### Tasks

- [ ] **Create repo**: `mkdir ~/Repos/nondet-eval && cd ~/Repos/nondet-eval && git init`
- [ ] **Initialize TypeScript project**: `bun init` or equivalent, set up `package.json` with TypeScript and `"type": "module"` (required for `verbatimModuleSyntax`)
- [ ] **Configure strict TypeScript**: Set up `tsconfig.json` with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, and standard strict settings. Verify with `bun tsc --noEmit`.
- [ ] **Write `.project/idea.md`**: Define the nondeterministic eval library idea — project name, goal ("TypeScript eval framework on Promptfoo for measuring skill quality via Monte Carlo execution"), scope, and constraints. Content will be written during execution.
- [ ] **Build goodplan binary**: In the goodplan repo, `bun run build`. Symlink to PATH: `ln -sf ~/Repos/goodplan/dist/goodplan /usr/local/bin/goodplan`
- [ ] **Initialize goodplan**: `goodplan init --name nondet-eval --json`
- [ ] **Install skills (user-level first)**: In the goodplan repo, run `bun run install:skills` to install current skills at `~/.claude/skills/`. This is mandatory because all skills hardcode absolute paths to `~/.claude/skills/_shared/references/` — the in-project copy is never read. Any reference edits during dogfooding must target the user-level copy. Log as architectural friction: skills should use relative or configurable paths. Rollback: if user-level skill bugs are discovered, fix in `skills/` and re-run `bun run install:skills`. Git history serves as rollback.
- [ ] **Install skills (in-project)**: `cp -r ~/Repos/goodplan/skills/* ~/Repos/nondet-eval/.claude/skills/` — note the `/*` to avoid nested `skills/skills/`. Note: `migrate/` is a stub skill and may confuse during dogfooding — ignore if encountered. Verify: `ls ~/Repos/nondet-eval/.claude/skills/complete/SKILL.md` exists (not `.claude/skills/skills/complete/SKILL.md`)
- [ ] **Verify skill reference paths**: Confirm `~/.claude/skills/_shared/references/cli-interaction.md` exists and is current (skills hardcode this absolute path). Log as friction if in-project install causes reference path issues.
- [ ] **Install dependencies**: `bun add promptfoo @anthropic-ai/sdk` — install known dependencies early so `bun tsc --noEmit` won't fail on unresolved modules during Phase 2
- [ ] **Set up CLAUDE.md**: Create initial CLAUDE.md pointing to `.project/idea.md` and conventions
- [ ] **Create first epic**: Run `/create-epic` skill in the nondet-eval repo — explicitly name it "core-provider" (or similar) for "Core Provider & Basic Execution". This creates `epics/core-provider/` with `goal.md`. Verify via `goodplan epic:show --epic core-provider --json`.
- [ ] **Verify CLI state**: `goodplan status --json` shows `activeEpic === null` (epic created but not yet activated) and `goodplan epic:show --epic core-provider --json` shows `status === "created"`
- [ ] **Log friction**: Record any issues in friction-log.md

### Verification

1. `goodplan status --json` returns valid JSON with `activeEpic === null` and epic visible via `epic:show`
2. Skills directory contains all 14 skill directories (including `migrate/` stub) plus `_shared/`
3. `bun tsc --noEmit` passes
4. Git has initial commit with project structure
