---
name: explore
description: This skill should be used when the user needs to research, brainstorm, or prototype before committing to a plan or architecture. Runs an iterative exploration loop scoped to a project, epic, slice, or quest. When an active epic exists, uses the epic's research/, brainstorm/, and prototypes/ directories. Common triggers: 'I need to research X', 'let's brainstorm', 'what are my options for...', 'let's explore', 'what should I use for...', 'compare X vs Y', 'help me decide between...', 'I'm not sure which approach...', 'skip exploration'.
user-invocable: true
requires: gp >= 1.0.0
---

# Explore

Iterative research/brainstorm/prototype loop. Facilitates open-ended investigation and captures whatever emerges.

## Step 0 — Version Check and Context Loading

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md
@${CLAUDE_PLUGIN_ROOT}/skills/_references/epic-conventions.md
@${CLAUDE_PLUGIN_ROOT}/skills/_references/expertise-tracking.md
@${CLAUDE_PLUGIN_ROOT}/skills/_references/output-templates.md

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

## Step 1 — Load Decisions Format

@${CLAUDE_PLUGIN_ROOT}/skills/_references/decisions-format.md

Load `.goodplan/decisions/` following the Loading Protocol: glob `*.md`, skip superseded, flag any with `revisiting` status to the user. Active decisions provide context for exploration.

## Step 2 — Determine Scope

### If an argument was passed

Normalize the argument:

1. Strip trailing slashes.
2. If it is a full path starting with `.goodplan/` (e.g. `.goodplan/slices/03-explore` or `.goodplan/epics/entity-restructuring/slices/02-rpc`), use as-is.
3. If it is a relative path like `slices/03-explore`, `quests/foo`, or `epics/foo`, prepend `.goodplan/`.
4. If it is a short name (e.g. `03-explore`), search for a match:

```bash
ls -d .goodplan/slices/*"$SHORT_NAME"* .goodplan/epics/*/slices/*"$SHORT_NAME"* .goodplan/quests/*"$SHORT_NAME"* .goodplan/epics/*"$SHORT_NAME"* 2>/dev/null
```

If exactly one match, use it. If multiple, list them and ask the user to pick. If none, tell the user and ask for a valid scope.

**Reject epic slice paths**: If the resolved path matches `epics/*/slices/*` (e.g., `.goodplan/epics/foo/slices/02-bar`), tell the user: "Per-slice exploration is not supported for epic slices — all exploration happens at the epic level. Run `/gp:explore` at the epic scope instead (e.g., `/gp:explore epics/foo`)." Then stop.

### If no argument was passed

Query current project state for scope resolution:

```bash
$GP status --json
```

Determine scope using resolution order (check fields in the status response):

1. **Active Slice** — if `.activeSlice` is present (not `undefined`/absent): if `.activeEpic` also exists, reject and redirect: "Per-slice exploration is not supported for epic slices — all exploration happens at the epic level. Switching to epic scope." Use `.goodplan/epics/<activeEpic.name>/` as scope instead. If no active epic, use `.goodplan/slices/<activeSlice.name>/` as scope.
2. **Active Quest** — if `.activeQuest` is present, use `.goodplan/quests/<activeQuest.name>/` as scope.
3. **Active Epic** — if `.activeEpic` is present, use `.goodplan/epics/<activeEpic.name>/` as scope. If the epic's status is `created` or `exploring`, it is ready for exploration.
4. **Project level** — if no active entities, scope is project-level (`.goodplan/`).

> **Note:** These fields are `{ name: string, status: string } | undefined` — check for presence, not null.

### Validate and announce

Validate the resolved scope directory exists:

```bash
ls -d <scope-directory> 2>/dev/null
```

If it does not exist, list available scopes and prompt the user:

```bash
ls .goodplan/slices/ .goodplan/epics/*/slices/ .goodplan/quests/ .goodplan/epics/ 2>/dev/null
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

**If no complete/skipped file but research/ or brainstorm/ files exist** (interrupted exploration): List the existing artifact filenames and offer: "It looks like a previous exploration was interrupted. These artifacts exist: {list}. Continue exploring (prior artifacts are preserved, start from mode selection), or write explore-complete.md with what you have?" If user chooses to write explore-complete.md, proceed to Step 5 (skip Step 4).

### Announce scope

Tell the user the resolved scope:

> Scope: **<scope>**

Then proceed directly to Step 4 (the exploration loop). If the user responds with something like "skip" or "I don't need to explore", handle it as a skip request and proceed to Step 3 instead.

## Step 3 — Handle Skip

If the user explicitly requests to skip exploration (e.g., replies "skip", "I already know what to do", or invokes `/gp:explore skip`):

1. Ask for the reason why exploration is being skipped.
2. Write `explore-skipped.md` at the scope path using the template from the **Explore Logic Reference** section below. Use the Write tool.
3. **For epic scope**: Complete the exploration phase via CLI. The `epic:explore-conclude` command handles both skip (from `created` state -- without ever calling `epic:explore-start`) and normal completion (from `exploring`).

   ```bash
   $GP epic:explore-conclude --epic <name> --json
   ```

   This concludes the exploration and transitions the epic to explored (P2).

4. **For quest scope**: Same as epic — complete the exploration phase via CLI:

   ```bash
   stdin: "" | $GP submit-explore --quest <name> --json
   ```

5. **For non-epic/non-quest scopes** (project, slice): Leave the `explore-skipped.md` artifact in place as the record — no CLI mutation is needed.

6. **Stop.** Do not continue to Step 4.

## Step 4 — Exploration Loop

Track which modes have been used and how many iterations have run (track both mentally). Each iteration:

### 4a. Mode selection

Use the AskUserQuestion tool to present mode options:

- **Project-level or epic**: offer Research, Brainstorm, Prototype as three options
- **Slice or quest**: offer Research and Brainstorm only; add "(Prototype available at project-level or epic scope only)" to the question text

On subsequent iterations, note previously used modes in the question text (e.g., "Pick a mode (already used: Research):").

If the user somehow selects Prototype at slice/quest scope, tell them: "Prototype mode is only available at project or epic scope. Pick Research or Brainstorm instead, or re-run `/gp:explore` at project/epic scope for prototyping."

Follow calibration depth guidance in expertise-tracking.md (auto-included above).

### 4b. Run the selected mode

Execute the mode following the detailed behavior in the **Explore Logic Reference** section below:

**Research**: Ask for topics, confirm output paths with user, spawn sub-agents (cap at 5 parallel), report results.

**Brainstorm**: Open conversation, follow-ups, capture at natural stopping point or backstop at 8-10 exchanges. Confirm slug and write.

**Prototype** (project or epic scope): Ask for approach description, derive name, confirm with user, create directory, run interactive session, write `summary.md`. If the prototype directory already exists, append a numeric suffix (e.g., `auth-flow-2/`).

### 4b2. Record durable decisions

During any mode (Research, Brainstorm, Prototype), if a durable decision emerges (see threshold in `decisions-format.md`), propose the decision text to the user and confirm via AskUserQuestion before writing.

Create decisions via CLI — construct the payload from user responses and pipe to:

```bash
echo '{"id":"<kebab-case-id>","domain":"<topic-area>","title":"<decision-title>","summary":"<brief-summary>","reconsiderWhen":["<condition>"],"subsystems":["<subsystem-name>"]}' | $GP decision:record --json
```

The `id` is derived from kebab-casing the title, `domain` from the topic area. Include `reconsiderWhen` if the decision has known conditions that would invalidate it (per decisions-format.md). Include `subsystems` when the decision clearly maps to one or more subsystems -- query `$GP subsystem:list --json` for available names when the scope is an epic. The CLI creates the metadata entry.

Then write the full decision markdown file to the path from the CLI response, following the format in decisions-format.md (including Rationale and Consequences sections — these are the most valuable parts for downstream skills).

Track all decisions written during this run and summarize them in Step 5 and at the end of the skill run.

### 4c. Tally and continue prompt

After each mode completes, show a brief tally of all artifacts so far:

- If 4 or fewer artifacts, list them (e.g., "So far: researched auth-providers, brainstormed API design").
- If more than 4, summarize as counts (e.g., "So far: 3 research topics, 2 brainstorm sessions.").

Then use the AskUserQuestion tool to ask whether to keep going:

- At fewer than 5 iterations: question is "Keep exploring, or are we done?"
- At 5+ iterations: question is "Keep exploring, or are we done? (You've done N rounds — no pressure to keep going.)"

Offer two options: "Keep exploring" and "Done — write summary". If "Keep exploring" — loop back to 4a. If "Done" — proceed to Step 5.

## Step 5 — Write explore-complete.md

Using the `explore-complete.md` template from the **Explore Logic Reference** section below, draft the content. Include:

- **Scope**: the resolved scope
- **What Was Explored**: list of research topics and brainstorm sessions completed
- **Key Conclusions**: synthesize key learnings, decisions, open questions
- **Artifacts**: list all files written, including any prior research/brainstorm files from earlier explorations (prior artifacts are preserved)

Show the draft to the user for approval. This is a milestone artifact that downstream skills depend on — do not write without explicit approval. If the user requests changes, revise and re-present until approved.

Use the Write tool to create `explore-complete.md` at the scope path after approval.

## Step 5b — Expertise Check

Reflect on the conversation: did it reveal new information about the user's expertise?

- **If yes**: Follow the recording protocol from expertise-tracking.md (auto-included above), including the plugin data guard. Update `${CLAUDE_PLUGIN_DATA}/expertise.md` following the guard and format described there.
- **If no**: Skip silently — no Read, no output, no AskUserQuestion.

## Step 6 — Complete Exploration

### For epic scope

If the exploration was not already begun via `epic:explore-start` in this session, begin it now (this may already have been done if the user started exploration explicitly):

```bash
$GP epic:explore-start --epic <name> --json
```

If this returns `STATE_INVALID_TRANSITION` (exit 3), the epic is already past the `created` state -- check `gp epic:show --epic <name> --json` for current status and proceed.

**CRITICAL -- Do this BEFORE the Done Summary.** Conclude the exploration phase:

```bash
$GP epic:explore-conclude --epic <name> --json
```

This concludes the exploration and transitions the epic to explored (P2). If this step is skipped, the epic will be stuck in exploring and downstream skills cannot proceed. The skill writes `explore-complete.md` (Step 5); this command transitions state only.

### For quest scope

The CLI supports quest-scoped exploration transitions (same pattern as epic):

```bash
stdin: "" | $GP quest:explore --quest <name> --json
```

If this returns `STATE_INVALID_TRANSITION` (exit 3), the quest is already past `created` — check `gp quest:show --quest <name> --json` for current status and proceed.

```bash
stdin: "" | $GP submit-explore --quest <name> --json
```

This transitions the quest to `explored` and records the activity.

### For non-epic/non-quest scopes

For project and top-level slice scopes, the `explore-complete.md` artifact serves as the completion record. No CLI mutation is needed.

### After completion — Done Summary

Display using the Done Summary Template (Variant B — Loose Checklist) from output-templates.md (auto-included above). Include:

- All artifacts written during this run (file paths)
- All decisions written during this run (if any) — list each decision title
- CLAUDE.md update confirmation (if applicable)
- Recommend next step based on scope:
  - Epic: `/gp:create-epic`
  - Project-level (no epic): `/gp:create-epic`
  - Slice: `/gp:plan-slice`
  - Side quest: `/gp:plan-slice`

## Explore Logic Reference

### Scope Path Mapping

| Scope | research/ | brainstorm/ | prototypes/ | explore-complete.md | explore-skipped.md |
|---|---|---|---|---|---|
| Epic | `.goodplan/epics/<name>/research/` | `.goodplan/epics/<name>/brainstorm/` | `.goodplan/epics/<name>/prototypes/<name>/` | `.goodplan/epics/<name>/explore-complete.md` | `.goodplan/epics/<name>/explore-skipped.md` |
| Project | `.goodplan/research/` | `.goodplan/brainstorm/` | `.goodplan/prototypes/<name>/` | `.goodplan/explore-complete.md` | `.goodplan/explore-skipped.md` |
| Top-Level Slice | `.goodplan/slices/<name>/research/` | `.goodplan/slices/<name>/brainstorm/` | N/A | `.goodplan/slices/<name>/explore-complete.md` | `.goodplan/slices/<name>/explore-skipped.md` |
| Quest | `.goodplan/quests/<name>/research/` | `.goodplan/quests/<name>/brainstorm/` | N/A | `.goodplan/quests/<name>/explore-complete.md` | `.goodplan/quests/<name>/explore-skipped.md` |

> **Note**: Epic scope supports Prototype mode (like Project scope). Per-slice exploration is not supported for epic slices — the skill auto-redirects to epic scope (see Step 2).

### explore-complete.md Template

```markdown
# Explore Complete

## Scope
<project-level | epics/<name> | slices/<name> | quests/<name>>

## What Was Explored
<Bullet list of topics researched and/or brainstormed>

## Key Conclusions
<What we learned, decisions made, open questions that remain>

## Artifacts
<List of files written: research/<topic>.md, brainstorm/<topic>.md, prototypes/<name>/>
```

### explore-skipped.md Template

```markdown
# Explore Skipped

## Scope
<scope>

## Reason
<Why exploration was skipped — what context already exists>
```

### Research Mode

**User interaction:**
1. Ask: "What topics do you want to research? List them and I'll investigate in parallel."
2. Show confirmation with each topic, computed output path, and topic slug. Wait for OK.
3. Show one-line progress as each sub-agent completes (e.g., "Wrote research/auth-providers.md").
4. After all complete, summarize findings. Report partial results if any failed (e.g., "4/5 done; X failed — retry?").

**Implementation:**
- Cap parallel sub-agents at 5; queue rest sequentially.
- Compute full absolute output path before spawning. Use the Agent tool to spawn a sub-agent (omit model param) with:
  - Context: "This is a goodplan-managed project. `.goodplan/` contains project state. You are researching a topic for `/gp:explore`."
  - Search codebase (Grep/Glob/Read) for relevant code/patterns
  - Use WebSearch for external knowledge; use Context7 MCP tools if available (resolve library ID → query docs)
  - `mkdir -p <research-path>` before writing
  - Write to `<research-path>/<topic-slug>.md` (slug: 2-4 words, kebab-case). If file exists, append numeric suffix (e.g., `api-design-2.md`)
  - **Sub-agent must NOT modify any files other than its designated output file**
- On failure, write a stub file noting the failure.
- If the scope is an epic, tag any decisions or learnings emerging from research with relevant subsystems (query `$GP subsystem:list --json` for available names).

### Brainstorm Mode

**This mode is fully collaborative.** Every exchange requires explicit user input before continuing. Do not auto-generate follow-up questions and answer them -- present them and wait for the user's response via AskUserQuestion.

1. Ask: "What do you want to explore or think through?"
2. Open conversation — ask follow-ups, surface trade-offs, explore options. **After each exchange, wait for user response via AskUserQuestion before continuing.** Do not auto-advance the conversation.
3. At a natural stopping point (repetition, convergence, user satisfied), offer to capture or keep going via AskUserQuestion. If capturing: show outline, wait for approval.
4. Backstop: after 8-10 exchanges, use AskUserQuestion to nudge: "We've been at this a while — want me to capture what we have?" This is a question, not an automatic action.
5. `mkdir -p <brainstorm-path>` before writing.
6. Derive slug (2-4 words, kebab-case). Show to user and confirm (e.g., "I'll save as `brainstorm/auth-approach.md` — OK?").
7. Write structured summary: options considered, trade-offs, decision (if any), open questions. If file exists, append numeric suffix.
8. If the scope is an epic, tag any decisions or learnings with relevant subsystems (query `$GP subsystem:list --json` for available names).

### Prototype Mode (Project or Epic Scope)

1. Ask: "What do you want to prototype? Describe the approach."
2. Derive `<name>` from the approach description (2-4 words, kebab-case), confirm with user. If directory already exists, append numeric suffix (e.g., `auth-flow-2/`).
3. `mkdir -p <prototypes-path>/<name>/`
4. Run session interactively — write prototype files into that directory.
5. On completion, write `summary.md`: what was tried, what was learned, verdict (promising / not worth pursuing / needs more exploration).
