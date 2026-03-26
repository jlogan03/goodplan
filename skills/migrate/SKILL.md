---
name: migrate
description: >
  Migrate project, convert to goodplan, import existing .project/ — converts
  a pre-CLI .project/ directory to CLI-managed state. Interactive Q&A guides
  the CLI through epic/quest/slice inventory, status inference, and artifact copy.
requires: goodplan >= 1.0.0
---

# Migrate

Converts a pre-CLI `.project/` directory into CLI-managed state. The `goodplan migrate` command drives a multi-round Q&A workflow: it asks questions about the existing project structure, this skill reads the filesystem to answer them, and the CLI builds the new state.

**When this skill triggers:** User says "migrate my project", "convert to goodplan", "import .project/", or the CLI returns `DATA_NO_PROJECT` and a `.project/` directory exists in the old format (no `project.json`).

## References

- `../_shared/references/cli-interaction.md` — Section 10: Error Handling (exit codes, error codes, recovery patterns). Note: Section 12 covers a different migration concept — scope to Section 10 only.

## Step 1 — Version Check

Verify CLI availability and compatibility:

```bash
goodplan --version --json
```

If the command fails (not found, non-zero exit), stop: "The `goodplan` CLI is required but not found. Install it with `bun run build` in the goodplan repo, or ensure it's on your PATH."

If the version doesn't satisfy `requires: goodplan >= 1.0.0`, stop: "This skill requires goodplan >= 1.0.0 but found X.Y.Z. Upgrade the CLI."

## Step 2 — Pre-flight Checks

Check for partial migration from a previous attempt:

```bash
ls -d .project-old/ 2>/dev/null
```

**If `.project-old/` exists but `.project/` does not:** A previous migration attempt may have failed mid-run. The CLI renames `.project/` to `.project-old/` during migration. Tell the user:

> "Found `.project-old/` but no `.project/`. A previous migration may have failed. Rename `.project-old/` back to `.project/` and retry."

Stop.

**If both `.project/` and `.project-old/` exist:** A previous migration's rename step left a backup. Tell the user:

> "Both `.project/` and `.project-old/` exist. If the migration succeeded, remove `.project-old/`. If it failed, remove `.project/` and rename `.project-old/` back to `.project/`, then retry."

Stop.

## Step 3 — Start Migration

Initiate the migration workflow:

```bash
goodplan migrate --json
```

Handle error responses:

| Error Code | Action |
|---|---|
| `STATE_ALREADY_INITIALIZED` | "This project is already CLI-managed (has `project.json`). No migration needed." Stop. |
| `DATA_NO_PROJECT` | "No `.project/` directory found. Nothing to migrate." Stop. |
| Other errors | Present the full error to the user and stop. |

On success, the CLI returns the first round of questions. Proceed to Step 4.

## Step 4 — Answer Inventory Questions

Before answering, load detailed heuristics:

1. Use the Read tool to load `references/migration-heuristics.md` (relative to this skill's directory).
2. Read the `.project/` filesystem to discover entities.

### Epic Discovery

```bash
ls -d .project/epics/*/ 2>/dev/null
```

For each subdirectory:
- Strip prefix to derive clean name (see heuristics reference for prefix rules)
- Read `goal.md` for the goal string
- Check for status-indicating artifacts in priority order (see heuristics reference)
- Set `sourcePath` to the directory name as-is from the filesystem (including prefix)

### Quest Discovery

```bash
ls -d .project/side-quests/*/ 2>/dev/null
```

For each subdirectory containing `goal.md`:
- Strip prefix to derive clean name
- Read `goal.md` for the goal string (quest goals must be explicitly provided)
- Check for status-indicating artifacts
- Set `sourcePath` to the directory name as-is

### Answering

Construct the answer JSON matching the question's `responseSchema`. Pipe answers to the CLI using `stdin:` parameter syntax for robustness with large payloads:

```bash
stdin: '<answer-json>' | goodplan migrate --json
```

For simple/short answers, `echo` piping is also acceptable:

```bash
echo '<answer-json>' | goodplan migrate --json
```

If the CLI returns validation errors (bad sourcePaths, schema failures), read the error message, fix the answer, and resubmit.

## Step 5 — Answer Follow-up Rounds

The CLI asks follow-up questions for each epic (slices, architecture, sequencing). For each round:

### Slice Discovery

```bash
ls -d .project/epics/<epicDir>/slices/*/ 2>/dev/null
```

For each slice subdirectory:
- Strip any numeric prefix (e.g., `01-setup` → `setup`, or keep as-is if the name is meaningful)
- Read `goal.md` for the goal
- Infer status from artifacts (see heuristics reference)

### Slice Sequencing

```bash
ls .project/epics/<epicDir>/slices/sequencing.md 2>/dev/null
```

If `sequencing.md` exists, read it and extract the ordering information.

### Quest Sub-structure

Quests do not have slices in the CLI model. Any subdirectories within a quest (e.g., `plan-refining/`, `refinement/`, `research/`) are treated as markdown artifacts and copied during the artifact-copy step, not as separate entities.

### Answering Follow-ups

Same piping pattern as Step 4:

```bash
stdin: '<answer-json>' | goodplan migrate --json
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
stdin: '{"approved": true}' | goodplan migrate --json
```

If errors are spotted, return corrections:

```bash
stdin: '{"approved": false, "reAnswerIds": ["<questionId1>", "<questionId2>"]}' | goodplan migrate --json
```

Then re-answer the flagged questions when the CLI re-asks them.

## Step 7 — Report Completion

After successful migration, tell the user:

1. Migration is complete.
2. `.project-old/` contains the original pre-CLI directory and can be deleted after verification.
3. Suggest running `goodplan status --json` to verify the new state.

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

If the final rename step fails because `.project-old/` already exists:
- Tell the user: "Cannot rename `.project/` to `.project-old/` — the backup directory already exists. Remove or rename the existing `.project-old/` and retry."

### Intermediate Status Handling

Pre-CLI projects should not have intermediate workflow statuses (e.g., `exploring`, `defining-architecture`). These exist only during an active skill run. If detected, map to the nearest stable predecessor:

| Evidence | Map To |
|---|---|
| `architecture/` exists but incomplete | `created` (epic) |
| `plan.md` exists but refinement was in progress | `plan-created` (slice/quest) |
| Any other ambiguous state | Use the highest stable status supported by existing artifacts |
