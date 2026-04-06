---
name: start-epic
description: This skill should be used when the user wants to activate an epic after architecture and slices are defined. Presents architecture for user review, then activates the epic. Common triggers: 'start epic', 'activate epic', 'approve epic', 'let's start building', 'approve the proposal', 'kick off epic', 'review architecture proposal', 'ready to build', 'let's build this epic', 'activate this'.
user-invocable: true
requires: gp >= 1.0.0
---

# Start Epic

## Shared References

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md
@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-discipline.md
@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md

**Context Discipline:** This skill reads architecture files to present them for user approval. This is a legitimate orchestrator exception — the skill's purpose is to present architecture for user review.

## Step 0 — Version Check

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

## Step 1 — Scope Resolution

Determine which epic to activate.

### If an argument was passed

Use the argument as the epic name (strip leading `epics/` or `.goodplan/epics/` prefixes and trailing slashes if present).

Verify the epic exists:

```bash
$GP epic:show --epic <name> --json
```

If the command fails (epic not found), list available epics and ask the user to pick:

```bash
$GP epic:list --json
```

### If no argument was passed

List all epics and find one in `slices-refined` status:

```bash
$GP epic:list --json
```

- If exactly one epic is in `slices-refined` status, select it automatically and confirm with the user: "Found epic '<name>' ready for activation. Proceed?" If the user declines, list all epics with their statuses and let the user choose, or stop if none are suitable.
- If multiple epics are in `slices-refined` status, list them and use AskUserQuestion to ask the user to choose.
- If no epic is in `slices-refined` status, check for an `activated` epic (already done). If found, tell the user: "Epic '<name>' is already activated. Run `/gp:plan-slice` to plan the next slice, or `/gp:status` to see progress."
- If no epics match any actionable status, list existing epics with their statuses and suggest per-status next steps (same mapping as Step 2). If no epics exist at all, tell the user: "No epics found. Run `/gp:create-epic` to create one." **Stop.**

## Step 2 — Pre-activation Check

Get full epic details (reuse the `epic:show` response from Step 1 if already retrieved for this epic):

```bash
$GP epic:show --epic <name> --json
```

Verify the status is `slices-refined`. If not, handle by status:

- **`activated`** — "Epic '<name>' is already activated. Run `/gp:plan-slice` to plan the next slice, or `/gp:status` to see progress." **Stop.**
- **`created`** — "Epic '<name>' needs exploration and architecture first. Run `/gp:create-epic <name>` to continue the pipeline (it resumes from the current phase)." **Stop.**
- **`explored`** — "Epic '<name>' needs architecture and slices. Run `/gp:create-epic <name>` to continue (resumes at the architecture phase)." **Stop.**
- **`slices-defined`** — "Epic '<name>' has slices that need refinement. Run `/gp:create-epic <name>` to continue (resumes at the slices refinement phase)." **Stop.**
- **In-progress statuses** — use this mapping to suggest the correct skill:

  | Status | Skill |
  |---|---|
  | `exploring` | `/gp:explore` |
  | `defining-architecture` | `/gp:create-epic <name>` (resumes at architecture phase) |
  | `architecture-defined` | `/gp:create-epic <name>` (resumes at architecture refinement) |
  | `refining-architecture` | `/gp:create-epic <name>` (resumes at architecture refinement) |
  | `architecture-refined` | `/gp:create-epic <name>` (resumes at slices Q&A) |
  | `defining-slices` | `/gp:create-epic <name>` (resumes at slices phase) |
  | `refining-slices` | `/gp:create-epic <name>` (resumes at slices refinement) |

  Report: "{status} is in progress. Run `{skill}` to continue." **Stop.**
- **Terminal statuses** (`completed`, `abandoned`) — "This epic is already {status}." **Stop.** Do not suggest running another skill.
- **Any other status** — Report the current status and suggest running `/gp:status` for guidance. **Stop.**

## Step 3 — Pre-activation Guard

Check the following guards in order (most actionable first):

1. **No other epic active**: Check `$GP status --json` for `.activeEpic`. If another epic is already active, tell the user: "Epic '<active-epic-name>' is currently active. Complete or abandon it before activating a new epic." **Stop.**

2. **Architecture**: If `artifacts.architectureDefined` is `false` (from Step 2's `epic:show` response), tell the user: "Architecture not found — run `/gp:create-epic <name>` to continue the pipeline (it resumes at the architecture phase)." **Stop.**

3. **Verifications**: If `verifications` is empty or missing (from Step 2's `epic:show` response), tell the user: "No verification criteria defined for this epic. Add criteria, e.g.:
   ```bash
   echo '{"verification":{"description":"All unit tests pass","status":"pending","addedDuring":"pre-activation","modifiedDuring":null}}' | $GP epic:add-verification --epic <name> --json
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
4. **Slice count** — how many slices are defined. Query `$GP slice:list --epic <name> --json` and use `.total` from the response.

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
$GP epic:activate --epic <name> --json
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
