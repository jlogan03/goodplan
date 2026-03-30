# Brainstorm: Command Surface Design

## Design Principles

1. **Unflagged positional arguments are always commands/subcommands, never data.** All identifiers are flags.
2. **Commands map directly to workflow phases.** Reading the commands reads the workflow.
3. **Colon namespaces** group related commands: `epic:`, `build:`, `resource:`.
4. **Phase-level verbs** (orchestrator): `begin`, `status`, `context`, `complete`, `abandon`
5. **Action-level verbs** (sub-agent): `start-<action>`, `submit-<action>`
6. **State modification and status reading are always separate commands.**
7. **Mutations accept stdin JSON** (Zod-validated). Read-only commands use CLI args only.
8. **Target flags required on every call** — no implicit state. Enables safe concurrent sessions.

## Input Pattern

All mutation commands (`create`, `update`, `begin`, `complete`, `start-*`, `submit-*`) accept structured JSON via stdin. The CLI builds a merged object:

```json
{
  "cli": { "slice": "01-auth", "epic": "initial", "reviewer": "architecture" },
  "stdin": { "goal": "Build the auth subsystem...", "scores": { ... } }
}
```

Zod validates the merged object — can enforce which fields must come from which source and cross-cutting constraints.

## Output Pattern

- **`--json`**: structured JSON for LLM consumption
- **`--depth=summary|standard|full`**: progressive disclosure. Depth levels expand to predefined queries per phase internally.
- **`--query`**: jq-style expression to further narrow the output. If both `--depth` and `--query` are provided, the query narrows the depth result.

All read commands support these flags.

## Schema Discovery

`goodplan schema` is a prefix that returns API information for any command path:

- `goodplan schema` — top-level namespaces and global commands
- `goodplan schema epic` — all epic: commands
- `goodplan schema build` — all build: commands
- `goodplan schema build:refine-plan` — refine-plan subcommands, input/output schemas
- `goodplan schema build:refine-plan submit-review` — specific command schema
- `goodplan schema resource` — all resource: commands (collapsed to one line in top-level schema)

Schema output supports `--depth` and `--query`.

## Orchestrator vs Sub-Agent Context Split

- **Orchestrator** uses `begin`, `status`, `complete`, `abandon` — manages transitions, gets compact state
- **Sub-agents** use `context` and `start-*`/`submit-*` — get deep working content, do the actual work
- Sub-agents write results directly via `submit-*` — results never pass through orchestrator context
- After sub-agents complete, orchestrator calls `status` to see updated state and decide next action

## Full Command Surface

```
# ============================================================
# GLOBAL (always available, no namespace)
# ============================================================

goodplan status                                    # project overview, active work, recommendations
goodplan schema [command...]                        # API discovery with --depth/--query
goodplan init                                       # initialize .project/
goodplan abandon --slice|--quest|--epic <name>      # abandon entire entity (stdin: reason)
goodplan delete --slice|--quest|--epic <name> --confirm  # hard delete
goodplan learning rollup --from <source> --to <target>

# ============================================================
# resource: NAMESPACE — pure CRUD
# ============================================================

# All support --json, --query, --depth
# create/update accept stdin JSON (Zod-validated)
# list/show are read-only, CLI args only

resource:epic list|show|create|update              # --epic <name> for show/create/update
resource:slice list|show|create|update             # --slice <name>, --epic <name>
resource:quest list|show|create|update             # --quest <name>
resource:decision list|show|create|update          # --decision <id>
resource:learning list|show|create|update          # --learning <id>
resource:activity list
resource:architecture show

# ============================================================
# epic: NAMESPACE — epic setup flow
# ============================================================

# --- Explore ---
epic:explore begin --epic <name>
epic:explore status --epic <name>
epic:explore context --epic <name>
epic:explore start-research --epic <name> --topic <slug>
epic:explore submit-research --epic <name> --topic <slug>          # stdin
epic:explore start-brainstorm --epic <name> --topic <slug>
epic:explore submit-brainstorm --epic <name> --topic <slug>        # stdin
epic:explore start-prototype --epic <name> --prototype <name>
epic:explore submit-prototype --epic <name> --prototype <name>     # stdin
epic:explore complete --epic <name>                                # stdin
epic:explore skip --epic <name>                                    # stdin: reason
epic:explore abandon --epic <name>

# --- Define Architecture ---
epic:define-architecture begin --epic <name>
epic:define-architecture status --epic <name>
epic:define-architecture context --epic <name>
epic:define-architecture complete --epic <name>                    # stdin
epic:define-architecture abandon --epic <name>

# --- Refine Architecture ---
epic:refine-architecture begin --epic <name>
epic:refine-architecture status --epic <name>
epic:refine-architecture context --epic <name>
epic:refine-architecture start-reviewer --epic <name> --reviewer <type>
epic:refine-architecture submit-review --epic <name> --reviewer <type>   # stdin
epic:refine-architecture start-update --epic <name>
epic:refine-architecture submit-update --epic <name>                     # stdin
epic:refine-architecture complete --epic <name>
epic:refine-architecture complete --epic <name> --override
epic:refine-architecture abandon --epic <name>

# --- Define Slices ---
epic:define-slices begin --epic <name>
epic:define-slices status --epic <name>
epic:define-slices context --epic <name>
epic:define-slices complete --epic <name>                          # stdin
epic:define-slices abandon --epic <name>

# --- Refine Slices ---
epic:refine-slices begin --epic <name>
epic:refine-slices status --epic <name>
epic:refine-slices context --epic <name>
epic:refine-slices start-reviewer --epic <name> --reviewer <type>
epic:refine-slices submit-review --epic <name> --reviewer <type>         # stdin
epic:refine-slices start-update --epic <name>
epic:refine-slices submit-update --epic <name>                           # stdin
epic:refine-slices complete --epic <name>
epic:refine-slices complete --epic <name> --override
epic:refine-slices abandon --epic <name>

# ============================================================
# build: NAMESPACE — build flow (--slice or --quest, mutually exclusive)
# ============================================================

# --- Plan ---
build:plan begin --slice <name>
build:plan status --slice <name>
build:plan context --slice <name>
build:plan complete --slice <name>                                 # stdin: plan content + decisions
build:plan abandon --slice <name>

# --- Refine Plan ---
build:refine-plan begin --slice <name>
build:refine-plan status --slice <name>
build:refine-plan context --slice <name>
build:refine-plan start-reviewer --slice <name> --reviewer <type>
build:refine-plan submit-review --slice <name> --reviewer <type>         # stdin
build:refine-plan start-update --slice <name>
build:refine-plan submit-update --slice <name>                           # stdin
build:refine-plan complete --slice <name>
build:refine-plan complete --slice <name> --override
build:refine-plan abandon --slice <name>

# --- Implement ---
build:implement begin --slice <name>
build:implement status --slice <name>
build:implement context --slice <name> --phase <N>
build:implement start-impl --slice <name> --phase <N>
build:implement submit-impl --slice <name> --phase <N>                   # stdin
build:implement start-review --slice <name> --phase <N>
build:implement submit-review --slice <name> --phase <N>                 # stdin
build:implement complete --slice <name>
build:implement abandon --slice <name>

# --- Synthesize Changes ---
build:synthesize-changes begin --slice <name>
build:synthesize-changes status --slice <name>
build:synthesize-changes context --slice <name>
build:synthesize-changes complete --slice <name>                   # stdin: learnings, arch approvals
build:synthesize-changes abandon --slice <name>
```

## Refinement Pattern (shared)

All three refine phases (`epic:refine-architecture`, `epic:refine-slices`, `build:refine-plan`) share the exact same sub-pattern. The CLI implementation can be a single generic handler parameterized by what's being refined:

```
<refine-phase> begin --<target>
<refine-phase> status --<target>
<refine-phase> context --<target>
<refine-phase> start-reviewer --<target> --reviewer <type>
<refine-phase> submit-review --<target> --reviewer <type>
<refine-phase> start-update --<target>
<refine-phase> submit-update --<target>
<refine-phase> complete --<target>
<refine-phase> complete --<target> --override
<refine-phase> abandon --<target>
```

The CLI tracks: round number, per-reviewer score history, trend (improving/declining/oscillating), circuit breaker (max rounds). The `status` command returns this tracking data. The `submit-review` command updates scores and trend. The `complete` command validates that scores meet threshold (or `--override` is set).

## State Machine Enforcement

When the CLI is in a specific phase (e.g., `build:refine-plan`), it only allows:
- Commands within that phase (`build:refine-plan *`)
- Read-only global commands (`status`, `schema`, `resource:* list|show`)
- `context` commands for any phase (read-only)

All other commands return an error with the current state and allowed commands. This means the orchestrator literally cannot make invalid workflow moves.

## Open Questions

- Exact Zod schemas for each command's stdin and response — deferred to architecture phase
- How `complete` handles partial failures (e.g., plan written but activity log append failed)
- Whether `epic:define-architecture` and `epic:define-slices` need `start-*`/`submit-*` sub-actions or if they're purely orchestrator-interactive
