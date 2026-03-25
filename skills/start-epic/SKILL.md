---
name: start-epic
description: >
  Reviews an epic's architecture proposal, gets user approval, and activates
  the epic. The approval/activation gate for subsequent epics (not the first).
  Common triggers: 'start epic', 'activate epic', 'start epic',
  'approve epic', 'let's start building', 'approve the proposal', 'kick off epic',
  'review architecture proposal', 'ready to build', 'let's build this epic', 'activate this'.
---

# Start Epic

Reviews an epic's architecture proposal, gets user confirmation, and activates the epic by applying the `__active__` prefix. This is the approval gate for subsequent epics — the first epic (`__active__initial/`) skips this step entirely.

## Step 0 — Load References

Use the Read tool to load:

- `../_shared/references/epic-conventions.md` — epic directory structure, `__active__` prefix convention, state machine
- `../_shared/references/state-and-activity-formats.md` — state.md and activity-log.jsonl formats

## Step 1 — Resolve Epic

### If an argument was passed

Normalize the argument:

1. Strip trailing slashes.
2. If it starts with `.project/epics/`, strip that prefix to get the epic name.
3. If it starts with `epics/`, strip that prefix.
4. Otherwise, use the argument as the epic name directly.
5. If the resulting name starts with `__active__` or equals `initial`, tell the user: "That epic is already active — `/start-epic` is for activating subsequent epics that haven't been started yet." **Stop.**

Validate the epic exists:

```bash
ls -d .project/epics/"$NAME"/ 2>/dev/null
```

If the directory does not exist, list available epics and ask the user to pick:

```bash
ls .project/epics/ 2>/dev/null
```

### If no argument was passed

Scan for epics in `proposal-pending` state (have `architecture-proposal/` but no `approved.md`):

```bash
for dir in .project/epics/*/; do
  name=$(basename "$dir")
  # Skip __active__ prefixed directories
  [[ "$name" == __active__* ]] && continue
  # Check for proposal-pending state
  if [ -d "$dir/architecture-proposal" ] && [ ! -f "$dir/approved.md" ] && [ ! -f "$dir/abandoned.md" ]; then
    echo "$name"
  fi
done
```

Also scan for epics in `needs-architecture-proposal` state (have `explore-complete.md` or `explore-skipped.md`, no `architecture-proposal/`, no `architecture-proposal-skipped.md`):

```bash
for dir in .project/epics/*/; do
  name=$(basename "$dir")
  [[ "$name" == __active__* ]] && continue
  if { [ -f "$dir/explore-complete.md" ] || [ -f "$dir/explore-skipped.md" ]; } &&
     [ ! -d "$dir/architecture-proposal" ] &&
     [ ! -f "$dir/architecture-proposal-skipped.md" ] &&
     [ ! -f "$dir/approved.md" ] &&
     [ ! -f "$dir/abandoned.md" ]; then
    echo "$name (needs-architecture-proposal)"
  fi
done
```

- If exactly one epic is found across both scans, select it automatically and confirm with the user: "Found epic '<name>' in <state> state. Proceed with this one?"
- If multiple are found, list them and ask the user to choose.
- If none are found, tell the user: "No epics found in proposal-pending or needs-architecture-proposal state. Run `/create-epic` to create one, or `/create-architecture` to create a proposal."

## Step 1b — Check for Active Epic (Fail-Fast)

```bash
ls -d .project/epics/__active__*/ 2>/dev/null
```

If an `__active__` directory is found, extract the epic name (strip `__active__` prefix) and tell the user:

> Epic '<active-name>' is currently active. It must be completed or abandoned before a new epic can be activated.

**Stop.** Do not proceed with activation.

## Step 1c — Check for Re-entry

Check if `approved.md` already exists but the directory has not been renamed to `__active__`:

```bash
test -f .project/epics/<name>/approved.md && echo "approved"
```

If approved.md exists, the skill was previously interrupted after approval but before activation. Tell the user:

> Found existing approval for '<name>'. Resuming activation from where it left off.

Skip to Step 5c (Create Architecture Directory).

## Step 2 — Load Epic Context

Read the epic's files:

1. Read `.project/epics/<name>/goal.md`.
2. Check for `architecture-proposal/` directory:

```bash
ls .project/epics/<name>/architecture-proposal/ 2>/dev/null
```

3. If `architecture-proposal/` exists, read all files in it (especially `_overview.md` first, then remaining files).
4. Read exploration artifacts if present — `explore-complete.md` or `explore-skipped.md`.

## Step 3 — Validate State

Determine the epic's current state using the state machine from `epic-conventions.md` (Subsequent Epics section, first-match-wins).

**Valid states for this skill:**

- `proposal-pending` — has `architecture-proposal/`, no `approved.md`. Proceed to Step 5.
- `needs-architecture-proposal` — has explore marker, no proposal. Proceed to Step 4 (handle missing proposal).

**Invalid states — explain and stop:**

- `abandoned` — "This epic has been abandoned."
- `complete` — "This epic is already complete."
- `executing-slices` — "This epic is already active and executing slices."
- `needs-epic-completion` — "This epic has finished all slices. Run `/complete` to wrap it up."
- `needs-slice-planning` — "This epic is already approved. Run `/create-slices` next."
- `exploring` — "This epic is still being explored. Run `/explore` to continue, then `/create-architecture` to create a proposal."
- `ready-for-exploration` — "This epic hasn't been explored yet. Run `/explore` first, then `/create-architecture`."

Also check: if the epic directory already has the `__active__` prefix, tell the user it is already active.

## Step 4 — Handle Missing Architecture Proposal

This step runs only when the epic is in `needs-architecture-proposal` state (no `architecture-proposal/` directory).

Use the AskUserQuestion tool:

> This epic doesn't have an architecture proposal yet. What would you like to do?

Options:
- "Run /create-architecture to create a proposal first"
- "Skip architecture changes — this epic doesn't need them"

**If "Run /create-architecture"**: Tell the user to run `/create-architecture epics/<name>` and stop.

**If "Skip architecture changes"**: Write `.project/epics/<name>/architecture-proposal-skipped.md`:

```markdown
# Architecture Proposal Skipped

Epic does not require changes to the project architecture.

Skipped during: /start-epic
```

Then proceed directly to Step 5b (skip the proposal review, go straight to activation).

## Step 5 — Present Architecture Proposal

Read all files in `.project/epics/<name>/architecture-proposal/`. Present a structured summary to the user:

1. **Epic goal** — one-line summary from `goal.md`.
2. **Proposed architecture changes** — summarize each file in the proposal:
   - For `_overview.md`: key changes at a glance
   - For `<subsystem>-changes.md` files: what changes in each subsystem
   - For `new-<subsystem>.md` files: what new subsystems are introduced
3. **Relationship to current architecture** — if `.project/architecture/` exists, briefly note how the proposal relates to (extends, modifies, or replaces parts of) the current architecture.

Then use the AskUserQuestion tool:

> Review the architecture proposal above. How would you like to proceed?

Options:
- "Approve and activate"
- "Review files in detail first"
- "Reject — go back to exploration"

### If "Review files in detail first"

Present each proposal file in full, one at a time. After each file, ask if the user has comments. After all files have been reviewed, ask again:

> Ready to approve and activate, or reject?

Options: "Approve and activate" / "Reject — go back to exploration"

### If "Reject — go back to exploration"

Tell the user:

> Proposal not approved. The architecture proposal files remain in place for reference. Run `/explore epics/<name>` to continue researching, or `/create-architecture epics/<name>` to revise the proposal.

Update `.project/state.md` Next Step to: `Run /explore epics/<name> or /create-architecture epics/<name> to revise the proposal.`

**Stop.**

### If "Approve and activate"

Proceed to Step 5b.

## Step 5b — Write approved.md

This step is reached from two paths:
- **Proposal path** (Step 5 "Approve and activate"): Rationale draws from the user's confirmation and the proposal content. Architecture Proposal Files lists proposal contents.
- **Skip path** (Step 4 "Skip architecture changes"): Rationale draws from the user's confirmation and the epic goal only. Architecture Proposal Files is "N/A — architecture proposal skipped."

Write `.project/epics/<name>/approved.md`:

```markdown
# Epic Approved

## Decision
Approved for activation.

## Rationale
<1-2 sentences — from proposal path: summarize why the proposal was approved based on user confirmation and proposal content; from skip path: note that the epic was approved without architecture changes, based on user confirmation and epic goal>

## Architecture Proposal Files
<bulleted list of all files in architecture-proposal/, or "N/A — architecture proposal skipped" if reached via skip path>

## Notes
- Top-level `.project/architecture/` is NOT updated at this point — it reflects current reality
- Epic architecture is the target state; top-level is updated incrementally by `/complete` as slices land
```

## Step 5c — Create Epic Architecture Directory

This step creates the epic's `architecture/` directory — the target architecture that downstream skills (`/create-slices`, `/create-plan`, `/implement-plan`) will read from.

### Proposal path (architecture-proposal/ exists)

1. Create the `architecture/` directory:

```bash
mkdir -p .project/epics/<name>/architecture/
```

2. Copy `_overview.md` from the proposal:

```bash
cp .project/epics/<name>/architecture-proposal/_overview.md .project/epics/<name>/architecture/_overview.md
```

3. For each `<subsystem>-changes.md` file in the proposal: read it and the corresponding top-level `.project/architecture/<subsystem>-*.md` file (if it exists). Merge the proposed changes into the top-level file's structure to produce the target state, and write it to `architecture/<subsystem>-*.md` in the epic. If no top-level file exists, transform the changes file into a standalone architecture file.

4. For each `new-<subsystem>.md` file in the proposal: copy it to `architecture/<subsystem>.md` (strip the `new-` prefix) as-is — these are new subsystems that don't exist in top-level yet.

5. Copy any remaining top-level architecture files from `.project/architecture/` that are NOT being modified by the proposal (i.e., no corresponding `-changes.md` in the proposal). This ensures the epic architecture is complete, not just the delta.

### Skip path (architecture-proposal-skipped.md exists)

Copy the entire top-level architecture as the baseline — this epic doesn't change the architecture, but downstream skills still need the target files to read from:

```bash
cp -R .project/architecture/* .project/epics/<name>/architecture/ 2>/dev/null
```

If `.project/architecture/` doesn't exist or is empty, create a minimal `architecture/_overview.md`:

```markdown
# Architecture Overview

This epic does not introduce architecture changes. Architecture files will be populated as the project evolves.
```

### Verify

```bash
ls .project/epics/<name>/architecture/
```

At minimum, `_overview.md` must exist. If the directory is empty or missing, report the error and stop.

## Step 6 — Activate Epic

Rename the epic directory to add the `__active__` prefix:

```bash
mv .project/epics/<name> .project/epics/__active__<name>
```

Verify the rename succeeded:

```bash
ls -d .project/epics/__active__<name>/ 2>/dev/null
```

If the rename fails, report the error and stop.

## Step 7 — Update State

Generate a UTC timestamp:

```bash
date -u +%Y-%m-%dT%H:%M:%SZ
```

Update `.project/state.md` using the 4-section format:

- **Current Phase**: `start-epic complete — <name> approved and activated`
- **Active Slice**: `epics/<name>`
- **Work Stack**: unchanged
- **Next Step**: `Run /create-slices to break the epic into slices.`

Append to `.project/activity-log.jsonl`:

```bash
echo '{"ts":"<timestamp>","phase":"start-epic","scope":"epics/<name>","status":"complete","summary":"Epic <name> approved and activated"}' >> .project/activity-log.jsonl
```

## Done

Tell the user:

> Epic '<name>' is now active.
>
> - `.project/epics/__active__<name>/approved.md` — approval record
> - `.project/epics/__active__<name>/architecture/` — target architecture for this epic
> - `.project/state.md` — updated
> - `.project/activity-log.jsonl` — updated
>
> **Next**: Run `/create-slices` to break the epic into slices.

## Error Handling

- If any file write fails, retry once. If it fails again, report the specific file and stop.
- If the directory rename fails (e.g., target already exists), report the error with the specific paths and stop.
