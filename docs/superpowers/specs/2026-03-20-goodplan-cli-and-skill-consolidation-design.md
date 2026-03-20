# goodplan CLI and Skill Consolidation

## Problem

The current goodplan workflow requires users to learn and invoke ~12 individual skills in a specific sequence. Many transitions between skills are deterministic and don't need LLM involvement — yet each one requires tool calls for file reads, state detection, and file writes. This makes the workflow both slow (too many tool calls) and complex (too many skills to learn).

## Goals

1. **Reduce skill surface area** — consolidate ~12 skills into ~7, with two primary flow skills (`/create-epic`, `/build`) that handle multi-phase workflows autonomously
2. **Maximize autonomous runtime** — front-load user questions so the LLM can churn through phases without stopping. Pause only for decisions that genuinely need human judgment or unexpected issues.
3. **Move deterministic work into a compiled CLI** — state detection, transitions, file I/O, validation, and context bundling handled by a fast binary instead of LLM tool calls
4. **Make the CLI independently useful** — humans can inspect project state, list epics/slices/quests, and check status without invoking Claude

## Non-Goals

- Fully eliminating user interaction during `/complete` (some decisions can't be front-loaded)
- Managing architecture file content via the CLI (architecture is free-form, LLM-owned)
- Backward compatibility with the old `.project/` format (clean migration instead)

---

## The `goodplan` CLI

A standalone compiled TypeScript binary built with `bun build --compile`. Ships as platform-specific binaries (darwin-arm64, darwin-x64, linux-x64, windows-x64). The CLI is the single interface to `.project/` state for both humans and LLMs.

### Two-Layer Architecture

**Resource layer** — stable CRUD operations on project entities:

- `goodplan epic list|show|create`
- `goodplan slice list|show|create`
- `goodplan quest list|show|create`
- `goodplan decision list|show|create`
- `goodplan learning list|show|create`
- `goodplan state show|transition`
- `goodplan activity list|show`
- `goodplan architecture show`

**RPC layer** — workflow-specific commands that compose resource operations:

- `goodplan context <phase> [target]` — returns bundled context for a specific workflow phase
- `goodplan begin <phase> [target]` — validates the transition, updates state, returns context
- `goodplan complete <phase> [target]` — records completion, updates state/activity-log, returns next valid actions
- `goodplan write <entity> [target]` — writes content files (plans, goals, etc.) while handling all bookkeeping
- `goodplan learning rollup --from <source> --to <target>` — merges learnings up the hierarchy

### Output Modes

- **Default**: human-readable, colored terminal output
- **`--json`**: structured JSON for LLM consumption
- **`--query`**: jq-style query to extract specific portions of JSON output (subsumes pagination — e.g., `.learnings[5:15]`)
- **`--depth=summary|standard|full`**: progressive disclosure — controls how much context is returned. The CLI knows what "standard context for planning" means and returns exactly that.
- **`--quiet`**: minimal output for scripting

### Content Input

For large text content (plans, goals, etc.), the CLI reads from stdin:

```bash
cat <<'EOF' | goodplan slice write-goal 01-auth
Build the authentication subsystem using OAuth2 with...
EOF
```

Single quotes around the heredoc delimiter prevent shell interpolation, so content passes through verbatim.

### Human-Facing Convenience Commands

- `goodplan status` — project health, active work, recommendations
- `goodplan init` — initialize a new `.project/` directory
- `goodplan install` — install/update skills into `~/.claude/skills/`
- `goodplan update` — pull latest version and reinstall

---

## Data Model

### The Split: JSON vs Markdown

**JSON (owned exclusively by the CLI):**

Structural and state data that benefits from typed access, validation, and scriptable operations.

- `project.json` — project-level metadata, state, decisions, learnings
- `overview.json` (per collection) — index of all epics/slices/quests with metadata: created, last-touched, completed-at, status, sequencing (for slices). Replaces the separate `sequencing.md`.
- `epic.json` / `slice.json` / `quest.json` (per entity) — metadata, status, timestamps, relationships (e.g., slice → epic reference), learnings, architecture update proposals
- `activity-log.jsonl` — append-only audit trail (stays separate from project.json since it's append-only and can grow large)

One JSON file per level. The CLI reads/writes atomically — no risk of partial updates.

**Markdown (written by the LLM, managed alongside JSON by the CLI):**

Content that the LLM authors and humans read. Free-form, creative, judgment-driven.

- `idea.md` — project problem and scope
- `goal.md` — per slice/quest/epic
- `plan.md` / `plan-refining.md` / `plan-refined.md` — implementation plans
- `architecture/*.md` — architecture docs (managed directly by LLM, not through CLI)
- `conventions.md` — coding standards
- `research/*.md`, `brainstorm/*.md` — exploration output

### Structured Learnings

Learnings are JSON from the start at every level (slice, epic, project). Each learning entry:

```json
{
  "category": "domain | worked | didnt-work | do-differently",
  "summary": "Brief actionable statement",
  "detail": "Longer explanation with context",
  "tags": ["auth", "testing"],
  "source": "slice/01-auth",
  "rollup": true
}
```

The LLM writes structured entries during `/complete` and marks which ones should roll up. The CLI handles the mechanical rollup: `goodplan learning rollup --from slices/01-auth --to epics/initial` merges marked entries, preserving provenance.

### Structured Architecture Updates

Architecture update proposals are JSON (metadata only — the actual architecture files are markdown managed by the LLM):

```json
{
  "subsystem": "auth",
  "type": "add | modify | remove",
  "description": "Add session store to auth subsystem",
  "rationale": "Discovered during implementation that OAuth2 flow requires server-side session state",
  "status": "proposed | approved | applied"
}
```

The CLI tracks proposal status. The LLM writes the actual markdown changes to architecture files after user approval.

### Directory Structure

Flattened compared to the current layout. No `__active__` or `~~archived~~` prefixes — status lives in JSON metadata. Slices are top-level, linked to epics via `slice.json` rather than nested inside them.

```
.project/
├── project.json              # project-level metadata, state, decisions, learnings
├── activity-log.jsonl        # append-only audit trail
├── idea.md
├── conventions.md
├── architecture/             # current-reality architecture (markdown, LLM-managed)
├── epics/
│   ├── overview.json         # index of all epics + status
│   ├── initial/
│   │   ├── epic.json         # metadata, status, timestamps
│   │   ├── goal.md
│   │   ├── architecture/     # target architecture (markdown, LLM-managed)
│   │   ├── research/
│   │   ├── brainstorm/
│   │   └── prototypes/
│   └── v2-mobile/
│       └── ...
├── slices/
│   ├── overview.json         # index + sequencing (array order = sequence)
│   ├── 01-auth/
│   │   ├── slice.json        # metadata, status, epic ref, timestamps,
│   │   │                     # learnings, architecture update proposals
│   │   ├── goal.md
│   │   ├── plan.md
│   │   ├── plan-refining.md
│   │   ├── plan-refined.md
│   │   ├── refinement/
│   │   └── implementation/
│   └── 02-data-layer/
│       └── ...
├── quests/
│   ├── overview.json
│   ├── fix-logging/
│   │   ├── quest.json
│   │   ├── goal.md
│   │   ├── plan.md
│   │   └── ...
│   └── ...
├── research/                 # project-level (curated from epics)
├── brainstorm/
└── prototypes/
```

Key changes from current structure:
- Slices are top-level, linked to epics via JSON rather than nested inside them
- No `__active__` or `~~archived~~` prefixes — status is in JSON metadata
- `overview.json` per collection replaces directory scanning and `sequencing.md`
- Paths are stable — renaming an epic doesn't change slice paths

---

## Consolidated Skills

### Skill Surface

| Skill | Type | Description |
|---|---|---|
| `/create-epic` | Flow | Full epic setup: explore → create-arch → refine-arch → create-slices → refine-slices |
| `/build` | Flow | Full build cycle: create-plan → refine-plan → implement-plan → complete |
| `/project-status` | Utility | `goodplan status --json` + LLM judgment and recommendations |
| `/audit-architecture` | Utility | Compare intended architecture vs actual code |
| `/audit-tests` | Utility | Assess test coverage and quality |
| `/audit-docs` | Utility | Assess documentation completeness |
| `/migrate` | Utility | Migrate existing `.project/` from old format to new |

### How Flow Skills Work

**Phase selection at invocation:**

When the user invokes `/create-epic` or `/build`, the skill asks up front how far to go:

- `/create-epic`: default is all phases (explore through refine-slices). User can say "stop after architecture" or similar.
- `/build`: two modes — "plan only" (create-plan + refine-plan) or "all" (plan + refine + implement + complete). "Plan only" supports the case where another session is implementing in a different branch.

**Front-loading questions:**

Interactive questions are concentrated at the beginning of the flow. For `/build`, this means the plan creation interview happens first, then the skill runs autonomously through refinement and implementation. It pauses only for:
- Unexpected issues during refinement or implementation that genuinely need user input
- The `/complete` phase, which has decisions that can't be front-loaded (architecture updates, remaining slice review, learnings curation)

**Target selection for `/build`:**

If not pointed at a specific slice or quest, `/build` calls `goodplan slice list --json` and `goodplan quest list --json`, then presents:
- The active slice (if one is in progress)
- The next slice (if none are active)
- Pending side quests (indicating if one is active)

Asks the user to pick.

**Re-entry:**

If you invoke `/build` and the CLI reports that slice 01-auth is mid-implementation, the skill picks up where it left off. No separate "continue" skill needed — the CLI knows the state, the skill adapts.

### Example: `/build` Flow

1. Skill calls `goodplan status --json` to get current state
2. Presents target options if none specified, asks user to pick
3. Calls `goodplan begin plan --slice 01-auth --json` — CLI validates transition, updates state, returns bundled context (goal, architecture, learnings, decisions, conventions)
4. LLM interviews user using the context, writes the plan
5. LLM pipes plan content to CLI: `cat <<'EOF' | goodplan slice write-plan 01-auth ...`
6. CLI creates both `plan.md` and `plan-refining.md`, sets state for refinement, returns refinement context
7. LLM runs refinement loop autonomously, writes `plan-refined.md` when done
8. Calls `goodplan begin implementation --slice 01-auth --json` — returns implementation context
9. LLM implements phase by phase, committing after each passing phase
10. At complete: LLM writes structured learnings and architecture update proposals via CLI
11. LLM presents architecture updates and remaining slice review to user for approval
12. CLI handles learnings rollup after user approves

### LLM / CLI Responsibility Split

| Responsibility | Owner |
|---|---|
| State detection and transitions | CLI |
| File I/O for structural data | CLI |
| Transition validation (reject invalid moves) | CLI |
| Context bundling and progressive disclosure | CLI |
| Activity log maintenance | CLI |
| Learnings rollup (mechanical) | CLI |
| Interviewing users | LLM |
| Writing content (plans, goals, architecture, research) | LLM |
| Reviewing and scoring (plan refinement, implementation review) | LLM |
| Editorial judgment (which learnings roll up, architecture update proposals) | LLM |
| Architecture file management | LLM (direct read/edit) |
| Surfacing unexpected issues to user | LLM |

---

## Delivery Ordering

**Build order constraints** (what depends on what):

1. JSON schemas and CLI resource layer must exist before RPC commands can compose them
2. RPC commands must exist before consolidated skills can call them
3. Skill consolidation must be done before retiring the old individual skills
4. Migration can happen incrementally — the CLI could support reading both old and new formats during transition
5. Distribution (`install`/`update`) comes last since it's independent of the workflow logic

Exact slice boundaries are deferred to epic planning. The ordering above gives us the dependency graph; slice planning will decide how thin to cut each piece.

---

## Migration

A `/migrate` skill (not a CLI command) handles migration from the old `.project/` format:

1. Moves `.project/` to `.project.bak/`
2. Reads the old structure (LLM interprets free-form content, decides what maps where)
3. Calls `goodplan init` to create new `.project/` with correct JSON structure
4. Uses CLI commands to populate JSON from old structural data
5. Copies markdown content files (goals, plans, architecture) into new locations
6. User verifies the migration
7. User removes `.project.bak/` when satisfied

The LLM handles interpretation of old content; the CLI handles writing to the new format. This ensures all invariants of the new structure are enforced from the start.

---

## Distribution

The CLI is the install and update mechanism:

- `goodplan install` — installs/updates skills into `~/.claude/skills/`
- `goodplan update` — pulls latest version and reinstalls both the binary and skills
- Platform binaries: darwin-arm64, darwin-x64, linux-x64, windows-x64
- Future: Homebrew formula or similar package manager integration

The CLI and skills are always in sync since the CLI manages both. Version coherence is guaranteed.
