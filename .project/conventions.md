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
│   ├── epic/               # epic:create, epic:list, epic:show, epic:explore, epic:define-architecture,
│   │                       # epic:refine-architecture, epic:define-slices, epic:refine-slices,
│   │                       # epic:activate, epic:complete, epic:abandon, epic:add-verification,
│   │                       # epic:update-verification
│   ├── subagent/           # start-plan, start-refinement, start-implementation, start-explore,
│   │                       # start-architecture, start-slices, start-refine-architecture,
│   │                       # start-refine-slices, submit-plan, submit-refinement,
│   │                       # submit-implementation, submit-explore, submit-architecture,
│   │                       # submit-slices, submit-refine-architecture, submit-refine-slices
│   │                       # (organizational dir; registered as flat top-level commands)
│   ├── slice/              # slice:create, slice:list, slice:show, slice:plan, slice:refine-plan,
│   │                       # slice:implement, slice:complete, slice:abandon
│   ├── quest/              # quest:create, quest:list, quest:show, quest:plan, quest:refine-plan,
│   │                       # quest:implement, quest:complete, quest:abandon
│   ├── decision/
│   ├── learning/
│   ├── activity/
│   └── global/
├── core/
│   ├── state/
│   │   └── transitions/    # per-event transition handlers (epic-create, epic-phase, epic-refine,
│   │                       # epic-lifecycle, epic-verify, slice-create, slice-plan, slice-submit,
│   │                       # slice-implement, slice-complete, slice-abandon, quest-create,
│   │                       # quest-plan, quest-implement, quest-complete, quest-abandon)
│   ├── data/               # assemble/commit/load state tree, tree types, schema registry
│   ├── rpc/                # workflow orchestration: init, begin, complete, submit, status, types
│   ├── context/            # context bundling: startContext, priorities, budget, collect, decisions, learnings
│   └── workflow/
├── schemas/
│   ├── commands/           # Zod schemas for CLI input validation (epic.ts, slice.ts, quest.ts, submit.ts)
│   ├── entities/           # Zod schemas for JSON entities (project, epic, slice, quest, overview)
│   └── records/            # Zod schemas for JSONL records (activity-log, decision, learning, architecture-delta)
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
- **Environment variables:** `GOODPLAN_DIR` overrides default `.project/` location (useful for testing). `GOODPLAN_DEBUG=1` enables debug logging to stderr (dev/test only — use `--verbose` for production diagnostics).
- **stdin for content:** mutations accept content via stdin (piped heredocs). Read-only commands use flags only.
- **Skill development:** All goodplan workflow skills live in `skills/` as the source of truth. Installed to `~/.claude/skills/` via `bun run install:skills` (runs scripts/install-skills.sh). Never edit installed skills directly. Commit skill changes explaining why and what changed (per global CLAUDE.md).
- **Skill migration:** Existing skills are copied into `skills/` at their current names and transformed in place as consolidation progresses. Git tracks the full evolution. The install script maps old and new skill names to the correct install locations throughout the transition.
