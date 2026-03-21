# Context Bundling Design

## No Depth Levels

The original `--depth=summary|standard|full` flag is dropped. RPC commands already know which phase they're serving — they return exactly the right context. No need for the caller to choose a depth.

## `--inline` Flag

- **Without `--inline`:** metadata + file path references only. Compact. Orchestrator's default.
- **With `--inline`:** same metadata + references, plus inlines content in priority order up to a budget. Sub-agent's default.

Both modes return the same JSON shape — `inline` is just empty when the flag is absent.

```bash
# Orchestrator — compact
goodplan context plan --slice 01-auth --json

# Sub-agent — full working context
goodplan context plan --slice 01-auth --json --inline
```

## Budget-Based Inlining

When `--inline` is present:
1. RPC command ranks content by relevance to the phase (e.g., for implementation: refined plan > slice goal > architecture for affected subsystems)
2. Inlines content in priority order until hitting a size budget (~20-30KB, tunable)
3. Everything that didn't fit goes into the `references` list as file paths

## Response Shape

```json
{
  "inline": {
    "refinedPlan": "# Plan: 01-data-layer\n...",
    "sliceGoal": "Build the data layer...",
    "currentArchOverview": "# Architecture Overview\n..."
  },
  "references": [
    ".project/architecture/data-model.md",
    ".project/architecture/conventions.md",
    ".project/conventions.md"
  ],
  "decisions": [...],
  "learnings": [...]
}
```

References are plain file paths. The LLM uses its file reading tools to pull in what it needs. The CLI generates the paths — if the directory structure changes, only the context bundling logic updates.

## `--query` Flag

Available on ANY command that outputs JSON — resource commands, status, context, begin, complete, schema. Post-processing filter via jqjs on the JSON output.

## Orchestrator vs Sub-Agent Context

| Consumer | Commands | Content | Purpose |
|---|---|---|---|
| Orchestrator | `begin`, `complete`, `status` | Compact metadata, no `--inline` | Route decisions, manage flow |
| Sub-agent | `context` with `--inline` | Inlined critical content + references | Do the actual work |

## Slice/Quest Planning Context

Both slices and quests receive:
- **Current architecture** (project-level) — where we are now
- **Target architecture** (epic-level) — where we're going
- So the plan fits both current reality and epic direction
