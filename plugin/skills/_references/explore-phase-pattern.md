# Explore Phase Pattern

Shared pattern for the autonomous explore phase used by create-epic and create-side-quest. The consuming skill selects the correct command set based on entity type.

## Placeholders

| Placeholder | Description | Example |
|---|---|---|
| `{ENTITY_TYPE}` | Plural entity type for CLI paths | `epics` or `quests` |
| `{ENTITY_TYPE-singular}` | Singular entity type for CLI commands | `epic` or `quest` |
| `{ENTITY_NAME}` | Variable holding the entity name | `$EPIC_NAME` or `$QUEST_NAME` |
| `{ENTITY_CLI_FLAG}` | CLI flag for targeting the entity | `--epic` or `--quest` |

> **Note:** Epic and quest scopes use different command sets. Epic scope uses v2 commands; quest scope uses v1 commands (no v2 replacements exist). The consuming skill must select the correct block below based on entity type.

## Entity-Type-Conditional Commands

### Epic Scope (v2 Commands)

Use these commands when `{ENTITY_TYPE-singular}` is `epic`:

| Step | Command |
|---|---|
| Start exploration | `$GP epic:explore-start --epic {ENTITY_NAME} --json` |
| Capture research artifact | `$GP epic:research-capture --epic {ENTITY_NAME} --json` |
| Capture brainstorm artifact | `$GP epic:brainstorm-capture --epic {ENTITY_NAME} --json` |
| Conclude exploration | `$GP epic:explore-conclude --epic {ENTITY_NAME} --json` |

### Quest Scope (v1 Commands)

Use these commands when `{ENTITY_TYPE-singular}` is `quest`:

| Step | Command |
|---|---|
| Start exploration | `$GP quest:explore --quest {ENTITY_NAME} --json` |
| Load context | `$GP start-explore --quest {ENTITY_NAME} --json` |
| Conclude exploration | `stdin: "" \| $GP submit-explore --quest {ENTITY_NAME} --json` |

## Phase Steps

### Status Transition

**Epic scope:** If the epic is at phase P0 (created, no goal yet) or P1 (goal committed), start exploration:

```bash
$GP epic:explore-start --epic {ENTITY_NAME} --json
```

If this returns an error (exploration already started or past), check `$GP epic:show --epic {ENTITY_NAME} --json` for current phase and proceed to Load Context.

**Quest scope:** If quest status is `created`, transition to `exploring`. If status is already `exploring` (re-entry), skip this transition and proceed to Load Context:

```bash
$GP quest:explore --quest {ENTITY_NAME} --json
```

Verify successful transition. If it fails, stop with the error message.

### Load Context

**Epic scope:** Context is loaded as part of the explore-start response or via `$GP epic:show --epic {ENTITY_NAME} --json`.

**Quest scope:**

```bash
$GP start-explore --quest {ENTITY_NAME} --json
```

This returns a `ContextBundle` with `inline`, `references`, `decisions`, and `learnings`.

### Load Active Conditions

Load active conditions per cli-interaction.md Conditions Loading section, filtering by `{ENTITY_TYPE}/{ENTITY_NAME}`.

### Spawn Explore-Phase Agent

Spawn `explore-phase` with: entity name, goal, temp directory, ContextBundle (inline context, reference paths, decisions, learnings), active conditions to evaluate (filtered decisions with `reconsiderWhen`, learnings with `validUntil` -- return triggered conditions in JSON). Tools: Read, Grep, Glob, Write, Bash, WebSearch. No Agent tool.

### Handle Explore-Phase Return

Parse the return JSON. If `triggeredConditions` is non-empty, surface each to the user before any continue/finalize decision: "Decision **{title}** should be reconsidered -- condition triggered: {condition}." Use AskUserQuestion to confirm whether to proceed or stop.

Then check `status`:

- **PARTIAL**: Present the `summary` field to the user via AskUserQuestion: "Here's what was found so far: {summary}. Continue exploring? / That's enough research."
  - If continue: check if `continuationFile` path exists; if so, re-spawn the explore-phase agent with it and instruction to continue. If not (e.g., /tmp cleaned between sessions), re-spawn without continuation (agent starts fresh exploration).
  - If done: same check -- if `continuationFile` exists, re-spawn with it and instruction to "finalize". If not, re-spawn without continuation and instruction to "finalize using existing research/brainstorm files at the scope path". Agent writes explore-complete summary and returns SUCCESS.
- **SUCCESS**: Proceed to submit.
- **FAILED**: Stop with error message. Preserve temp directory.

### Submit Explore

**Epic scope:**

```bash
$GP epic:explore-conclude --epic {ENTITY_NAME} --json
```

This concludes the exploration and transitions the epic to explored (P2).

**Quest scope:**

```bash
stdin: "" | $GP submit-explore --quest {ENTITY_NAME} --json
```

This transitions `exploring` -> `explored`. Empty stdin piped per cli-interaction.md convention (harmless -- command does not read stdin, entity is provided via the CLI flag).
