---
name: start-epic
description: Reviews an epic's architecture, gets user approval, and activates the epic via the CLI. Uses gp epic:show / epic:activate for all state operations. Common triggers: 'start epic', 'activate epic', 'approve epic', 'let's start building', 'approve the proposal', 'kick off epic', 'review architecture proposal', 'ready to build', 'let's build this epic', 'activate this'.
user-invocable: true
requires: gp >= 1.0.0
---

# Start Epic

**Context Discipline:** This skill reads architecture files to present them for user approval. This is a legitimate orchestrator exception — the skill's purpose is to present architecture for user review.

## Step 0 — Version Check

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

## Step 1 — Scope Resolution

Determine which epic to activate.

### If an argument was passed

Use the argument as the epic name (strip leading `epics/` or `.goodplan/epics/` prefixes and trailing slashes if present).

Verify the epic exists:

```bash
gp epic:show --epic <name> --json
```

If the command fails (epic not found), list available epics and ask the user to pick:

```bash
gp epic:list --json
```

### If no argument was passed

List all epics and find one in `slices-refined` status:

```bash
gp epic:list --json
```

- If exactly one epic is in `slices-refined` status, select it automatically and confirm with the user: "Found epic '<name>' ready for activation. Proceed?" If the user declines, list all epics with their statuses and let the user choose, or stop if none are suitable.
- If multiple epics are in `slices-refined` status, list them and use AskUserQuestion to ask the user to choose.
- If no epic is in `slices-refined` status, check for an `activated` epic (already done). If found, tell the user: "Epic '<name>' is already activated. Run `/gp:plan-slice` to plan the next slice, or `/gp:status` to see progress."
- If no epics match any actionable status, list existing epics with their statuses and suggest per-status next steps (same mapping as Step 2). If no epics exist at all, tell the user: "No epics found. Run `/gp:create-epic` to create one." **Stop.**

## Step 2 — Pre-activation Check

Get full epic details (reuse the `epic:show` response from Step 1 if already retrieved for this epic):

```bash
gp epic:show --epic <name> --json
```

Verify the status is `slices-refined`. If not, handle by status:

- **`activated`** — "Epic '<name>' is already activated. Run `/gp:plan-slice` to plan the next slice, or `/gp:status` to see progress." **Stop.**
- **`created`** — "Epic '<name>' needs exploration and architecture first. Run `/gp:explore` to research, then `/gp:create-architecture` to define architecture, then `/gp:create-slices` to define slices." **Stop.**
- **`explored`** — "Epic '<name>' needs architecture and slices. Run `/gp:create-architecture` to define architecture, then `/gp:create-slices` to define slices." **Stop.**
- **`slices-defined`** — "Epic '<name>' has slices that need refinement. Run `/gp:refine-slices` to refine slices before activation." **Stop.**
- **In-progress statuses** — use this mapping to suggest the correct skill:

  | Status | Skill |
  |---|---|
  | `exploring` | `/gp:explore` |
  | `defining-architecture` | `/gp:create-architecture` |
  | `architecture-defined` | `/gp:refine-architecture` |
  | `refining-architecture` | `/gp:refine-architecture` |
  | `architecture-refined` | `/gp:create-slices` |
  | `defining-slices` | `/gp:create-slices` |
  | `refining-slices` | `/gp:refine-slices` |

  Report: "{status} is in progress. Run `{skill}` to continue." **Stop.**
- **Terminal statuses** (`completed`, `abandoned`) — "This epic is already {status}." **Stop.** Do not suggest running another skill.
- **Any other status** — Report the current status and suggest running `/gp:status` for guidance. **Stop.**

## Step 3 — Pre-activation Guard

Check the following guards in order (most actionable first):

1. **No other epic active**: Check `gp status --json` for `.activeEpic`. If another epic is already active, tell the user: "Epic '<active-epic-name>' is currently active. Complete or abandon it before activating a new epic." **Stop.**

2. **Architecture**: If `artifacts.architectureDefined` is `false` (from Step 2's `epic:show` response), tell the user: "Architecture not found — run `/gp:create-architecture` to set up architecture before activation." **Stop.**

3. **Verifications**: If `verifications` is empty or missing (from Step 2's `epic:show` response), tell the user: "No verification criteria defined for this epic. Add criteria, e.g.:
   ```bash
   echo '{"verification":{"description":"All unit tests pass","status":"pending","addedDuring":"pre-activation","modifiedDuring":null}}' | gp epic:add-verification --epic <name> --json
   ```
   " **Stop.**

These are UX guards — `epic:activate` enforces these via state machine errors (`STATE_MISSING_VERIFICATIONS`, `STATE_EPIC_ALREADY_ACTIVE`), but checking upfront gives better error messages.

## Step 4 — Present Architecture

Load architecture file paths from the `epic:show` JSON response — use the `name` field to derive the path `.goodplan/epics/<name>/architecture/` (epic-scoped architecture, not `gp status` which returns all architecture files).

Read the epic's architecture files:
1. Read `architecture/_overview.md` first for the high-level view (guaranteed to exist — Step 3 verified `architectureDefined`).
2. Read any additional architecture files in the epic's `architecture/` directory.

Present a structured summary to the user:
1. **Epic goal** — one-line summary.
2. **Architecture overview** — key subsystems and design decisions from `_overview.md`.
3. **Additional architecture files** — summarize each additional file's key points.
4. **Slice count** — how many slices are defined. Query `gp slice:list --epic <name> --json` and use `.total` from the response.

## Step 5 — User Approval

Use the AskUserQuestion tool:

> Review the architecture summary above. How would you like to proceed?

Options:
- "Approve this architecture and activate the epic"
- "Request changes — I need to revise the architecture"
- "Cancel"

### If "Request changes"

Tell the user: "The epic is in `slices-refined` status — the state machine does not allow backward revision from here. Options: (1) Activate and address changes in implementation slices, (2) Abandon this epic and create a new one with revised architecture." **Stop.**

### If "Cancel"

Tell the user: "Activation cancelled. The epic remains in its current state." **Stop.**

### If "Approve this architecture and activate the epic"

Proceed to Step 6.

## Step 6 — Activate

```bash
gp epic:activate --epic <name> --json
```

Verify the response shows `activated` status. If the command fails, report the error and **stop.**

## Step 7 — Done Summary

Display:

> Epic '<name>' is now activated.
>
> - **Slices**: <slice-count> slices ready for planning
> - **Status**: activated
>
> **Next**: Run `/gp:plan-slice` to create a plan for the first slice, or `/gp:status` to see the full slice list.
