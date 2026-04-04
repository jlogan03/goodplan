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
skills/                   # source of truth for goodplan workflow skills (12 skills)
├── _shared/
│   └── references/       # shared review criteria, preamble, conventions
├── audit/                # /gp:audit — dispatches to architecture/docs/tests agents
├── complete-epic/        # /gp:complete-epic — epic completion with learnings rollup
├── create-epic/          # /gp:create-epic — 6-phase pipeline orchestrator
├── create-side-quest/    # /gp:create-side-quest — 4-phase pipeline for quests
├── explore/              # /gp:explore — iterative research/brainstorm/prototype
├── implement/            # /gp:implement — implement plan with review loops
├── init/                 # /gp:init — initialize project (onboard or new)
├── plan-slice/           # /gp:plan-slice — plan creation + refinement pipeline
├── start-epic/           # /gp:start-epic — approve and activate epic
├── status/               # /gp:status — project state query
├── task/                 # /gp:task — quick capture of bugs/ideas
└── upgrade/              # /gp:upgrade — migrate project state format
agents/                   # agent definitions spawned by skills (34 total)
├── explore-phase.md, plan-phase.md, ...  # pipeline phase agents
├── reviewer-*.md         # 20 domain specialist reviewers
└── audit-*-phase.md      # audit mode agents
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
│   ├── quest/              # quest:create, quest:list, quest:show, quest:explore, quest:plan,
│   │                       # quest:refine-plan, quest:implement, quest:complete, quest:abandon
│   ├── task/               # task:create, task:list, task:show, task:drop, task:convert
│   ├── decision/           # decision:create, decision:update, decision:list, decision:show
│   ├── learning/           # learning:rollup, learning:list
│   └── global/
├── core/
│   ├── state/
│   │   └── transitions/    # per-event transition handlers (epic-create, epic-phase, epic-refine,
│   │                       # epic-lifecycle, epic-verify, slice-create, slice-plan, slice-submit,
│   │                       # slice-implement, slice-complete, slice-abandon, quest-create,
│   │                       # quest-explore, quest-plan, quest-implement, quest-complete, quest-abandon,
│   │                       # task-create, task-lifecycle)
│   ├── data/               # assemble/commit/load state tree, tree types, schema registry
│   ├── rpc/                # workflow orchestration: init, begin, complete, submit, status, types
│   └── context/            # context bundling: startContext, priorities, budget, collect, decisions, learnings
├── schemas/
│   ├── commands/           # Zod schemas for CLI input validation (epic.ts, slice.ts, quest.ts, task.ts, submit.ts, decision.ts, status.ts)
│   ├── entities/           # Zod schemas for JSON entities (project, epic, slice, quest, task, overview)
│   └── records/            # Zod schemas for JSONL records (activity-log, decision, learning, architecture-delta)
├── util/                   # output, errors, validate, query (applyQuery jq helper)
└── index.ts
tests/
├── unit/
├── integration/
├── fitness/
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
- **Skill development:** All goodplan workflow skills live in `skills/` as the source of truth (12 skills). Distributed as a Claude Code plugin via `bun run build:plugin`. Never edit installed plugin files directly. Commit skill changes explaining why and what changed (per global CLAUDE.md).
- **Agent definitions:** Agent `.md` files in `agents/` are spawned by orchestrator skills. 20 reviewer agents + pipeline phase agents + audit mode agents (34 total).
