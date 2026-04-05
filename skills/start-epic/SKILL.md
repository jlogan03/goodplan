---
name: start-epic
description: >
  Reviews an epic's architecture, gets user approval, and activates the epic
  via the CLI. Uses gp epic:show / epic:activate for all state operations.
  Common triggers: 'start epic', 'activate epic',
  'approve epic', 'let's start building', 'approve the proposal', 'kick off epic',
  'review architecture proposal', 'ready to build', 'let's build this epic', 'activate this'.
user-invocable: true
requires: gp >= 1.0.0
---

# Start Epic

Reviews an epic's architecture, gets user approval, and activates the epic. All state checks and mutations go through the CLI — no direct filesystem reads of state files or directory manipulation.

**Context Discipline:** This skill reads architecture files to present them for user approval. This is a legitimate orchestrator exception — the skill's purpose is to present architecture for user review.

## Step 0 — Version Check

```bash
gp --version --json
```

If the command fails or the CLI is not available, tell the user: "The goodplan CLI is not available. Ensure the goodplan plugin is installed." **Stop.**

If the version does not satisfy `>= 1.0.0`, tell the user:

> This skill requires gp >= 1.0.0 but found <version>. Upgrade the CLI.

**Stop.**

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

- If exactly one epic is in `slices-refined` status, select it automatically and confirm with the user: "Found epic '<name>' ready for activation. Proceed?"
- If multiple epics are in `slices-refined` status, list them and use AskUserQuestion to ask the user to choose.
- If no epic is in `slices-refined` status, check for an `activated` epic (already done). If found, tell the user: "Epic '<name>' is already activated. Run `/gp:plan-slice` to plan the next slice, or `/gp:status` to see progress."
- If no epics match any actionable status, tell the user: "No epics found ready for activation. Run `/gp:create-epic` to create and prepare one." **Stop.**

## Step 2 — Pre-activation Check

Get full epic details:

```bash
gp epic:show --epic <name> --json
```

Verify the status is `slices-refined`. If not, handle by status:

- **`activated`** — "Epic '<name>' is already activated. Run `/gp:plan-slice` to plan the next slice, or `/gp:status` to see progress." **Stop.**
- **`created`** — "Epic '<name>' needs exploration and architecture first. Run `/gp:explore` to research, then `/gp:create-epic` to define architecture and slices." **Stop.**
- **`explored`** — "Epic '<name>' needs architecture and slices. Run `/gp:create-epic` to define architecture and slices." **Stop.**
- **`slices-defined`** — "Epic '<name>' has slices that need refinement. Run `/gp:create-epic` to refine slices before activation." **Stop.**
- **In-progress statuses** (`exploring`, `defining-architecture`, `architecture-defined`, `refining-architecture`, `architecture-refined`, `defining-slices`, `refining-slices`) — Check the `nextCommands` field from the `epic:show` JSON response and report: "{Phase} is in progress. Run `/gp:{appropriate-skill}` to continue." Use `nextCommands` to determine the correct skill name. **Stop.**
- **Terminal statuses** (`completed`, `abandoned`) — "This epic is already {status}." **Stop.** Do not suggest running another skill.
- **Any other status** — Check `nextCommands` from the `epic:show` JSON response. If available, suggest the next command. Otherwise, report the current status and what's needed. **Stop.**

## Step 3 — Pre-activation Guard

Check the `artifacts.architectureDefined` field from the `epic:show` JSON response (already retrieved in Step 2).

If `architectureDefined` is `false`, tell the user: "Architecture not found — run `/gp:create-epic` to set up architecture before activation." **Stop.**

This is a belt-and-suspenders UX guard — `epic:activate` already requires `slices-refined` status which implies architecture exists, but this check gives a better error message if state is inconsistent.

## Step 4 — Present Architecture

Load architecture file paths from the `epic:show` JSON response — use the `name` field to derive the path `.goodplan/epics/<name>/architecture/` (epic-scoped architecture, not `gp status` which returns all architecture files).

Read the epic's architecture files:
1. Read `architecture/_overview.md` first for the high-level view.
2. Read any additional architecture files in the epic's `architecture/` directory.

Present a structured summary to the user:
1. **Epic goal** — one-line summary.
2. **Architecture overview** — key subsystems and design decisions from `_overview.md`.
3. **Additional architecture files** — summarize each additional file's key points.
4. **Slice count** — how many slices are defined for this epic.

## Step 5 — User Approval

Use the AskUserQuestion tool:

> Review the architecture summary above. How would you like to proceed?

Options:
- "Approve this architecture and activate the epic"
- "Request changes — I need to revise the architecture"
- "Cancel"

### If "Request changes"

Tell the user: "Run `/gp:create-epic` to revise the architecture and slices." **Stop.**

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
