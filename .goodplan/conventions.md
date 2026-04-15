# Conventions

## Tech Stack

- **Language:** TypeScript 5.8, ESNext modules, `type: "module"`
- **Runtime:** Bun (`bun-types`, `bun.lock` is the lockfile)
- **Package manager:** Bun (`bun install`, `bun run <script>`)
- **CLI framework:** citty
- **Validation:** Zod v4 (note: see project memory re. `optional()` + `exactOptionalPropertyTypes` workarounds)
- **Test framework:** Vitest 4
- **Lint/format:** Biome 1.9
- **Plugin runtime:** Claude Code plugin system (skills, agents, bash hooks)
- **Agent SDK:** `@anthropic-ai/claude-agent-sdk` for end-to-end harnesses

## Repo Structure

```
src/                       CLI source (compiled to dist/)
  commands/                citty command modules, one dir per entity
    decision/ epic/ global/ learning/ quest/ slice/ subagent/ task/
    main.ts                CLI entrypoint
  core/
    artifacts.ts  tree.ts
    context/               context bundling for skills
    data/                  data layer (filesystem-backed records)
    rpc/                   skill <-> CLI RPC (subagent commands)
    state/                 state machine
  schemas/                 Zod schemas
    commands/ entities/ records/  state-events.ts  error-output.ts
  util/                    shared helpers
  types/                   shared TS types
  index.ts  version.ts

plugin/                    Source of truth for the installed plugin
  skills/<name>/SKILL.md   12 namespaced /gp:* skills
  agents/                  phase agents + reviewer agents + _references
  hooks/                   pure-bash hooks (protect-state, warn-bash-state)
  bin/                     gp launcher

tests/
  unit/                    fast unit tests
  integration/             multi-module CLI tests
  fitness/                 architectural fitness functions
  fixtures/                fixture repos
  global-setup.ts

tools/dogfood/             Agent SDK end-to-end harnesses (test-*.ts, validate*.ts)
scripts/                   build-plugin.sh, generate-onboard-fixture.sh
docs/                      Vision, work items, design docs, primer
.goodplan/                 This repo's own dogfooded project state
```

## Dependency Management

- Lockfile: `bun.lock` (committed). No `package-lock.json` / `yarn.lock`.
- Install: `bun install`. Scripts: `bun run check`, `bun run test`, `bun run build`.
- No monorepo / workspaces.

## Code Style

- **Formatter:** Biome — tabs (width 2), line width 100, organize imports on.
- **Linter rules:** Biome recommended + `noUnusedImports`, `noUnusedVariables`, `noNonNullAssertion` all `error`.
- **TypeScript strictness:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `forceConsistentCasingInFileNames`. No `as any`, no `@ts-ignore`.
- **File naming:** kebab-case `.ts` files (`global-args.ts`, `state-events.ts`).
- **Module layout:** flat per-entity directories under `src/commands/<entity>/`; no barrel files.
- **Imports:** explicit `import type` for type-only (verbatimModuleSyntax requires it).
- **Subsystem boundaries:** strictly typed public APIs; hide internals; expose only what's needed.

## Testing

- **Framework:** Vitest 4 (`bun run test` → `vitest`).
- **Location:** `tests/{unit,integration,fitness}/` — separate from `src/`, NOT co-located.
- **Naming:** `*.test.ts`.
- **Fixtures:** `tests/fixtures/` (sample `.goodplan/` repos used by integration tests).
- **Fitness tests:** `tests/fitness/` enforce architectural invariants (subsystem boundaries, schemas).
- **End-to-end:** `tools/dogfood/test-*.ts` and `validate*.ts` use the Agent SDK to drive real Claude Code sessions against isolated fixture repos. Always use `opus` model for E2E validation. Never ask the user to run manual sessions.
- **Verification rule:** every code change must be verified before completion (lint/build/test or live run).

## CLI / `.goodplan/` State Conventions

- All `.goodplan/` mutations go through the installed `gp` CLI. **Never write directly into `.goodplan/`** — HMAC + `protect-state.sh` hook will reject it.
- Use `gp status --json --query '...'` to discover state; CLI is the only blessed reader for structured data too.
- Commands are entity-namespaced: `gp epic:create`, `gp slice:start`, `gp quest:complete`, `gp learning:list`, `gp decision:list`, etc.
- Skills (in `plugin/skills/`) call the CLI via subagent RPC (`src/core/rpc/`) — never bypass it.

## Three-Worlds Discipline (repo-specific)

This repo simultaneously **builds** the goodplan workflow and **uses** an installed copy of it to manage its own `.goodplan/`. Always keep these distinct:

| World | Location | How to interact |
|---|---|---|
| Repo source | `src/`, `plugin/` | Edit directly. Source of truth. |
| Installed plugin + `gp` on PATH | marketplace-managed | Use via `/gp:*` and `gp` CLI. Never edit. |
| This repo's `.goodplan/` | `.goodplan/` here | Mutate only via installed `gp` CLI. |

Test CLI changes against fixture repos in `/tmp`, never against this repo's `.goodplan/`. Test plugin/skill changes via `tools/dogfood/` harnesses with `createTestEnv()` isolation.

## Git / PR Conventions

- Commit format: short imperative subject line, optional version bump in parentheses. Examples from recent history: `Rewrite hooks in pure bash, drop python3 dependency (1.0.6)`, `Fix warn-bash-state.sh shell quoting bug, bump to 1.0.5`, `Bump version to 1.0.4`.
- Single primary contributor (Ian White).
- Branch: work primarily on `main`.
- Releases bump `package.json` version inline with the relevant fix/feature commit.

## CI

No `.github/workflows/` files detected (only `.github/` exists without workflows). CI is effectively local: `bun run check`, `bun run test`, dogfood harnesses, and `bun run build` before publishing the plugin.

## Other Conventions

- **Hooks must be pure bash** — no python3, no node runtime dependency.
- **macOS realpath caveat:** does not handle nonexistent paths; hook scripts must guard for this.
- **Never bypass HMAC** — hooks and HMAC are integrity safeguards; CLI commands only, even if a skill says otherwise.
- **Settings.json protection** — sub-agents must never modify `~/.claude/settings.json`; restore if changed.
- **Build is explicit** — `bun run build` is user-initiated; never auto-build during development.
