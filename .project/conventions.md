# Project Conventions

## Tech Stack

- **Language:** TypeScript 6.0
- **Runtime/Compiler:** Bun 1.3.x (`bun build --compile` for platform-specific binaries)
- **CLI Framework:** citty 0.2.x (UnJS, pre-1.0 but actively maintained)
- **Validation:** Zod 4.x (v4 for perf gains; use `@zod/mini` if bundle size matters)
- **jq Queries:** @michaelhomer/jqjs 1.6.x (pure JS jq implementation, validated in prototype)
- **Terminal Color:** picocolors 1.1.x
- **Test Framework:** Vitest 4.x

## Repo Structure

```
scripts/
└── install-skills.sh     # copies skills/ → ~/.claude/skills/
skills/                   # source of truth for goodplan workflow skills
├── _shared/
│   └── references/
├── create-epic/
├── explore/
├── create-architecture/
├── refine-architecture/
├── create-slices/
├── refine-slices/
├── create-plan/
├── complete/
├── project-status/
├── audit-architecture/
├── refine-plan/
├── implement-plan/
└── migrate/
src/
├── commands/
│   ├── epic/
│   ├── build/
│   ├── resource/
│   └── global/
├── core/
│   ├── state/
│   ├── data/
│   ├── context/
│   └── workflow/
├── schemas/
├── util/
└── index.ts
tests/
├── unit/
├── integration/
└── fixtures/
```

## Dependency Management

- **Package manager:** Bun (bun install, bun.lockb)
- **Lockfile:** committed to repo
- **No monorepo tooling** — single package

## Code Style

- **Linter/Formatter:** Biome (single tool, fast, TypeScript-native)
- **Naming:** camelCase for variables/functions, PascalCase for types/classes, kebab-case for files and CLI commands
- **Imports:** explicit named imports, no barrel files, `verbatimModuleSyntax: true`
- **Strict TypeScript:** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` all enabled (per global CLAUDE.md)

## Testing

- **Framework:** Vitest 4.x
- **Unit tests:** for core/ logic (state machine, context bundling, schema validation)
- **Integration tests:** spawn compiled binary, send commands, assert JSON output
- **No mocks for filesystem** — use temp directories with real .project/ structures from fixtures
- **Coverage:** not enforced numerically, but all state transitions and validation paths must be tested

## Other Conventions

- **Error handling:** structured errors with error codes. CLI exits with non-zero status and JSON error object on failure. No empty catch blocks.
- **Logging:** stderr for diagnostics (only with `--verbose`), stdout for command output. Never mix.
- **JSON output:** deterministic key ordering (alphabetical) for git merge friendliness. JSONL files are append-only.
- **Environment variables:** `GOODPLAN_DIR` overrides default `.project/` location (useful for testing). No other env vars initially.
- **stdin for content:** mutations accept content via stdin (piped heredocs). Read-only commands use flags only.
- **Skill development:** All goodplan workflow skills live in `skills/` as the source of truth. Installed to `~/.claude/skills/` via `bun run install:skills` (runs scripts/install-skills.sh). Never edit installed skills directly. Commit skill changes explaining why and what changed (per global CLAUDE.md).
- **Skill migration:** Existing skills are copied into `skills/` at their current names and transformed in place as consolidation progresses. Git tracks the full evolution. The install script maps old and new skill names to the correct install locations throughout the transition.
