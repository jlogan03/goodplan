# CLI Command Coverage Gap Analysis

Researched: 2026-03-23

Compares the goodplan CLI's command surface against the skill operations that interact with `.project/` state. Identifies which skill operations map to CLI commands, where gaps exist, and recommends how to close them.

## 1. CLI Command Surface Summary

### Global Commands

| Command | Reads | Writes | JSON | Activity Log |
|---|---|---|---|---|
| `init [--name]` | checks `.project/` existence | `project.json`, directory scaffold | yes | yes (via INIT_PROJECT) |
| `status [--json] [--query]` | full state tree (project.json, entities, overviews, activity-log.jsonl, file counts) | nothing | yes | no |
| `schema [--command]` | command metadata | nothing | yes | no |

### Entity Commands (Mutations via RPC + State Machine)

| Command | Event | Reads | Writes | JSON | Activity Log |
|---|---|---|---|---|---|
| `epic:create` | CREATE_EPIC | stdin {name, goal} | epic.json, overview.json, project.json | yes | yes |
| `epic:explore` | BEGIN_EXPLORE | epic state | epic.json status | yes | yes |
| `epic:define-architecture` | BEGIN_ARCHITECTURE | epic state | epic.json status | yes | yes |
| `epic:refine-architecture` | BEGIN_REFINE_ARCHITECTURE | epic state | epic.json status | yes | yes |
| `epic:define-slices` | BEGIN_SLICING | epic state | epic.json status | yes | yes |
| `epic:refine-slices` | BEGIN_REFINE_SLICES | epic state | epic.json status | yes | yes |
| `epic:activate` | ACTIVATE_EPIC | epic state | epic.json, project.json (activeEpic) | yes | yes |
| `epic:complete` | COMPLETE_EPIC | stdin {verificationResults} | epic.json, project.json | yes | yes |
| `epic:abandon` | ABANDON_EPIC | reason | epic.json, project.json | yes | yes |
| `epic:add-verification` | ADD_VERIFICATION | stdin | epic.json | yes | yes |
| `epic:update-verification` | UPDATE_VERIFICATION | stdin | epic.json | yes | yes |
| `slice:create` | CREATE_SLICE | stdin {name, goal, epic} | slice.json, overview.json, project.json | yes | yes |
| `slice:plan` | BEGIN_PLAN | slice state | slice.json status | yes | yes |
| `slice:refine-plan` | BEGIN_REFINEMENT | slice state | slice.json status | yes | yes |
| `slice:implement` | BEGIN_IMPLEMENTATION | slice state | slice.json status | yes | yes |
| `slice:complete` | COMPLETE_SLICE | stdin {verificationPassed, deferred, learnings, architectureDelta} | slice.json, learnings.jsonl, deferred routing | yes | yes |
| `slice:abandon` | ABANDON_SLICE | reason | slice.json, project.json | yes | yes |
| `quest:*` | (mirrors slice:*) | (mirrors slice) | (mirrors slice) | yes | yes |
| `decision:create` | CREATE_DECISION | stdin {id, domain, title, summary} | decisions.jsonl | yes | yes |
| `decision:update` | UPDATE_DECISION | stdin | decisions.jsonl | yes | yes |
| `learning:rollup` | ROLLUP_LEARNINGS | --from, --to | learnings.jsonl (source + target) | yes | yes |

### Entity Commands (Read-only via Data Layer)

| Command | Reads |
|---|---|
| `epic:list` | epics/overview.json |
| `epic:show --epic` | epics/{name}/epic.json |
| `slice:list [--epic]` | slices/overview.json |
| `slice:show --slice` | slices/{name}/slice.json |
| `quest:list` | quests/overview.json |
| `quest:show --quest` | quests/{name}/quest.json |
| `decision:list` | decisions.jsonl |
| `decision:show --id` | decisions.jsonl (filtered) |
| `learning:list [--source]` | learnings.jsonl (project or scoped) |

### Sub-Agent Commands

| Command | Type | What It Does |
|---|---|---|
| `start-{plan,refinement,implementation,explore,architecture,slices,refine-architecture,refine-slices}` | Read-only | Assembles context bundle (entity JSON, architecture files, research, etc.) for sub-agent consumption |
| `submit-{plan,refinement,implementation,explore,architecture,slices,refine-architecture,refine-slices}` | Mutation | Accepts sub-agent output via stdin, triggers state event, writes content + transitions state atomically |

## 2. Coverage Matrix

| Skill Operation Category | CLI Command(s) | Coverage Level |
|---|---|---|
| **Read entity state** (JSON entities) | `epic:show`, `slice:show`, `quest:show`, `epic:list`, `slice:list`, `quest:list`, `status` | Full |
| **Read overview state** | `epic:list`, `slice:list`, `quest:list`, `status` | Full |
| **Read activity log** | `status` (last entries for staleness) | Partial — no `activity:list` command yet |
| **Create entities** | `epic:create`, `slice:create`, `quest:create`, `decision:create` | Full |
| **State transitions** (begin/complete phases) | All `epic:*`, `slice:*`, `quest:*` mutation commands | Full |
| **Append activity log** | All mutations auto-append via state machine | Full (automatic) |
| **Write learnings** | `slice:complete` (stdin payload), `learning:rollup` | Full |
| **Read learnings** | `learning:list [--source]` | Full |
| **Write decisions** | `decision:create`, `decision:update` | Full |
| **Read decisions** | `decision:list`, `decision:show` | Full |
| **Sub-agent context assembly** | `start-*` commands | Full |
| **Sub-agent result submission** | `submit-*` commands | Full |
| **Read architecture files** | `start-*` commands (bundled in context) | Partial — no standalone architecture read command |
| **Write architecture files** | `submit-architecture`, `submit-refine-architecture` (via sub-agent) | Partial — no direct write; sub-agents write to filesystem |
| **Update state.md** | None | Not covered |
| **Read state.md** | None | Not covered |
| **Write project-health.md** | None | Not covered |
| **Read project-health.md** | None | Not covered |
| **Write conventions.md** | None | Not covered |
| **Read conventions.md** | `start-*` (bundled in context) | Partial |
| **Write explore artifacts** (research/, brainstorm/, prototypes/) | Sub-agents write directly to filesystem | Not covered by CLI |
| **Write plan files** (plan.md, plan-refined.md) | Sub-agents write directly; `submit-plan` transitions state | Partial |
| **Write goal.md** (slice/epic goals) | Sub-agents write directly to filesystem | Not covered by CLI |
| **Archive scope** (~~archived~~ rename) | None | Not covered |
| **Write audit reports** | None | Not covered |
| **Write idea.md** | None | Not covered |
| **Update CLAUDE.md** | None | Not covered (intentionally) |

## 3. Well-Covered Operations

These skill operations map cleanly to CLI commands and can be fully replaced:

### 3a. Entity CRUD and State Transitions

All entity lifecycle operations have corresponding CLI commands. The state machine enforces valid transitions. Skills currently do this manually (checking file existence, writing JSON by hand) — the CLI handles it atomically.

- **Create epic/slice/quest/decision**: `epic:create`, `slice:create`, `quest:create`, `decision:create`
- **Phase transitions**: `epic:explore`, `slice:plan`, `slice:implement`, etc.
- **Completion**: `slice:complete` accepts learnings, deferred items, and architecture deltas via stdin
- **Abandonment**: `*:abandon` with reason

### 3b. Entity Reads

All entity reading is covered by `show` and `list` commands with `--json` and `--query` support. Skills currently use `ls` and `cat` to read entity state — CLI commands are more reliable and schema-validated.

### 3c. Decisions and Learnings

- `decision:create` and `decision:update` replace direct file writes to `.project/decisions/`
- `decision:list` and `decision:show` replace manual glob + read patterns
- `learning:list` reads from JSONL (replaces `cat .project/learnings.md`)
- `learning:rollup` handles cross-scope learning promotion

### 3d. Sub-Agent Context and Submission

The `start-*` / `submit-*` pair replaces the skill pattern of manually reading context files and writing results. The context bundle includes entity JSON, architecture files, research, and relevant history.

### 3e. Activity Log

All mutations automatically append to `activity-log.jsonl` via the state machine. Skills currently append manually with `echo >> .project/activity-log.jsonl`. The CLI centralizes this.

## 4. Gaps

### 4a. Critical Gaps

These are operations skills need regularly with no CLI equivalent.

| Gap | Skill Usage | Severity | Impact on Migration |
|---|---|---|---|
| **No `activity:list` command** | `project-status` reads last 5 entries; `complete` reads for signal tracking; `audit-architecture` reads last 20 | Critical | Skills must fall back to `tail -N .project/activity-log.jsonl` and parse JSONL manually |
| **No architecture file read/list command** | Every skill loads architecture files for context. `start-*` bundles them, but skills outside sub-agent workflows (project-status, audit-architecture, complete) need standalone access | Critical | Skills must use direct file reads — cannot leverage CLI's schema-aware loading |
| **No state.md read/write** | `project-status` reads and writes `state.md`; `create-plan`, `explore`, `create-architecture`, `create-slices`, `complete`, `refine-plan` all write `state.md` | Critical | The CLI's data model uses `project.json` (not `state.md`) as the source of truth. **This is a design gap**, not a missing command — `state.md` is a skill artifact the CLI intentionally does not use. Migration must reconcile these two state representations. |

### 4b. Moderate Gaps

| Gap | Skill Usage | Severity | Impact on Migration |
|---|---|---|---|
| **No project-health read/write** | `complete` updates `.project/project-health.md`; `audit-architecture` refreshes it | Moderate | Skills must continue with direct file access |
| **No conventions.md write** | `create-architecture` writes `.project/conventions.md` | Moderate | Sub-agent can write directly and `submit-architecture` handles the state transition |
| **No explore artifact write** | `explore` writes research/, brainstorm/, prototypes/ files | Moderate | Sub-agents write directly to filesystem; `submit-explore` handles state transition |
| **No goal.md write for slices** | `create-slices` writes per-slice goal.md files | Moderate | `slice:create` accepts name+goal but writes to `slice.json`, not `goal.md`. Skills write freeform markdown; CLI stores structured JSON. **Data format mismatch.** |
| **No plan file read/write** | `create-plan`, `refine-plan`, `implement-plan` all read/write plan.md and plan-refined.md | Moderate | `submit-plan` accepts plan content and writes it through RPC, so the write path exists. But skills need to read plans outside sub-agent context. |
| **No scope archive command** | `complete` renames directories with `~~archived~~` prefix | Moderate | The CLI's `slice:complete` transitions status to `completed` but does not rename directories. Skills currently do the rename manually. |
| **No idea.md write** | `create-epic` writes `.project/idea.md` | Moderate | This is a one-time setup operation; could remain as direct file write |

### 4c. Minor Gaps / Intentional Non-Coverage

| Gap | Skill Usage | Severity | Notes |
|---|---|---|---|
| **No CLAUDE.md update** | Multiple skills update CLAUDE.md Project Context section | N/A — intentional | CLAUDE.md is outside `.project/` scope; the CLI correctly does not manage it |
| **No expertise tracking** | Skills update `~/.claude/CLAUDE.md` Expertise section and memory files | N/A — intentional | User-level config, not project state |
| **No audit report write** | `audit-architecture` writes to `.project/audits/` | Minor | Low-frequency operation; direct file write is fine |
| **No side quest creation** | `audit-architecture` and `complete` propose side quests | Minor | `quest:create` covers this, though the workflow of auto-proposing quests is orchestration logic |

## 5. Ambiguous Cases

### 5a. state.md vs project.json

**The most significant mismatch.** Skills use `state.md` as a 4-section markdown file (Current Phase, Active Slice, Work Stack, Next Step). The CLI uses `project.json` with structured fields (`activeEpic`, `activeSlice`, `activeQuest`). These serve overlapping but different purposes:

- `project.json` tracks which entities are active (used by the state machine for guards)
- `state.md` tracks workflow phase, work stack, and human-readable next steps (used by skills for session continuity)

The CLI does not read or write `state.md`. Skills do not read or write `project.json`. **During migration, one must win as the source of truth, or both must coexist with clear ownership boundaries.**

### 5b. File-Existence State Machine vs Entity Status Field

Skills detect entity state by checking which files exist (goal.md, plan.md, explore-complete.md, etc.). The CLI tracks status in `epic.json`, `slice.json`, and `quest.json` via the state machine. These should be equivalent, but during migration there is a risk of divergence if skills write files without calling CLI commands to update entity status.

### 5c. Freeform Markdown vs Structured JSON

Skills write freeform markdown files (goal.md, plan.md, learnings.md, architecture/*.md). The CLI stores structured data in JSON/JSONL (entity JSON, decisions.jsonl, learnings.jsonl). For some entities (learnings, decisions), the CLI has replaced the markdown format. For others (goals, plans, architecture), the CLI stores metadata in JSON while the content remains as markdown files on disk — the sub-agent writes content, the CLI manages state.

### 5d. `slice:complete` vs `/complete` Skill

The CLI's `slice:complete` accepts structured stdin (verificationPassed, deferred, learnings, architectureDelta) and atomically updates entity JSON, routes deferred items, and rolls up learnings. The `/complete` skill does much more: synthesizes learnings interactively, proposes architecture updates, updates project-health, evaluates maturity, runs refactor intelligence, archives scope. **The CLI command covers the state transition; the skill covers the full completion workflow.** The skill should call `slice:complete` as its final state-transition step, not replace it.

### 5e. `epic:activate` vs `/start-epic` Skill

Similar pattern: `epic:activate` transitions epic status. `/start-epic` also reviews the architecture proposal, merges proposal into architecture directory, writes approved.md, renames directory. The CLI command is the atomic state transition; the skill is the full approval workflow.

## 6. Recommendations

### Critical Gaps

| Gap | Recommendation | Rationale |
|---|---|---|
| `activity:list` | **New command**: `activity:list [--scope] [--limit N] [--since date]` | Already noted as "not yet implemented" in commands-api.md. Skills need filtered activity log access. |
| Architecture file access | **Extend `start-*` or new read command**: Consider `architecture:list` and `architecture:show --file` | Skills outside sub-agent flows need architecture context. Alternatively, accept that non-sub-agent skills use direct file reads. |
| state.md reconciliation | **Decide ownership, not add a command** | If the CLI is the source of truth, skills should read `project.json` (via `status --json`). The "Next Step" and "Work Stack" concepts from state.md could be added to `status` output or a new `state:show` command. Or, accept that state.md is a skill-only artifact and the CLI ignores it. |

### Moderate Gaps

| Gap | Recommendation | Rationale |
|---|---|---|
| project-health.md | **Keep as direct file access** | Low-frequency, freeform content. Not worth a CLI command. |
| conventions.md | **Keep as direct file access** | Written once during architecture phase; sub-agent writes directly, CLI manages state transition. |
| Explore artifacts | **Keep as direct file access** | Sub-agents write content to disk; `submit-explore` handles the state transition. This is the intended pattern. |
| goal.md vs slice.json | **Accept dual representation** | `slice:create` stores goal in JSON; skills also write goal.md for human/LLM readability. The CLI could eventually read goal.md content into slice.json's `goal` field, but this is not blocking. |
| Plan file access | **Accept sub-agent pattern** | `start-plan` provides plan context; `submit-plan` accepts plan content. Skills should use these rather than reading plan files directly. |
| Scope archive | **New flag on complete commands**: `slice:complete --archive` or auto-archive on completion | The CLI's `slice:complete` updates status but does not rename directories. Skills do the rename. Either add it to the CLI or accept it as orchestration logic. |
| idea.md write | **Keep as direct file access** | One-time setup; `init` could optionally accept idea content, but this is not worth the complexity. |

### Design Decisions Needed

1. **state.md fate**: Should the CLI adopt state.md concepts (work stack, next step) in `status` output? Or should skills migrate to using `status --json` and derive next-step logic from entity status fields?

2. **File-existence vs entity-status**: Should the CLI's state machine be the sole authority, with skills always checking entity status via `show --json`? Or should both be supported during a transition period?

3. **Scope archiving**: Should `slice:complete` / `epic:complete` auto-rename directories with `~~archived~~`? This is a filesystem convention that downstream skills rely on for scanning.

4. **Sub-agent vs orchestrator boundary**: The `start-*` / `submit-*` pattern cleanly separates content authoring (sub-agent) from state management (CLI). Skills that are orchestrators (project-status, complete, audit-architecture) don't fit this pattern — they both read state and make decisions. These skills need a strategy: call CLI commands for state transitions, use direct file access for content reads.
