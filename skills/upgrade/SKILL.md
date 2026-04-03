---
name: upgrade
description: >
  Upgrade project, convert to goodplan, import existing .project/ or .goodplan/ — converts
  a pre-CLI project directory to CLI-managed state, or re-migrates an
  already-initialized project to restructure state (e.g., flat slices to
  nested). Interactive Q&A guides the CLI through epic/quest/slice inventory,
  status inference, and artifact copy.
  Common triggers: 'upgrade', 'migrate', 'update state format', 'convert project'.
user-invocable: true
requires: gp >= 1.0.0
---

# Upgrade

Converts a pre-CLI project directory (`.project/` for legacy projects, `.goodplan/` for re-migration) into CLI-managed state, or re-migrates an already-initialized project to restructure state (e.g., moving flat `slices/` under `epics/<epic>/slices/`). The `gp migrate` command drives a multi-round Q&A workflow: it asks questions about the existing project structure, this skill reads the filesystem to answer them, and the CLI builds the new state. The CLI automatically detects whether the input is `.goodplan/` or `.project/` (legacy).

**When this skill triggers:** User says "upgrade my project", "convert to goodplan", "import .project/", "import .goodplan/", "re-migrate", "migrate", or the CLI returns `DATA_NO_PROJECT` and a project directory exists in the old format (no `project.json`).

## References

- `../_shared/references/cli-interaction.md` — Section 10: Error Handling (exit codes, error codes, recovery patterns). Note: Section 12 covers a different migration concept — scope to Section 10 only.

## Step 1 — Version Check

Verify CLI availability and compatibility:

```bash
"${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp" --version --json
```

If the command fails (not found, non-zero exit), stop: "The `gp` CLI is required but not found. Ensure the goodplan plugin is installed and enabled — run `/plugin` to check."

If the version doesn't satisfy `requires: gp >= 1.0.0`, stop: "This skill requires gp >= 1.0.0 but found X.Y.Z. Upgrade the CLI."

## Step 2 — Pre-flight Checks

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

If the user confirms, proceed to Step 3. The CLI now supports re-migration with timestamped backups.

If `project.json` does not exist, this is a first migration with a stale backup. Present:

> "Both a project directory and a backup exist. If the previous migration succeeded, the backup can be removed. If it failed, remove the project directory and rename the backup back, then retry."

Stop.

## Step 3 — Start Migration

Initiate the migration workflow:

```bash
gp migrate --json
```

Handle error responses:

| Error Code | Action |
|---|---|
| `DATA_NO_PROJECT` | "No `.goodplan/` or `.project/` directory found. Nothing to migrate." Stop. |
| Other errors | Present the full error to the user and stop. |

On success, the CLI returns the first round of questions. If the response includes a `warning` field (re-migration scenario), display the warning to the user but continue — the CLI proceeds to Q&A regardless.

Proceed to Step 4.

## Step 4 — Answer Inventory Questions

Before answering, load detailed heuristics:

1. Use the Read tool to load `references/migration-heuristics.md` (relative to this skill's directory).
2. **Determine the project directory.** The CLI's `gp migrate` command detects `.goodplan/` (re-migration) or `.project/` (legacy) automatically. Determine which exists and use that as `$PROJ_DIR` for all scanning commands below:
   ```bash
   PROJ_DIR=$([ -d .goodplan ] && echo ".goodplan" || echo ".project")
   ```
3. Read the `$PROJ_DIR/` filesystem to discover entities.

### Epic Discovery

```bash
ls -d $PROJ_DIR/epics/*/ 2>/dev/null
```

For each subdirectory:
- Strip prefix to derive clean name (see heuristics reference for prefix rules)
- Read `goal.md` for the goal string
- Check for status-indicating artifacts in priority order (see heuristics reference)
- Set `sourcePath` to the directory name as-is from the filesystem (including prefix)

### Quest Discovery

```bash
ls -d $PROJ_DIR/side-quests/*/ 2>/dev/null
```

For each subdirectory containing `goal.md`:
- Strip prefix to derive clean name
- Read `goal.md` for the goal string (quest goals must be explicitly provided)
- Check for status-indicating artifacts
- Set `sourcePath` to the directory name as-is

### Answering

Construct the answer JSON matching the question's `responseSchema`. Pipe answers to the CLI using `stdin:` parameter syntax for robustness with large payloads:

```bash
stdin: '<answer-json>' | gp migrate --json
```

For simple/short answers, `echo` piping is also acceptable:

```bash
echo '<answer-json>' | gp migrate --json
```

If the CLI returns validation errors (bad sourcePaths, schema failures), read the error message, fix the answer, and resubmit.

## Step 5 — Answer Follow-up Rounds

The CLI asks follow-up questions for each epic (slices, architecture, sequencing). For each round:

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

### Slice Sequencing

```bash
ls $PROJ_DIR/epics/<epicDir>/slices/sequencing.md 2>/dev/null
```

If `sequencing.md` exists, read it and extract the ordering information.

### Quest Sub-structure

Quests do not have slices in the CLI model. Any subdirectories within a quest (e.g., `plan-refining/`, `refinement/`, `research/`) are treated as markdown artifacts and copied during the artifact-copy step, not as separate entities.

### Answering Follow-ups

Same piping pattern as Step 4:

```bash
stdin: '<answer-json>' | gp migrate --json
```

Continue answering rounds until the CLI presents a confirmation summary (Step 6).

## Step 6 — Confirmation

The CLI presents a state summary for review. Cross-check against the filesystem:

- **Entity counts:** Do the number of epics, quests, and slices match what you discovered?
- **Statuses:** Are the inferred statuses reasonable given the artifacts you observed?
- **Names:** Are clean names correct (prefixes properly stripped)?
- **Goals:** Are goals populated for all entities?

If everything looks correct:

```bash
stdin: '{"approved": true}' | gp migrate --json
```

If errors are spotted, return corrections:

```bash
stdin: '{"approved": false, "reAnswerIds": ["<questionId1>", "<questionId2>"]}' | gp migrate --json
```

Then re-answer the flagged questions when the CLI re-asks them.

## Step 7 — Report Completion

After successful migration, tell the user:

1. Migration is complete.
2. The backup directory (`<dir>-old-<timestamp>/`) contains the original pre-CLI directory and can be deleted after verification.
3. Suggest running `gp status --json` to verify the new state.

## Step 8 — CLAUDE.md Path Audit

After migration, check whether CLAUDE.md contains `.goodplan/` paths that may have become stale due to the restructuring (e.g., flat `slices/` paths that moved under `epics/<name>/slices/`).

1. **Scan for `.goodplan/` references**:

   ```bash
   grep -n '\.goodplan/' CLAUDE.md 2>/dev/null
   ```

   If no matches or no CLAUDE.md, skip this step.

2. **Validate each path**: For each `.goodplan/` reference found, check whether the target still exists at that path. Paths that no longer resolve are stale.

3. **Present findings to the user**: Show a table of stale paths with suggested replacements based on the new structure. Do NOT auto-edit CLAUDE.md — it is user-owned content.

   ```
   CLAUDE.md has .goodplan/ paths that may need updating after migration:

   | Line | Current Path | Status | Suggested Replacement |
   |------|-------------|--------|----------------------|
   | 12   | .goodplan/slices/sequencing.md | Not found | .goodplan/epics/<epic>/slices/sequencing.md |
   | 15   | .goodplan/architecture/foo.md | OK | (no change needed) |
   ```

4. **Offer to apply**: Ask the user if they want to apply the suggested replacements. Only update paths the user approves.

## Error Handling

Follow the fail-fast pattern from `cli-interaction.md` Section 10.

### Validation Errors During Q&A

If the CLI returns `VALIDATION_INVALID_INPUT` (exit 2) for an answer:
1. Read the error message and `detail` field.
2. Fix the answer JSON to match the expected schema.
3. Resubmit.
4. If three consecutive validation failures occur on the same question, stop and explain: "Unable to construct a valid answer for this question. The CLI expects: [schema details]. Review `.migration-in-progress.json` manually if needed."

### State Errors

If the CLI returns `STATE_INVALID_TRANSITION` (exit 3):
- The migration may already be past this step. Check the error detail and proceed to the next step if appropriate.

### Rename Failures

The CLI now uses timestamped backup names (`<dir>-old-YYYYMMDD-HHmmss/`), so collisions with prior backups are extremely unlikely. If a rename failure occurs (sub-second collision):
- Tell the user: "Backup directory collision — wait a second and retry."

### Intermediate Status Handling

Pre-CLI projects should not have intermediate workflow statuses (e.g., `exploring`, `defining-architecture`). These exist only during an active skill run. If detected, map to the nearest stable predecessor:

| Evidence | Map To |
|---|---|
| `architecture/` exists but incomplete | `created` (epic) |
| `plan.md` exists but refinement was in progress | `plan-created` (slice/quest) |
| Any other ambiguous state | Use the highest stable status supported by existing artifacts |
