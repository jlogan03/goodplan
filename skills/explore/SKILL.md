---
name: explore
description: >
  Runs an iterative research/brainstorm/prototype loop scoped to an epic, a slice,
  or a side quest. Invoked when the user needs to investigate unknowns, explore options,
  or try approaches before committing to a plan or architecture. When an active epic
  exists, uses the epic's research/, brainstorm/, and prototypes/ directories.
  Common triggers: 'I need to research X', 'let's brainstorm', 'what are my options for...',
  'let's explore', 'what should I use for...', 'compare X vs Y', 'help me decide between...',
  'I'm not sure which approach...', 'skip exploration'.
---

# Explore

Iterative research/brainstorm/prototype loop. Facilitates open-ended investigation and captures whatever emerges.

## Step 0 — Load Epic Conventions

Use the Read tool to load `~/.claude/skills/_shared/references/epic-conventions.md` for epic directory structure and state machine awareness.

## Step 1 — Load Explore Logic and Decisions Format

Use the Read tool to load `references/explore-logic.md` (relative to this skill's directory). Use the scope path mapping, output templates, and mode behaviors from this file throughout all subsequent steps.

Also load `~/.claude/skills/_shared/references/decisions-format.md` for the decisions format and Loading Protocol. Load `.project/decisions/` following the Loading Protocol: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Active decisions provide context for exploration.

## Step 2 — Determine Scope

### If an argument was passed

Normalize the argument:

1. Strip trailing slashes.
2. If it is a full path starting with `.project/` (e.g. `.project/slices/03-explore`), use as-is.
3. If it is a relative path like `slices/03-explore`, `side-quests/foo`, or `epics/__active__foo`, prepend `.project/`.
4. If it is a short name (e.g. `03-explore`), search for a match:

```bash
ls -d .project/slices/*"$SHORT_NAME"* .project/side-quests/*"$SHORT_NAME"* .project/epics/*"$SHORT_NAME"* 2>/dev/null
```

If exactly one match, use it. If multiple, list them and ask the user to pick. If none, tell the user and ask for a valid scope.

**Reject epic slice paths**: If the resolved path matches `epics/*/slices/*` (e.g., `.project/epics/__active__foo/slices/02-bar`), tell the user: "Per-slice exploration is not supported for epic slices — all exploration happens at the epic level. Run `/explore` at the epic scope instead (e.g., `/explore epics/__active__foo`)." Then stop.

### If no argument was passed

Use the Read tool to read `.project/state.md`. Determine scope using resolution order:

1. **Work Stack top** — if the Work Stack has entries, take the top entry. Extract only the path portion (ignore any parenthetical metadata like `(interrupted ...)`). Use that as scope. If the path is an epic slice path (matches `epics/*/slices/*`), use the parent epic directory instead.
2. **Active Epic** — check for an active epic directory:
   ```bash
   ls -d .project/epics/__active__*/ 2>/dev/null
   ```
   If one exists and its state (per `epic-conventions.md` state machine) indicates it is in "Ready for exploration" or "Exploring" state, use the epic directory as scope.
3. **Active Slice** — if Active Slice is set and not `none`, use that as scope.
4. **Project level** — otherwise, scope is project-level.

### Validate and announce

Validate the resolved scope directory exists:

```bash
ls -d <scope-directory> 2>/dev/null
```

If it does not exist, list available scopes and prompt the user:

```bash
ls .project/slices/ .project/side-quests/ .project/epics/ 2>/dev/null
```

### Check for pre-existing exploration

Check for existing exploration artifacts at the resolved scope:

```bash
ls <scope-path>/explore-complete.md <scope-path>/explore-skipped.md 2>/dev/null
```

**If `explore-complete.md` or `explore-skipped.md` exists**: Count existing research and brainstorm files:

```bash
ls <scope-path>/research/ <scope-path>/brainstorm/ 2>/dev/null
```

Tell the user what exists, e.g.: "You have explore-complete.md referencing 3 research and 2 brainstorm files. Start a new exploration? (Prior research and brainstorm files will be kept.)" Wait for confirmation before proceeding.

**If no complete/skipped file but research/ or brainstorm/ files exist** (interrupted exploration): Summarize what has already been explored and offer: "It looks like a previous exploration was interrupted. Resume where you left off, or start fresh?"

### Announce scope

Tell the user the resolved scope:

> Scope: **<scope>**

Then proceed directly to Step 4 (the exploration loop). If the user responds with something like "skip" or "I don't need to explore", handle it as a skip request and proceed to Step 3 instead.

## Step 3 — Handle Skip

If the user explicitly requests to skip exploration (e.g., replies "skip", "I already know what to do", or invokes `/explore skip`):

1. Use the Read tool to load `~/.claude/skills/_shared/references/state-and-activity-formats.md` for state.md and activity-log.jsonl formats.
2. Ask for the reason why exploration is being skipped.
3. Write `explore-skipped.md` at the scope path using the template from `references/explore-logic.md`. Use the Write tool.
4. Generate a UTC timestamp:

```bash
date -u +%Y-%m-%dT%H:%M:%SZ
```

5. Update `.project/state.md` using the 4-section format from the shared formats reference. Set:
   - **Current Phase**: `explore-complete — skipped: <brief reason>`
   - **Active Slice**: unchanged from before
   - **Work Stack**: unchanged
   - **Next Step**: appropriate recommendation:
     - Epic: `/create-architecture`
     - Project-level (no epic): `/create-architecture`
     - Slice: `/create-plan`
     - Side quest: `/create-plan`

6. Append to `.project/activity-log.jsonl`:

```bash
echo '{"ts":"<timestamp>","phase":"explore","scope":"<scope>","status":"complete","summary":"Exploration skipped: <reason>"}' >> .project/activity-log.jsonl
```

Scope value mapping: project-level uses `"project"`, slice uses `"slices/<name>"`, quest uses `"side-quests/<name>"`, epic uses `"epics/<name>"`.

7. **Stop.** Do not continue to Step 4.

## Step 4 — Exploration Loop

Track which modes have been used and how many iterations have run (track both mentally). Each iteration:

### 4a. Mode selection

Use the AskUserQuestion tool to present mode options:

- **Project-level or epic**: offer Research, Brainstorm, Prototype as three options
- **Slice or quest**: offer Research and Brainstorm only; add "(Prototype available at project-level or epic scope only)" to the question text

On subsequent iterations, note previously used modes in the question text (e.g., "Pick a mode (already used: Research):").

If the user somehow selects Prototype at slice/quest scope, offer: "Want to switch to project or epic scope for this prototype, or pick Research or Brainstorm instead?"

Follow calibration depth guidance in `~/.claude/skills/_shared/references/expertise-tracking.md`.

### 4b. Run the selected mode

Execute the mode following the detailed behavior in `references/explore-logic.md`:

**Research**: Ask for topics, confirm output paths with user, spawn sub-agents (cap at 5 parallel), report results.

**Brainstorm**: Open conversation, follow-ups, capture at natural stopping point or backstop at 8-10 exchanges. Confirm slug and write.

**Prototype** (project or epic scope): Ask for approach description, derive name, confirm with user, create directory, run interactive session, write `summary.md`. If the prototype directory already exists, append a numeric suffix (e.g., `auth-flow-2/`).

### 4b2. Record durable decisions

During any mode (Research, Brainstorm, Prototype), if a durable decision emerges (see threshold in `decisions-format.md`), propose the decision text to the user and confirm via AskUserQuestion before writing. Run `mkdir -p .project/decisions/` before the first write. Write in the format specified by `decisions-format.md`. Track all decisions written during this run and summarize them in Step 5 and at the end of the skill run.

### 4c. Tally and continue prompt

After each mode completes, show a brief tally of all artifacts so far:

- If 4 or fewer artifacts, list them (e.g., "So far: researched auth-providers, brainstormed API design").
- If more than 4, summarize as counts (e.g., "So far: 3 research topics, 2 brainstorm sessions.").

Then use the AskUserQuestion tool to ask whether to keep going:

- At fewer than 5 iterations: question is "Keep exploring, or are we done?"
- At 5+ iterations: question is "Keep exploring, or are we done? (You've done N rounds — no pressure to keep going.)"

Offer two options: "Keep exploring" and "Done — write summary". If "Keep exploring" — loop back to 4a. If "Done" — proceed to Step 5.

## Step 5 — Write explore-complete.md

Using the `explore-complete.md` template from `references/explore-logic.md`, draft the content. Include:

- **Scope**: the resolved scope
- **What Was Explored**: list of research topics and brainstorm sessions completed
- **Key Conclusions**: synthesize key learnings, decisions, open questions
- **Artifacts**: list all files written, including any prior research/brainstorm files from earlier explorations (prior artifacts are preserved)

Show the draft to the user for approval. This is a milestone artifact that downstream skills depend on — do not write without explicit approval. If the user requests changes, revise and re-present until approved.

Use the Write tool to create `explore-complete.md` at the scope path after approval.

## Step 5b — Expertise Check

Reflect on the conversation: did it reveal new information about the user's expertise? (CLAUDE.md `## Expertise` section is already in context.)

- **If yes**: Read `~/.claude/skills/_shared/references/expertise-tracking.md` for the recording protocol. Update `## Expertise` section in `~/.claude/CLAUDE.md` and write/update relevant `expertise_<domain>.md` memory file.
- **If no**: Skip silently — no Read, no output, no AskUserQuestion.

## Step 6 — Write Back State

Use the Read tool to load `~/.claude/skills/_shared/references/state-and-activity-formats.md` for state.md and activity-log.jsonl formats.

Generate a UTC timestamp:

```bash
date -u +%Y-%m-%dT%H:%M:%SZ
```

Update `.project/state.md` using the 4-section format from the shared formats reference. Set:

- **Current Phase**: `explore-complete — <brief summary of what was explored>`
- **Active Slice**: unchanged from before
- **Work Stack**: unchanged
- **Next Step**: appropriate recommendation based on scope:
  - Epic: `/create-architecture`
  - Project-level (no epic): `/create-architecture`
  - Slice: `/create-plan`
  - Side quest: `/create-plan`

Append to `.project/activity-log.jsonl`:

```bash
echo '{"ts":"<timestamp>","phase":"explore","scope":"<scope>","status":"complete","summary":"<one-sentence summary>"}' >> .project/activity-log.jsonl
```

Scope value mapping: project-level uses `"project"`, slice uses `"slices/<name>"`, quest uses `"side-quests/<name>"`, epic uses `"epics/<name>"`.

After updating state, summarize all decisions written during this run (if any). List each decision file path and title.
