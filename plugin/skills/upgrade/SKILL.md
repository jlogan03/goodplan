---
name: upgrade
description: Migrate project, convert to goodplan, import existing .project/ or .goodplan/ — converts a pre-CLI project directory to CLI-managed state, or re-migrates an already-initialized project to restructure state (e.g., flat slices to nested). Interactive Q&A guides the CLI through epic/quest/slice inventory, status inference, and artifact copy. Common triggers: 'upgrade', 'migrate', 'update state format', 'convert project'.
user-invocable: true
requires: gp >= 1.0.0
---

# Upgrade

## References

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md

Focus on Section 10: Error Handling (exit codes, error codes, recovery patterns).

## Step 1 — Version Check

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md.

## Step 2 — Pre-flight Checks

Check for an in-progress migration first:

```bash
ls .migration-in-progress.json 2>/dev/null
```

**If `.migration-in-progress.json` exists:** A previous migration was interrupted mid-Q&A. Tell the user: "A migration is in progress. Resuming." Proceed directly to Step 3 — `gp migrate --json` will auto-resume from where it left off.

Check for partial migration from a previous attempt:

```bash
ls -d .project-old/ .project-old-*/ .goodplan-old/ .goodplan-old-*/ 2>/dev/null
```

**If a backup exists (`.project-old-*` or `.goodplan-old-*`) but neither `.project/` nor `.goodplan/` exists:** A previous migration attempt may have failed mid-run. The CLI renames the project directory to `<dir>-old-<timestamp>/` during migration. Tell the user:

> "Found a backup directory but no project directory. A previous migration may have failed. Rename the backup back to its original name and retry."

Stop.

**If a project directory and a backup both exist:** This is normal — the backup is from a previous successful migration. Check whether this is a re-migration scenario:

```bash
ls .goodplan/project.json .project/project.json 2>/dev/null
```

If `project.json` exists, this project is already CLI-managed. Present:

> "This project is already CLI-managed. Re-migration will rebuild state from the current directory structure. Existing backups from prior migrations will be preserved (timestamped naming). Continue?"

If the user confirms, proceed to Step 3. If the user declines, stop. The CLI now supports re-migration with timestamped backups.

If `project.json` does not exist, this is a first migration with a stale backup. Present:

> "Both a project directory and a backup exist. If the previous migration succeeded, the backup can be removed. If it failed, remove the project directory and rename the backup back, then retry."

Stop.

**If no backup directories exist:** This is a normal first migration. Proceed to Step 3.

## Step 3 — Start Migration

Initiate the migration workflow:

```bash
$GP migrate --json
```

Handle error responses:

| Error Code | Action |
|---|---|
| `DATA_NO_PROJECT` | "No `.goodplan/` or `.project/` directory found. Nothing to migrate." Stop. |
| `DATA_MIGRATION_BACKUP_EXISTS` | Backup directory collision (sub-second timestamp match). Wait one second and retry. |
| Other errors | Present the full error to the user and stop. |

On success, the CLI returns the first round of questions. If the response includes a `warning` field (re-migration scenario), display the warning to the user but continue — the CLI proceeds to Q&A regardless.

Proceed to Step 4.

## Step 4 — Answer Inventory Questions

Before answering, determine the project directory and review the migration heuristics below.

1. **Determine the project directory.** The CLI's `gp migrate` command detects `.goodplan/` (re-migration) or `.project/` (legacy) automatically. **Important:** Shell variables don't persist across separate Bash tool invocations. Prefix every Bash call that uses `PROJ_DIR` with the detection line:
   ```bash
   PROJ_DIR=$([ -d .goodplan ] && echo ".goodplan" || echo ".project")
   ```
2. Read the `$PROJ_DIR/` filesystem to discover entities.

### Epic Discovery

```bash
PROJ_DIR=$([ -d .goodplan ] && echo ".goodplan" || echo ".project") && ls -d $PROJ_DIR/epics/*/ 2>/dev/null
```

For each subdirectory:
- Strip prefix to derive clean name (see heuristics reference for prefix rules)
- Read `goal.md` for the goal string
- Check for status-indicating artifacts in priority order (see heuristics reference)
- Set `sourcePath` to the relative path from `$PROJ_DIR` (e.g., `epics/__active__my-epic`), including any prefix. The CLI resolves this relative to the old project root.

### Quest Discovery

```bash
ls -d $PROJ_DIR/side-quests/*/ 2>/dev/null
```

For each subdirectory containing `goal.md`:
- Strip prefix to derive clean name
- Read `goal.md` for the goal string (quest goals must be explicitly provided)
- Check for status-indicating artifacts
- Set `sourcePath` to the relative path from `$PROJ_DIR` (e.g., `side-quests/fix-logging`)

### Answering

Construct the answer payload. The CLI expects an envelope wrapping each answer with the question's `id` and your answer as `data`:

```json
{
  "round": <round-number-from-CLI-response>,
  "answers": [
    { "id": "<questionId>", "data": <answer-matching-responseSchema> },
    { "id": "<questionId>", "data": <answer-matching-responseSchema> }
  ]
}
```

Each question's `responseSchema` defines the shape of its `data` field — not the top-level payload. **Include an answer for every question in the round** — the CLI rejects incomplete submissions with `VALIDATION_MIGRATION_INVALID`. Pipe the envelope using `stdin:` parameter syntax for robustness with large payloads:

```bash
stdin: '<envelope-json>' | $GP migrate --json
```

For simple/short answers, `echo` piping is also acceptable:

```bash
echo '<envelope-json>' | $GP migrate --json
```

If the CLI returns validation errors (bad sourcePaths, schema failures), read the error message, fix the answer, and resubmit.

## Step 5 — Answer Follow-up Rounds

The CLI asks follow-up questions for each epic (slices, architecture, sequencing). If no epics were reported in Step 4, the CLI skips directly to the confirmation round (Step 6). For each round:

### Slice Discovery

Check both nested and flat locations — during re-migration, slices may still be at the top-level flat path:

```bash
# Nested (already under epic)
ls -d $PROJ_DIR/epics/<epicDir>/slices/*/ 2>/dev/null
# Flat (legacy — needs re-structuring)
ls -d $PROJ_DIR/slices/*/ 2>/dev/null
```

If slices are found at the flat path (`$PROJ_DIR/slices/`) but not under the epic, these are the slices that need to be migrated into the epic's nested structure. Include them in the answer with `sourcePath` pointing to the flat location (e.g., `slices/01-setup`). The CLI will copy them to the correct nested location.

For each slice subdirectory:
- Strip any numeric prefix (e.g., `01-setup` → `setup`, or keep as-is if the name is meaningful)
- Read `goal.md` for the goal
- Infer status from artifacts (see heuristics reference)

### Architecture & Activation

The epic-details response also requires:
- `hasArchitecture` (boolean) — `true` if `$PROJ_DIR/epics/<epicDir>/architecture/` contains any files (not just `_overview.md`)
- `activatedDate` (string | null) — for activated epics (those with architecture + slices), use the git commit date of an architecture file if available; `null` if no git history (e.g., `.project/` was in `.gitignore`) or if the epic is not activated

### Slice Sequencing

```bash
ls $PROJ_DIR/epics/<epicDir>/slices/sequencing.md 2>/dev/null
```

If `sequencing.md` exists, read it and extract the ordering information.

### Quest Sub-structure

Quests do not have slices in the CLI model. Any subdirectories within a quest (e.g., `plan-refining/`, `refinement/`, `research/`) are treated as markdown artifacts and copied during the artifact-copy step, not as separate entities.

### Answering Follow-ups

Same envelope pattern as Step 4 — use the `round` number from the CLI's response:

```bash
stdin: '<envelope-json>' | $GP migrate --json
```

Continue answering rounds until the CLI presents a confirmation summary (Step 6).

## Step 6 — Confirmation

The CLI presents a state summary for review. Cross-check against the filesystem:

- **Entity counts:** Do the number of epics, quests, and slices match what you discovered?
- **Statuses:** Are the inferred statuses reasonable given the artifacts you observed?
- **Names:** Are clean names correct (prefixes properly stripped)?
- **Goals:** Are goals populated for all entities?

If everything looks correct, approve using the same envelope format — `notes` is required:

```bash
stdin: '{"round": N, "answers": [{"id": "confirmation", "data": {"approved": true, "notes": "All entities and statuses look correct."}}]}' | $GP migrate --json
```

If errors are spotted, reject with `reAnswerIds` listing the question IDs to re-answer:

```bash
stdin: '{"round": N, "answers": [{"id": "confirmation", "data": {"approved": false, "notes": "Epic status wrong for X.", "reAnswerIds": ["<questionId1>", "<questionId2>"]}}]}' | $GP migrate --json
```

Then re-answer the flagged questions when the CLI re-asks them.

## Step 7 — Report Completion

The CLI returns a completion response: `{ "status": "complete", "summary": { "projectName": "...", "epicCount": N, "questCount": N, "sliceCount": N } }`. Use this to report:

1. Migration is complete — include entity counts from the summary.
2. The backup directory (`<dir>-old-<timestamp>/`) contains the original pre-CLI directory and can be deleted after verification.
3. Suggest running verification commands:
   - `gp status --json` — overall project state
   - `gp task:list --json` — any open tasks that carried over
   - `gp decision:list --json` — active decisions
   - `gp learning:list --json` — accumulated learnings

## Step 8 — CLAUDE.md Path Audit

After migration, check whether CLAUDE.md contains `.goodplan/` paths that may have become stale due to the restructuring (e.g., flat `slices/` paths that moved under `epics/<name>/slices/`).

1. **Scan for `.goodplan/` references**:

   ```bash
   grep -n '\.goodplan/' CLAUDE.md 2>/dev/null
   ```

   If no matches or no CLAUDE.md, skip this step.

2. **Validate each path**: For each `.goodplan/` reference found, check whether the target still exists at that path. Paths that no longer resolve are stale. Also flag references to `.goodplan/tasks/` or `.goodplan/decisions/` — these directories do not exist. Tasks, decisions, and learnings are JSONL-managed entities accessed via CLI commands (`task:list`, `decision:list`, `learning:list`), not directory-based.

3. **Present findings to the user**: Show a table of stale paths with suggested replacements based on the new structure. Do NOT auto-edit CLAUDE.md — it is user-owned content.

   ```
   CLAUDE.md has .goodplan/ paths that may need updating after migration:

   | Line | Current Path | Status | Suggested Replacement |
   |------|-------------|--------|----------------------|
   | 12   | .goodplan/slices/sequencing.md | Not found | .goodplan/epics/<epic>/slices/sequencing.md |
   | 15   | .goodplan/architecture/foo.md | OK | (no change needed) |
   ```

4. **Offer to apply**: Ask the user if they want to apply the suggested replacements. Only update paths the user approves.

## Migration Heuristics

Rules for inferring entity status from pre-CLI project directory filesystem artifacts. All paths use `$PROJ_DIR` — substitute with whichever directory exists (see Step 4).

**Note:** Tasks, decisions, and learnings are JSONL-managed entries — they are not directory-based entities and do not need entity-level migration. The `gp migrate` command handles them internally.

### Status Inference Rules

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

These rules cover stable, terminal, or milestone statuses only. Intermediate workflow statuses (e.g., `exploring`, `defining-architecture`) are not expected in pre-CLI projects — they existed only in-memory during a skill run. If detected, map to the nearest stable predecessor (e.g., mid-refinement with `plan.md` but no `plan-refined.md` → `plan-created`).

For quests: check the quest's own directory for artifacts. Quests do not have slices in the CLI model.

### Prefix Stripping

Old-format directories use prefixes to indicate status:

| Prefix | Meaning | Strip for clean name? |
|--------|---------|----------------------|
| `~~archived~~` | Archived/completed entity | Yes — strip `~~archived~~` and any trailing numeric prefix (e.g., `~~archived~~01_initial` → `initial`) |
| `~~archived~~NN_` | Archived with sequence number | Yes — strip entire `~~archived~~NN_` prefix |
| `__active__` | Currently active entity | Yes — strip `__active__` prefix |

`~~archived~~` and `__active__` prefixes are mutually exclusive — they never co-occur on the same directory.

### sourcePath Convention

When answering migration questions, provide `sourcePath` as the relative path from `$PROJ_DIR` exactly as it appears on the filesystem (including any prefix). Examples: `epics/__active__my-epic`, `side-quests/fix-logging`, `slices/01-setup`. The CLI resolves `sourcePath` relative to the old project root for artifact copying. The clean name (with prefix stripped) goes in the `name` field.

### Ignored Items

- `.DS_Store` files — skip
- Files that are not directories — skip (only directories represent entities)
- Directories without `goal.md` — typically not valid entities, but report them and let the CLI decide

### Goal Extraction

For each entity directory, read `goal.md`:

- Use the first paragraph as the goal string
- If a `## What We're Building` section exists, prefer that section's content
- Keep the goal concise — one to three sentences
- Quest goals must be explicitly included in migration answers (they are not inferred)

## Error Handling

Follow the fail-fast pattern from `cli-interaction.md` Section 10.

### Validation Errors During Q&A

If the CLI returns `VALIDATION_MIGRATION_INVALID` (exit 2) for an answer (wrong round, missing answers, schema failures, invalid sourcePaths, invalid reAnswerIds):
1. Read the error message and `detail` field.
2. Fix the answer envelope to match the expected schema (check `round` number, question `id`s, and `data` shapes).
3. Resubmit.
4. If three consecutive validation failures occur on the same question, stop and explain: "Unable to construct a valid answer for this question. The CLI expects: [schema details]."
5. The CLI also enforces a correction limit (`VALIDATION_MIGRATION_CORRECTION_LIMIT`, exit 2) — max 3 correction rounds after the confirmation step. If hit, present the error and stop.

**Resume after failure:** If a migration fails mid-Q&A, calling `gp migrate --json` without stdin automatically resumes from `.migration-in-progress.json` — it returns the last unanswered round. No need to start over.

### State Errors

If the CLI returns `STATE_INVALID_TRANSITION` (exit 3):
- The migration may already be past this step. Check the error detail and proceed to the next step if appropriate.

### Intermediate Status Handling

Pre-CLI projects should not have intermediate workflow statuses (e.g., `exploring`, `defining-architecture`). These exist only during an active skill run. If detected, map to the nearest stable predecessor:

| Evidence | Map To |
|---|---|
| `architecture/` exists but incomplete | `created` (epic) |
| `plan.md` exists but refinement was in progress | `plan-created` (slice/quest) |
| Any other ambiguous state | Use the highest stable status supported by existing artifacts |
