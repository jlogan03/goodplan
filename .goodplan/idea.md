# goodplan

## Description

goodplan is a Claude Code plugin that keeps long-running software projects on track across sessions, branches, and features. It persists project state — architecture, decisions, conventions, learnings, epics, slices, and side-quests — into a `.goodplan/` directory in the repo, and proactively delivers the right context to Claude at each phase of a structured development workflow (explore → architect → plan → implement → review → complete). It ships as a marketplace plugin (skills + agents + hooks) backed by a compiled TypeScript CLI (`gp`) that owns all state mutations through validated schemas, atomic writes, and a state machine.

This repository is unusual: it both **builds** the goodplan workflow system (CLI source in `src/`, plugin in `plugin/`) and **dogfoods** it (uses the installed `gp` CLI and installed plugin to manage its own `.goodplan/`). This produces a "three worlds" model that contributors must keep distinct:

1. **Repo source** (`src/`, `plugin/`) — what is being developed; never installed/active until built.
2. **Installed plugin & `gp` CLI** — what `/gp:*` slash commands and this repo's `.goodplan/` actually use; managed by the marketplace, never edited in place.
3. **This repo's `.goodplan/`** — managed by the installed tools (#2), must remain compatible with them.

## Goals

- Eliminate context loss between Claude Code sessions on multi-week projects.
- Keep architecture, conventions, decisions, and learnings as first-class, git-tracked artifacts.
- Enforce structured workflow phases via a deterministic state machine so steps cannot be skipped.
- Front-load risk: end-to-end first slices, automated multi-reviewer plan refinement, phased TDD implementation with review gates.
- Provide a reliable plugin distribution that any Claude Code user can install and use immediately.
- Dogfood the system on its own development to surface friction quickly.

## Tech Stack

- **Language:** TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), ESNext modules
- **Runtime:** Bun (bun-types, `bun.lock`); compiled CLI distributed as `gp` binary
- **CLI framework:** citty
- **Validation:** Zod v4
- **Formatter/linter:** Biome (tabs, width 100)
- **Testing:** Vitest (unit, integration, fitness suites under `tests/`)
- **Plugin surface:** Claude Code plugin (skills + agents + bash hooks) under `plugin/`
- **Test harness:** `@anthropic-ai/claude-agent-sdk` driving isolated end-to-end runs from `tools/dogfood/`
- **Hooks:** pure bash (no python3 dependency) — `protect-state.sh`, `warn-bash-state.sh`
- **Build:** `bash scripts/build-plugin.sh` (explicit, user-initiated)

## Constraints

- TypeScript strictness flags above are non-negotiable; no `as any` / `@ts-ignore`.
- All `.goodplan/` mutations MUST go through the installed `gp` CLI — never direct file writes. HMAC + protect-state hook enforce this.
- Skills/agents source of truth lives in `plugin/`; never edit `~/.claude/plugins/cache/...`.
- Test harnesses must be fully isolated (filtered `PATH`, `settingSources: []`, local plugin path) — never touch user's installed plugin cache.
- E2E validation runs must use Opus, not Sonnet.
- Hooks must remain pure bash (no python3 / node runtime dependency).
- Plugin must stay backwards compatible with `.goodplan/` directories produced by prior installed versions.
