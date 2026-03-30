# Codebase Context — audit-docs-and-tests Quest

## Existing Audit Pattern (audit-architecture)

**Path**: `skills/audit-architecture/SKILL.md` (298 lines) + `skills/audit-architecture/references/` (2 files)

### Structure to Follow

1. **Frontmatter**: `name`, `description` (with common trigger phrases), `requires: goodplan >= 1.0.0`
2. **Step 0 — Version Check**: Read `../_shared/references/cli-interaction.md`, verify CLI availability
3. **Step 1 — Load Context**: Resolve scope (epic vs project), load decisions, learnings, activity-log, expertise, resume detection, read skill-specific `references/guidance.md`
4. **Core analysis steps**: Spawn parallel sub-agents per file/area (model: `"opus"`), reconcile findings, present to user
5. **Step N — Propose Side Quests**: Write to `.project/side-quests/<name>/goal.md` with `type: gap` or `type: improvement`
6. **Step N+1 — Write Audit Report**: To `.project/audits/<type>-<date>.md`
7. **Step N+2 — Refresh Project Health**: Update `.project/project-health.md`
8. **Graceful Stop**: Partial report with `<!-- partial — interrupted` markers at each step boundary
9. **Expertise Check**: Final step, update user expertise if new info observed

### Reference Files Pattern

- `references/guidance.md` — exploration strategy, severity levels (CRITICAL/IMPORTANT/MINOR/INFO), side quest proposal templates
- `references/sub-agent-prompts.md` — self-contained prompt templates with `{placeholders}` for sub-agent spawning
- Both are audit-specific; shared conventions live in `skills/_shared/references/`

### Key Design Decisions

- **Does NOT use `iteration-loop.md`** — audit is explore-then-report, not iterative review-edit
- Side quests are filesystem artifacts: `mkdir -p ".project/side-quests/<name>"` + write `goal.md`
- Audit reports live in `.project/audits/`, NOT in `architecture/` (operational artifacts, not canonical design)
- Sub-agents are scoped to a single file/area each, return structured markdown findings
- User confirmation via `AskUserQuestion` before acting on findings

## Skills Directory Conventions

**Location**: `skills/` (repo) → installed to `~/.claude/skills/` via `scripts/install-skills.sh`

### Current skills (16 directories):
```
_shared/            audit-architecture/  capture/        complete/
create-architecture/ create-epic/        create-plan/    create-slices/
explore/            implement-plan/      migrate/        project-status/
refine-architecture/ refine-plan/        refine-slices/  start-epic/
```

**Neither `audit-docs/` nor `audit-tests/` exist yet.**

### Directory structure per skill:
- `SKILL.md` — the skill definition (frontmatter + markdown instructions)
- `references/` — skill-specific reference files (guidance, sub-agent prompts, etc.)

### Installation:
- `scripts/install-skills.sh` has a hardcoded `SKILL_DIRS` array — **new skills must be added to this array**
- Uses `rsync -a` to copy each skill dir to `~/.claude/skills/`
- Also builds and installs the CLI binary

### Shared references (`skills/_shared/references/`):
- `cli-interaction.md` — CLI conventions and error handling (28KB, largest)
- `codebase-context-discovery.md` — how to gather project context
- `decisions-format.md` — decision record format
- `dependency-research.md` — tech dependency research protocol
- `epic-conventions.md` — epic directory structure
- `expertise-tracking.md` — user expertise tracking protocol
- `iteration-loop.md` — shared review-edit loop skeleton
- `maturity-conventions.md` — maturity levels, promotion criteria
- `output-templates.md` — report output format
- `project-health-format.md` — project health file format
- `reviewers-cross-cutting.md` — cross-cutting reviewer definitions (31KB)
- `state-and-activity-formats.md` — state/activity-log format
- `team-defaults.md` — team configuration defaults

## Documentation Sources (for audit-docs)

### Architecture docs (`fresh` — last updated Mar 27)
- `.project/architecture/_overview.md` — system overview, maturity table
- `.project/architecture/commands-api.md` — CLI command surface
- `.project/architecture/conventions.md` — architectural patterns
- `.project/architecture/data-layer-api.md` — filesystem I/O API
- `.project/architecture/data-model.md` — entities, JSON/JSONL
- `.project/architecture/flows.md` — key workflows
- `.project/architecture/invariants.md` — system-wide constraints
- `.project/architecture/rpc-layer-api.md` — workflow orchestration
- `.project/architecture/state-machine-api.md` — pure reducer API
- `.project/architecture/transition-tables.md` — state transitions

### Project-level docs
- `.project/conventions.md` — tech stack, repo structure, coding style (fresh, Mar 27)
- `.project/idea.md` — project goal/scope/constraints
- `.project/learnings/` — 107 per-file `.md` learnings (fresh, Mar 27 — just migrated to per-file format)

### External docs
- `docs/primer.md` — project primer
- `docs/superpowers/specs/` — 2 design spec documents (Mar 18, Mar 20)

### Skill documentation
- 16 `SKILL.md` files under `skills/` with `references/` subdirs
- `skills/_shared/references/` — 16 shared reference files

## Test Infrastructure (for audit-tests)

### Framework
- **Vitest 4.x** — configured in `vitest.config.ts`
- 30-second test timeout
- Global setup: `tests/global-setup.ts`
- Build-time define: `__GOODPLAN_VERSION__` injected from `package.json`

### Test directory structure
```
tests/
├── fitness/          — 9 architectural fitness function tests
│   ├── atomic-writes.test.ts
│   ├── concurrent-modification.test.ts
│   ├── data-determinism.test.ts
│   ├── schema-output-accuracy.test.ts
│   ├── schema-validation.test.ts
│   ├── state-machine-purity.test.ts
│   ├── stateless-commands.test.ts
│   ├── transition-completeness.test.ts
│   └── tree-accuracy.test.ts
├── fixtures/         — test fixture data
├── integration/      — 15 integration test files
│   ├── error-circuit-breaker.test.ts
│   ├── error-transitions.test.ts
│   ├── migrate.test.ts (21KB, largest)
│   ├── migrate-learnings.test.ts (14KB)
│   ├── workflow-epic.test.ts
│   ├── workflow-init.test.ts
│   ├── workflow-quest.test.ts
│   ├── workflow-slice.test.ts
│   └── ... (smoke, state, result-paths, runner-modes, show-artifacts, version-compat)
├── unit/             — unit tests organized by subsystem
│   ├── commands/
│   ├── context/
│   ├── core/
│   ├── data/
│   ├── rpc/
│   ├── schemas/
│   ├── state/
│   └── util/
└── global-setup.ts
```

### Test file pattern
- `*.test.ts` suffix throughout
- Fitness tests verify architectural properties (import restrictions, schema validation, purity)
- Integration tests test CLI workflows end-to-end
- Unit tests mirror `src/` directory structure

## Side Quest Creation

Side quests use `quest:create` CLI command:
```bash
echo '{"name": "<name>", "goal": "<goal text>"}' | goodplan quest:create
```

The audit-architecture skill also writes side quest goal files to `.project/side-quests/<name>/goal.md` — but this appears to be a pre-CLI convention. The CLI-managed approach uses `quest:create`.

**Note**: The `.project/side-quests/` directory does not currently exist in this repo.

## Areas of Active Churn vs Stability

### Active churn (last 2 weeks)
- **`skills/`** — continuous updates (learnings-dir migration, maturity-context, skill-workflow-bugs)
- **`src/`** — learnings directory migration just landed (phases 1-4)
- **`tests/`** — tests updated alongside code changes
- **`.project/architecture/`** — refreshed Mar 27 (same day as code changes)
- **`.project/learnings/`** — just migrated from monolithic to per-file format (107 files)

### Relatively stable
- **`docs/`** — last updated Mar 20-26
- **`scripts/install-skills.sh`** — stable pattern, updated when new skills are added
- **`skills/_shared/references/`** — updated incrementally as conventions evolve

### Key recent trajectory
- Entity restructuring epic completed (nested paths, consolidated overview)
- Learnings migrated to per-file format under `.project/learnings/`
- Maturity context loading added to implementation skills
- Skills continuously refined based on dogfooding feedback
