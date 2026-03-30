---
name: create-slices
description: >
  Reviews project context and interactively defines ordered slices with
  concrete, verifiable success criteria. When an active epic exists, writes
  slices within the epic's slices/ directory. Falls back to
  .goodplan/slices/ when no active epic. Common triggers: 'define
  slices', 'create slices', 'break this into slices', 'what should we build first', 'let's plan the
  slices', 'define slices', 'what's our build order', 'slices', 'what should
  we build', 'add a slice', 'new slice'.
requires: gp >= 1.0.0
---

# Define Slices

Interactive dialogue that proposes, iterates, and writes an ordered set of slices. Each slice must deliver a complete end-to-end flow that can be verified by actually executing the code — not just by unit or integration tests. Re-entrant — detects existing slices and offers to add, revise, or start fresh.

When an active epic exists, all slice output is scoped to the epic (see Step 0 for path resolution).

**Note:** Individual slices within epics do NOT have an explore phase. All exploration happens at the epic level via `/explore`. Narrow research during slice planning is handled by `/create-plan`'s existing research step.

## Step 0 — Version Check and Determine Slice Output Location

Read `../_shared/references/cli-interaction.md` for CLI interaction conventions and error handling patterns.

Verify CLI availability and compatibility:

```bash
gp --version --json
```

If the command fails (not found, non-zero exit), stop: "The `gp` CLI is required but not found. Install it with `bun run build` in the goodplan repo, or ensure it's on your PATH."

If the version doesn't satisfy `requires: gp >= 1.0.0`, stop: "This skill requires gp >= 1.0.0 but found X.Y.Z. Upgrade the CLI."

Also load `../_shared/references/epic-conventions.md` for epic directory structure and state machine.

Detect the active epic:

```bash
gp status --json
```

Check `.activeEpic` in the response. This field is `{ name: string, status: string } | undefined` — check for presence, not null.

Determine the slice output path based on the result:

- **Active epic found**: slices go to `.goodplan/epics/<activeEpic.name>/slices/`. Set `$SLICES_DIR` to this path. Set `$EPIC_DIR` to `.goodplan/epics/<activeEpic.name>/`. Set `$FLOW_SCOPE` to `"epics/<name>"`.

- **No active epic**: defaults to `.goodplan/slices/` (legacy/side-quest-only projects). Set `$SLICES_DIR` to `.goodplan/slices/`. Set `$EPIC_DIR` to empty. Set `$FLOW_SCOPE` to `"project"`.

Store these resolved paths for use throughout subsequent steps. All references to `.goodplan/slices/` in later steps should use `$SLICES_DIR` instead.

## Step 1 — Load References

Use the Read tool to load `references/guidance.md` (relative to this skill's directory). It contains conversation guidance, templates for sequencing.md and goal.md, re-entry rules, CLAUDE.md update instructions, and graceful stop cases.

Also load `../_shared/references/decisions-format.md` for the decisions format and Loading Protocol.

## Step 2 — Load Context

1. Read `.goodplan/idea.md`. If absent, use AskUserQuestion to tell the user: "No idea.md found — run /create-epic first to capture your project idea." Then stop.

2. When an active epic was detected in Step 0, read the epic's `goal.md` (`$EPIC_DIR/goal.md`). The epic goal informs how to decompose work into slices.

3. Read `.goodplan/conventions.md`. If absent, mention `/create-architecture` is recommended for richer context but proceed without it.

4. Load architecture files. When an active epic exists, read the epic's architecture first (`$EPIC_DIR/architecture/_overview.md` and other files in `$EPIC_DIR/architecture/`), then also read top-level `.goodplan/architecture/_overview.md` for current-reality context. When no epic, read `.goodplan/architecture/_overview.md` and other architecture files. If architecture is empty or absent, warn but proceed — ground slices in idea.md scope/constraints instead.

5. Extract the `## Subsystem Maturity` table from the primary architecture's `_overview.md`. If present, note which subsystems are at Maturing or Foundational maturity — these inform slice flagging in Step 6. If no maturity table exists, skip maturity-aware behavior in Step 6.

6. Load learnings via CLI: `gp learning:list --json`. Present summaries for context.

7. Load `.goodplan/decisions/` following the Loading Protocol in `decisions-format.md`: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Active decisions inform slice boundaries and ordering.

8. Check for existing slices by running: `ls $SLICES_DIR/sequencing.md $SLICES_DIR/*/goal.md 2>/dev/null` (using the resolved `$SLICES_DIR` from Step 0).

Display using the Context Load Summary Template from `../_shared/references/output-templates.md`. For the `**Context**` line: summarize epic/project scope and architecture state (e.g., "Epic initial: 4 subsystems defined, 2 active decisions").

## Step 3 — Re-entry Check

- **No existing slices** → proceed to Step 4.
- **Existing sequencing.md and/or goal.md files** → list what was found. Use AskUserQuestion with three options: "Add new slices to existing set" / "Revise existing slices" / "Start fresh"
  - **Add** → read existing sequencing.md and goal.md files as context. Propose only new slices. New slices get the next available NN prefix. The ordering in sequencing.md is the source of truth for execution order (not NN prefix). Merge new slices at appropriate positions and present the combined list for approval. Rewrite sequencing.md with merged list.
  - **Revise** → present existing slices. Before modifying any slice, check for downstream artifacts (`plan.md`, `plan-refined.md`, `refinement/`, `implementation/` inside the slice directory). If found, warn the user that downstream work exists. Iterate on changes. Directories are never deleted — only sequencing.md and goal.md files are overwritten.
  - **Start fresh** → proceed to Step 4 (existing files will be overwritten).

Follow calibration depth guidance in `../_shared/references/expertise-tracking.md`.

## Step 4 — Propose Slices

**Tracer bullet framing:** Each slice is a thin vertical cut through all integration layers — demoable and verifiable on its own. The first slice proves the architecture works end-to-end. Each subsequent slice adds a new verifiable flow. Avoid orderings that produce large amounts of unexercised code: if multiple slices must land before anything can actually run, the ordering is wrong.

1. Based on idea.md, architecture, and conventions, propose an initial set of slices. Ground each slice in specific architecture subsystems or flows. Order so each builds on the last. **Each slice must deliver a complete end-to-end flow** that the implementing agent can verify by actually running the code — executing scripts, calling APIs, interacting with a UI in the browser, or running the system and inspecting its output. If a proposed slice can't be verified this way, it's too thin or too abstract — merge it with another slice or redefine it.

2. Present using this template:

   ```
   ### Proposed Slices

   | # | Name | Objective |
   |---|------|-----------|
   | 1 | {name} | {one-line objective} |
   | ... | | |

   **Sequencing rationale**: {why this order}
   ```

3. Ask: "What needs changing? Add, remove, reorder, or rename slices. Or say 'looks good' to proceed to details."

4. Iterate. When user is satisfied, use AskUserQuestion: "Looks good — proceed to details" / "I have more changes".

Throughout Steps 4 and 6, when a durable decision emerges (see threshold in `decisions-format.md`), propose the decision text to the user and confirm via AskUserQuestion before writing. Create decisions via CLI:

```bash
echo '{"id":"<kebab-case-id>","domain":"<topic-area>","title":"<decision-title>","summary":"<brief-summary>"}' | gp decision:create --json
```

The CLI handles directory creation and state management. Track all decisions written during this run and summarize them in Step 10 (Done Summary).

## Step 4b — Three-Lens Evaluation

After drafting the initial slice ordering in Step 4 but before presenting alternatives to the user, evaluate the ordering against three lenses: **tracer bullet quality**, **risk front-loading**, and **observability front-loading**. See `references/guidance.md` → "Three-Lens Evaluation" for full criteria, iteration behavior, conflict handling, and output format.

1. Score the current ordering against all three lenses.
2. Iterate internally (cap at 3 iterations) to find improved orderings.
3. **Always present at least 2 alternative orderings** to the user, each with a prose trade-off summary and a compact comparison table (see guidance.md for format).
4. For projects with 2–3 slices or 10+ slices, adapt thresholds proportionally (see guidance.md).
5. Use AskUserQuestion to let the user pick their preferred ordering before proceeding.

## Step 5 — Write sequencing.md

Run `mkdir -p $SLICES_DIR/` before writing (using the resolved path from Step 0). Using the sequencing.md template from guidance.md, write `$SLICES_DIR/sequencing.md` with the **user's chosen ordering** from Step 4b — not the initial draft from Step 4.

## Step 6 — Define Each Slice

Re-load `references/guidance.md` (relative to this skill's directory) to ensure templates are in context.

For each slice in order:

1. Draft the full goal.md using the goal.md template from guidance.md.
2. If a maturity table was extracted in Step 2 sub-step 5, determine which subsystems this slice touches by mapping the slice's scope description against subsystem names in the maturity table. This is a best-effort name-match heuristic — if uncertain whether a subsystem is touched, include it (false positives are cheaper than false negatives; e.g., slice scope "add API validation" matches subsystem "api-contract"; "refactor error messages" is uncertain — include all potentially relevant subsystems). If the slice touches subsystems at Maturing or Foundational maturity, add a `## Maturity Note` section to the goal.md draft (after `## Scope Boundaries`): "This slice touches [subsystem] ([level]). Plan must include fitness function update steps and justify changes per the architecture proposal (for epic slices) or architecture definition (for side quests/top-level slices)." Developing subsystems do not trigger a Maturity Note — only Maturing and Foundational do.
3. Focus on **Verification** — this is the most important part of each goal.md. It has two parts: checkable assertions (checklist format) followed by a narrative live-testing paragraph. Each checkable assertion must specify: what to run (command, script, browser action, API call) and what the expected outcome is. Reject vague criteria like "works correctly" or "tests pass". The narrative paragraph must describe the minimum live end-to-end verification the implementing agent should perform after the slice is built. This is not unit tests — it's running the actual system and confirming the flow works. Examples: "Start the dev server, navigate to /dashboard in browser, create a new item, verify it appears in the list and persists after refresh." Or: "Run the CLI with `tool analyze src/`, verify it prints a summary table with at least 3 rows." Think about what a human would do to convince themselves this slice actually works, and write that down.
4. **Present slice context first**: State the slice number, name, and one-line objective before showing the draft. Example: "**Slice 2: Data Layer** — Set up the database schema and seed data. Here's the draft goal.md:" Then ask for corrections.
5. Iterate until satisfied.
6. Create the directory and write goal.md:
   ```bash
   mkdir -p $SLICES_DIR/NN-slice-name/
   ```
   Write goal.md with the Write tool.
7. Show progress using this template:

   ```
   **Progress**: Defined {N} of {M} slices. Next: {next slice name}.
   ```

**Graceful stop** — if the user says "that's enough" or "stop here" mid-slice:

Stops leave artifacts in place — no state writes. The written artifact files serve as resume markers (the skill already checks for existing files on re-entry). Handle by case:

- **(a) No files written** → tell user nothing was written. Stop.
- **(b) sequencing.md written but no goal.md files** → update CLAUDE.md to reference sequencing.md at `$SLICES_DIR/sequencing.md` (follow Step 8 logic). No CLI submit. Stop.
- **(c) sequencing.md + some goal.md files written** → update CLAUDE.md to reference sequencing.md at `$SLICES_DIR/sequencing.md` (follow Step 8 logic). No CLI submit. Stop.

## Step 7 — Finalize sequencing.md

If any slice names, ordering, or dependencies changed during Step 6 iteration, rewrite `$SLICES_DIR/sequencing.md` to reflect the final state.

## Step 7b — Register Slices via CLI

For each slice defined in Step 6, register it as a CLI entity so that `slice:list`, `slice:show`, and downstream skills can find it:

```bash
echo '{"name":"<NN-slice-name>","goal":"<one-line goal from goal.md>","epic":"<epic-name>"}' | gp slice:create --json
```

Where:
- `<NN-slice-name>` is the directory name (e.g., `01-provider-scaffold`)
- `<one-line goal>` is the first line of the slice's Behavior/Goal section
- `<epic-name>` is from `gp status --json` → `.activeEpic.name`

This creates the slice entity (at `.goodplan/epics/<epic>/slices/<name>/slice.json` for epic slices, or `.goodplan/slices/<name>/slice.json` for top-level slices) and registers it in the overview. Without this step, `slice:list` returns empty and per-slice planning/implementation cannot proceed.

**Note:** This step is independent of `submit-slices` (Step 9), which transitions the epic's phase. Both are required: `slice:create` registers individual entities, `submit-slices` advances the epic state machine.

## Step 8 — CLAUDE.md Update

Re-load `references/guidance.md` (relative to this skill's directory) for the CLAUDE.md update instructions. Also read `../create-architecture/references/guidance.md` for the full Project Context section format.

Add sequencing.md reference to CLAUDE.md. **Idempotency:** first check if sequencing.md is already referenced in CLAUDE.md — if so, verify the path is correct (should point to `$SLICES_DIR/sequencing.md`). If referencing a stale path (e.g., `.goodplan/slices/sequencing.md` when slices are now inside an epic), update the path.

The line to add to the "Read these" list (using the resolved `$SLICES_DIR`):
```
- `$SLICES_DIR/sequencing.md` — slice ordering and dependencies
```

For example, when the active epic name is `initial` (from `gp status --json` → `.activeEpic.name`), the line would be:
```
- `.goodplan/epics/initial/slices/sequencing.md` — slice ordering and dependencies
```

**Migration note:** Existing projects may have `.goodplan/slices/sequencing.md` or stale `__active__`-prefixed paths referenced in CLAUDE.md. When updating CLAUDE.md, check for and replace any stale references with the correct epic-scoped path using the epic name from `gp status --json`.

**Three-case logic for CLAUDE.md update:**

1. **No CLAUDE.md** → create it with the Write tool. Include the full Project Context section from guidance.md format, with sequencing.md referenced.

2. **CLAUDE.md exists but has no `## Project Context` section** → use the Edit tool to append the Project Context section at the end. Ensure a blank line before the new section header.

3. **Existing `## Project Context` section** → read CLAUDE.md fully. Extract old_string from `## Project Context` heading through (but not including) the next `## ` heading. If no subsequent `## ` heading exists, old_string runs through EOF. The old_string MUST include the `## Project Context` heading for unique matching. Add the sequencing.md reference line to the "Read these" list. Replace with the Edit tool. If Edit fails to match (e.g., trailing whitespace), fall back: read the full file, construct the replacement, and rewrite the entire CLAUDE.md with the Write tool.

After updating: "Updated CLAUDE.md so future sessions will see your slice sequencing."

## Step 8b — Expertise Check

Reflect on the conversation: did it reveal new information about the user's expertise? (CLAUDE.md `## Expertise` section is already in context.)

- **If yes**: Read `../_shared/references/expertise-tracking.md` for the recording protocol. Update `## Expertise` section in `~/.claude/CLAUDE.md` and write/update relevant `expertise_<domain>.md` memory file.
- **If no**: Skip silently — no Read, no output, no AskUserQuestion.

## Step 9 — Submit via CLI

For epic-scoped slice definition, submit the completed slices via CLI. The CLI handles state transitions and activity recording:

```bash
stdin: "" | gp submit-slices --epic <name> --json
```

Where `<name>` is the epic name from `gp status --json` → `.activeEpic.name`.

For non-epic scopes, no CLI mutation is needed — the written artifacts serve as the completion record.

## Step 10 — Done Summary

Display using the Done Summary Template (Variant A — Strict Fenced) from `../_shared/references/output-templates.md` with these skill-specific values:

- `{done_heading}`: `Slices Defined`
- `{done_fields}`: `**Total**: {N} slices`, `**Output**: {path to slices directory}`, `**Slices**: {numbered list of slice names}`
- `{next_step}`: `/create-plan` for {first unplanned slice name}

## Error Handling

If a Write tool call fails, retry once. If it fails again, inform the user of the specific file that could not be written and continue with remaining files.
