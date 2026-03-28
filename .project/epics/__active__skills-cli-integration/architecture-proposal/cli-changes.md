# CLI Changes for Skill Integration

## 1. `goodplan state` — Full State Dump with `--query`

The single most important addition. `assembleState()` already builds the complete recursive tree of everything in `.project/` — JSON parsed as objects, JSONL as arrays, markdown as raw strings, directories as nested objects. One command exposes it all; `--query` (jq via jqjs) selects what the agent needs.

```bash
# Full project state (large — use --query in practice)
goodplan state --json

# Active slice status
goodplan state --json --query '.slices["my-slice"]["slice.json"].status'

# All decision entries
goodplan state --json --query '.["decisions.jsonl"]'

# Last 5 activity log entries
goodplan state --json --query '.["activity-log.jsonl"] | .[-5:]'

# Page through activity log (entries 20-39)
goodplan state --json --query '.["activity-log.jsonl"]' --offset 20 --limit 20

# List all architecture file names
goodplan state --json --query '.architecture | keys'

# Read a specific architecture doc (raw markdown)
goodplan state --json --query '.architecture["flows.md"]'

# A specific slice's learnings (JSONL entries)
goodplan state --json --query '.slices["my-slice"]["learnings.jsonl"]'

# A specific slice's architecture deltas
goodplan state --json --query '.slices["my-slice"]["architecture-deltas.jsonl"]'

# All slice names and statuses
goodplan state --json --query '[.slices | to_entries[] | {name: .key, status: .value["slice.json"].status}]'

# Project-level learnings filtered by source
goodplan state --json --query '[.["learnings.jsonl"][] | select(.source == "04-slice-lifecycle")]'

# Decisions matching a specific context
goodplan state --json --query '[.["decisions.jsonl"][] | select(.context | contains("create-architecture"))]'

# Everything about the active epic
goodplan state --json --query '.epics[.["project.json"].activeEpic]'

# Check if a file exists in a scope
goodplan state --json --query '.slices["my-slice"] | has("plan-refined.md")'
```

### Pagination with `--offset` / `--limit`

When `--query` returns an array, `--offset N --limit N` pages through it:

```bash
# First 20 activity entries
goodplan state --json --query '.["activity-log.jsonl"]' --limit 20

# Next 20
goodplan state --json --query '.["activity-log.jsonl"]' --offset 20 --limit 20

# Project-level learnings, 10 at a time
goodplan state --json --query '.["learnings.jsonl"]' --limit 10
```

`--offset`/`--limit` apply after `--query` evaluation. If the query result is not an array, they are ignored. This keeps the implementation simple — jqjs evaluates the expression, then the output formatter slices the array.

### How It Works
- `assembleState()` builds the tree (already implemented)
- `--query` applies the jq expression server-side via jqjs (already implemented for other commands)
- `--offset`/`--limit` slice the query result if it's an array
- Only the final result is written to stdout — the full tree is never serialized unless `--query` is omitted
- Without `--query`: returns the complete tree (useful for debugging, potentially large)
- The tree structure mirrors the `.project/` directory layout, making paths predictable

### What This Replaces
- `activity:list` → `goodplan state --json --query '.["activity-log.jsonl"] | ...'`
- `content:list` → `goodplan state --json --query '.architecture | keys'`
- `decision:list`/`learning:list` with filters → `goodplan state --json --query '...'`
- File-existence checks → `goodplan state --json --query '.slices["x"] | has("plan-refined.md")'`
- Most of the specialized list/show enrichments proposed earlier

### What It Doesn't Replace
- Ergonomic shortcuts (`status`, `show`, `list`) remain valuable for common queries — they're simpler to invoke and return pre-formatted summaries
- Mutation commands (`create`, `plan`, `complete`, `submit-*`) — state dump is read-only

---

## 2. Enrich `show` Commands with Artifact Existence

Skills need a quick way to check workflow phase without parsing the full state tree. Enriching `show --json` with an `artifacts` field provides this.

### Changes to `epic:show`, `slice:show`, `quest:show`

Add an `artifacts` field to the `--json` output:

```typescript
// Added to slice:show --json response
{
  // ... existing fields (name, status, epic, etc.) ...
  artifacts: {
    goal: boolean;           // goal.md exists
    exploreComplete: boolean; // explore-complete.md or explore-skipped.md exists
    plan: boolean;           // plan.md exists
    planRefined: boolean;    // plan-refined.md (or plan-refined/) exists
    implementation: boolean; // implementation/ has content
    abandoned: boolean;      // abandoned.md exists
  }
}
```

This moves the file-existence state machine from skills into the CLI. The `assembleState()` tree already has this information — the `show` command just needs to expose it.

---

## 3. Enrich `status --json` with File Path Arrays

Upgrade artifact counts to include file listings so agents can discover what exists without a full state dump:

```json
{
  "artifacts": {
    "architecture": {
      "count": 10,
      "files": ["_overview.md", "commands-api.md", "conventions.md", "..."]
    },
    "research": {
      "count": 7,
      "files": ["bun-compilation.md", "cli-frameworks.md", "..."]
    },
    "brainstorm": {
      "count": 4,
      "files": ["command-surface.md", "context-bundling.md", "..."]
    },
    "prototypes": {
      "count": 1,
      "files": ["jqjs-spike/"]
    },
    "decisions": 16,
    "learnings": 28,
    "completedSlices": 8,
    "totalSlices": 8
  }
}
```

---

## 4. Add `--archive` Flag to Complete Commands

Skills currently rename directories with `~~archived~~` prefix after completion. The CLI should handle this.

### Changes
- `slice:complete --archive` — after successful completion, rename slice directory with `~~archived~~` prefix
- `quest:complete --archive` — same for quests
- `epic:complete --archive` — rename with `~~archived~~NN_` prefix (counter per epic-conventions.md)

### Behavior
- Archive is opt-in (flag required) — completing without `--archive` leaves directory in place
- The rename happens after the state transition succeeds
- Returns the new directory path in the response

```typescript
{
  // ... existing CompleteResult fields ...
  archivedPath?: string;  // new path after rename, if --archive was used
}
```

---

## 5. Semantic Versioning and Compatibility Checking

Three components that must stay compatible: the CLI binary, the `.project/` data, and the skill files. Use semantic versioning across all three with compatibility checks at invocation time.

### Version Locations

| Component | Where version lives | Example |
|-----------|-------------------|---------|
| **CLI binary** | Hardcoded in `src/index.ts`, returned by `goodplan --version` | `1.2.0` |
| **Project data** | `project.json.version` (already exists) | `1.1.0` |
| **Skill files** | SKILL.md frontmatter: `requires: goodplan >= 1.2.0` | `>= 1.2.0` |

### Semver Semantics

| Version component | What it means for goodplan |
|-------------------|--------------------------|
| **Major** (X.0.0) | Breaking changes: commands removed/renamed, data model schema changes that break old readers, state machine behavior changes |
| **Minor** (0.X.0) | New features: new commands added, new fields in JSON (additive), new event types in state machine |
| **Patch** (0.0.X) | Bug fixes: no API or data model changes |

### Compatibility Rules

**CLI → Project Data:**
The CLI checks `project.json.version` on every command that reads `.project/`:

| Condition | Behavior |
|-----------|----------|
| CLI major > data major | Warn: "Project data was created with an older major version. Run `goodplan migrate` to upgrade." Proceed with best effort. |
| CLI major < data major | Error: "Project data requires goodplan >= X.0.0 but this is Y.0.0. Upgrade the CLI." Exit 2. |
| CLI major == data major, CLI minor >= data minor | Compatible. Proceed normally. |
| CLI major == data major, CLI minor < data minor | Warn: "Project data uses features from goodplan X.Y.0 but this is X.Z.0. Some data may not be fully understood. Consider upgrading the CLI." Proceed with best effort. |

**Skill → CLI:**
Skills declare their minimum required CLI version in SKILL.md frontmatter. The skill checks this at startup:

```bash
goodplan --version --json
# Returns: { "version": "1.2.0" }
```

If the CLI version doesn't satisfy the skill's `requires` constraint, the skill tells the user:

> This skill requires goodplan >= 1.2.0 but found 1.1.0. Upgrade the CLI with `bun run build` in the goodplan repo.

**CLI → Data on Write:**
When the CLI creates a new project (`goodplan init`), it stamps `project.json.version` with the CLI's current version. When the CLI writes data that uses new minor-version features (new fields, new entity types), it updates `project.json.version` to the current CLI version. This ensures the data version reflects the highest feature level used, not just the creation version.

### Migration Path

When major versions change, `goodplan migrate` transforms project data from the old schema to the new one. This command:
- Reads the current `project.json.version`
- Applies migration functions in sequence (1.x → 2.x → 3.x)
- Updates `project.json.version` to the current CLI version
- Appends a migration entry to `activity-log.jsonl`

Migration functions are registered in a migration registry (similar to database migrations). Each migration is a pure function: `(oldState: ProjectState) → newState: ProjectState`.

### Current State

The CLI currently hardcodes version `0.0.1`. As part of this epic:
- Adopt semver properly: `1.0.0` for the first stable release (post-integration)
- Add `--version --json` output format
- Add compatibility check to the command dispatcher (runs before any command)
- Add `requires` frontmatter field to SKILL.md files
- Skills check version at startup per the convention doc

---

## Implementation Priority

1. **`goodplan state --json --query`** with `--offset`/`--limit` — unlocks full data access. This is the keystone; once it exists, skills can query anything.
2. **Enriched `show` with `artifacts`** — ergonomic shortcut for the most common query (workflow phase detection)
3. **Enriched `status` with file arrays** — ergonomic shortcut for orientation
4. **`--archive` on complete commands** — eliminates manual directory renaming from skills
