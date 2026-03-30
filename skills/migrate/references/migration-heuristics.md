# Migration Heuristics

Reference for the `/migrate` skill. Detailed rules for inferring entity status from pre-CLI project directory (`.project/` for legacy, `.goodplan/` for re-migration) filesystem artifacts, and conventions for directory scanning. All paths below use `$PROJ_DIR` — substitute with whichever directory exists (see SKILL.md Step 4).

## Status Inference Rules

Check in this order (first match wins):

| Priority | Signal | Inferred Status | Applies To |
|----------|--------|-----------------|------------|
| 1 | `abandoned.md` exists | `abandoned` | Epics, slices, quests |
| 2 | `completion/learnings.md` exists | `completed` | Epics, slices, quests |
| 3 | `architecture/_overview.md` exists AND `slices/` has subdirectories | `activated` | Epics only |
| 4 | `architecture/_overview.md` exists without slices | `architecture-defined` | Epics only |
| 5 | `plan-refined.md` or `plan-refined/` exists | `plan-refined` | Slices, quests |
| 6 | `plan.md` or `plan/` exists | `plan-created` | Slices, quests |
| 7 | Only `goal.md` exists (no other workflow artifacts) | `created` | Epics, slices, quests |

### Notes

- These rules cover stable, terminal, or milestone statuses only. Intermediate workflow statuses (e.g., `exploring`, `defining-architecture`, `planning`) are not expected in pre-CLI projects because those statuses existed only in-memory during a skill run. If you somehow detect evidence of an interrupted intermediate state, map to the nearest stable predecessor (e.g., mid-refinement with `plan.md` but no `plan-refined.md` → `plan-created`).
- For quests: check the quest's own directory for artifacts. Quests do not have slices in the CLI model.

## Directory Scanning Conventions

### Epic Discovery

Scan `$PROJ_DIR/epics/` for subdirectories. Each subdirectory is an epic.

### Quest Discovery

Scan `$PROJ_DIR/side-quests/` (NOT `$PROJ_DIR/quests/` — the CLI uses `quests` as the entity name, but the old filesystem uses `side-quests`). Each subdirectory containing `goal.md` is a quest.

### Prefix Stripping

Old-format directories use prefixes to indicate status:

| Prefix | Meaning | Strip for clean name? |
|--------|---------|----------------------|
| `~~archived~~` | Archived/completed entity | Yes — strip `~~archived~~` and any trailing numeric prefix (e.g., `~~archived~~01_initial` → `initial`) |
| `~~archived~~NN_` | Archived with sequence number | Yes — strip entire `~~archived~~NN_` prefix |
| `__active__` | Currently active entity | Yes — strip `__active__` prefix |

**Important:** `~~archived~~` and `__active__` prefixes are mutually exclusive — they never co-occur on the same directory.

### sourcePath Convention

When answering migration questions, provide `sourcePath` as the directory name exactly as it appears on the filesystem (including any `~~archived~~` or `__active__` prefix). The CLI uses `sourcePath` to locate the old directory for artifact copying. The clean name (with prefix stripped) goes in the `name` field.

### Ignored Items

- `.DS_Store` files — skip
- Files that are not directories — skip (only directories represent entities)
- Directories without `goal.md` — typically not valid entities, but report them and let the CLI decide

## Goal Extraction

For each entity directory, read `goal.md`:

- Use the first paragraph as the goal string
- If a `## What We're Building` section exists, prefer that section's content
- Keep the goal concise — one to three sentences
- Quest goals must be explicitly included in migration answers (they are not inferred)
