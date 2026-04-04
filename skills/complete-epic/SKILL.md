---
name: complete-epic
description: >
  Complete an epic: synthesize cross-slice learnings, reconcile architecture,
  promote artifacts. Standalone skill (not a pipeline).
  Common triggers: 'complete epic', 'finish epic', 'epic completion',
  'close epic', 'wrap up epic', 'epic is done'.
user-invocable: true
requires: gp >= 1.0.0
---

# Complete Epic

Standalone epic completion skill. Spawns the `completion-epic` agent for cross-slice analysis, then surfaces recommendations for user decisions. No phase table, no review loop — single logical step with a sub-agent.

## Context Discipline

**You are an orchestrator.** You MUST NOT use the Read tool on architecture files, learnings files, slice artifacts, source code, or agent definitions. Your context consists of:
- CLI command output (`gp status --json`, `gp epic:show --json`, `gp slice:list --json`, etc.)
- Sub-agent return values (structured JSON)
- User Q&A responses (from AskUserQuestion)
- File existence checks via `stat` or `ls` (for re-entry detection on LLM-owned markdown)

If you need content-level information, spawn a sub-agent to read and summarize it.

For file copying (e.g., artifact promotion), use shell `cp` via Bash tool — not Read+Write, which would pull artifact content into orchestrator context.

## Step 0 — Setup

```bash
GP="${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp"
"$GP" --version --json
```

If the command fails, stop: "The `gp` CLI is required but not found. Ensure the goodplan plugin is installed and enabled."

If the version doesn't satisfy `requires: gp >= 1.0.0`, stop with version mismatch message.

Store `$GP` as the CLI binary path for all subsequent commands.

## Step 1 — Scope Resolution

Accept an epic name as argument, or auto-detect:

1. **Argument provided**: use it directly as `EPIC_NAME`.
2. **No argument**: query `$GP status --json`. Check `.activeEpic` — if present, use `.activeEpic.name`. Otherwise, use AskUserQuestion to ask the user for the epic name.
3. If no epic found, stop: "No active epic found. Specify an epic name or activate one first."

Resolve the epic directory path:

```bash
EPIC_DIR=".goodplan/epics/${EPIC_NAME}"
```

## Step 2 — Guardrail: All Slices Terminal

Verify all slices are in a terminal status (`completed` or `abandoned`):

```bash
$GP slice:list --json
```

Parse the JSON output. Filter for any slice with a status that is NOT `completed` and NOT `abandoned`.

If any non-terminal slices remain, list them and stop:

```
Cannot complete epic — the following slices are not in a terminal state:

- {slice-name}: {status}
- {slice-name}: {status}

Complete or abandon all slices before running /gp:complete-epic.
```

## Step 3 — Re-Entry Detection

Check for existing completion artifacts (these are LLM-owned markdown — direct stat is permitted):

```bash
stat "${EPIC_DIR}/completion/consolidated-learnings.md" 2>/dev/null
stat "${EPIC_DIR}/completion/architecture-reconciliation.md" 2>/dev/null
stat "${EPIC_DIR}/completion/artifact-promotions.md" 2>/dev/null
```

Map the presence of files to determine resume point:

| Files present | Action |
|---|---|
| None | Full run — proceed to Step 4 |
| `consolidated-learnings.md` only | Resume at architecture reconciliation — re-spawn agent with continuation hint |
| `consolidated-learnings.md` + `architecture-reconciliation.md` | Resume at artifact promotion — skip to Step 6 |
| All three | Resume at CLI submit — skip to Step 7 |

If resuming, present: "Epic completion in progress. Resuming from {step description}."

## Step 4 — Spawn Completion-Epic Agent

### 4a. Pre-Create Completion Directory

```bash
mkdir -p "${EPIC_DIR}/completion/"
```

### 4b. Discover Slice Paths

```bash
$GP slice:list --json
```

Extract slice names from the JSON. Construct paths deterministically:
- Learnings: `${EPIC_DIR}/slices/{slice-name}/completion/learnings.md`
- Architecture deltas: `${EPIC_DIR}/slices/{slice-name}/completion/architecture-delta.md`

### 4c. Gather Forward-Compat Conditions

```bash
$GP decision:list --json
$GP learning:list --json
```

Inspect the output schema. If entries contain `reconsiderWhen` (decisions) or `validUntil` (learnings) fields, filter for non-empty values and collect them. If entries lack these fields (pre-schema-change), skip condition passing entirely — do not error. Follow the same forward-compat gate pattern established in `plan-slice` SKILL.md.

### 4d. Build Cross-Slice Summary

From the `slice:list` output, construct a summary string listing each slice with its name, status, and any key metadata. This is a structural summary from CLI output, not content reading.

### 4e. Spawn Agent

```
Agent: completion-epic
Task prompt: |
  Epic: {EPIC_NAME}
  Epic path: {EPIC_DIR}
  Completion directory: {EPIC_DIR}/completion/ (pre-created)

  Slice learnings paths:
  {list each: EPIC_DIR/slices/{slice-name}/completion/learnings.md}

  Slice architecture-delta paths:
  {list each: EPIC_DIR/slices/{slice-name}/completion/architecture-delta.md}

  Cross-slice summary:
  {structured summary from 4d}

  Top-level architecture path: .goodplan/architecture/_overview.md
  Epic target architecture path: {EPIC_DIR}/architecture/

  {if conditions found in 4c:
    "Decisions with reconsiderWhen conditions: {JSON}"
    "Learnings with validUntil conditions: {JSON}"
    "Evaluate each condition against epic-level learnings."
  }

  Synthesize cross-slice learnings, reconcile architecture, identify
  artifacts to promote, and propose side quests.

  Write to:
  - {EPIC_DIR}/completion/consolidated-learnings.md
  - {EPIC_DIR}/completion/architecture-reconciliation.md
  - {EPIC_DIR}/completion/artifact-promotions.md
  - {EPIC_DIR}/completion/side-quest-proposals.md

  Return JSON: {
    "status": "SUCCESS" | "PARTIAL" | "FAILED",
    "summary": "...",
    "filesWritten": [...],
    "recommendations": [
      { "type": "architecture-update", "target": "top-level|epic", "description": "...", "priority": "high|medium|low" },
      { "type": "side-quest", "description": "...", "scope": "small|medium|large", "priority": "..." },
      { "type": "artifact-promotion", "source": "...", "destination": "...", "priority": "..." }
    ],
    "triggeredConditions": [
      { "type": "decision|learning", "id": "...", "condition": "...", "reason": "..." }
    ]
  }

allowedTools: ["Read", "Grep", "Glob", "Write"]
disallowedTools: ["Agent"]
```

### 4f. Parse Agent Return

Check `status`:
- **SUCCESS**: proceed to Step 5.
- **PARTIAL**: log the `summary` and surface to user via AskUserQuestion: "Epic completion partially completed: {summary}. Continue with partial results / Retry / Stop?"
  - Continue: proceed to Step 5 with partial data.
  - Retry: re-spawn the agent.
  - Stop: preserve completion directory, stop.
- **FAILED**: stop with error message.

If `triggeredConditions` is non-empty, surface each to the user: "Condition triggered on {type} `{id}`: {condition} -- {reason}. Review now / Defer / Skip?"

## Step 5 — Surface Recommendations

Parse the `recommendations` array from the agent return. Present each to the user via AskUserQuestion, grouped by type:

### Architecture Updates

For each recommendation with `type: "architecture-update"`:

"**Architecture reconciliation:** {description}
- **Update top-level architecture** -- apply this change
- **Mark as incomplete work** -- create a side quest
- **Document as intentional scope reduction** -- no action needed
- **Skip**"

Track choices:
- "Update": apply the update using Edit on the target architecture file.
- "Incomplete work": add to side quest list (created in Step 5c).
- "Scope reduction": note in completion summary (no file changes needed).
- "Skip": move on.

### Side Quests

For each recommendation with `type: "side-quest"`:

"**Proposed side quest:** {description} (scope: {scope}, priority: {priority})
- **Create side quest** -- `$GP quest:create`
- **Defer** -- note for future consideration
- **Skip**"

For approved side quests:

```bash
$GP quest:create --title "{description}" --json
```

### Artifact Promotions

Handled in Step 6.

## Step 6 — Artifact Promotion

For each recommendation with `type: "artifact-promotion"`:

"**Promote artifact:** {source} -> {destination}
- **Promote** -- copy to project level
- **Skip**"

For approved promotions, copy using `cp -n` (no-clobber for idempotent re-entry):

```bash
mkdir -p "$(dirname "{destination}")"
cp -n "{source}" "{destination}"
```

These are LLM-owned markdown files outside `.goodplan/` JSON state, so direct file operations are appropriate.

## Step 7 — CLI Submit

Construct the `epic:complete` payload. The CLI accepts `verificationResults` and `learnings`:

1. Read the agent's `learnings` from the completion analysis return (Step 4f). Each learning has `category`, `summary`, `detail`, `tags`, and `rollupTo`.
2. Set `rollupTo: ["project"]` on each learning so they roll up to project scope.
3. Construct `verificationResults` from the agent's verification data (or use `[{"index": 0, "passed": true}]` if verification was handled by the agent).

```bash
echo '{"verificationResults": [{VERIFICATION}], "learnings": [{LEARNINGS}]}' | $GP epic:complete --epic $EPIC_NAME --json
```

If the CLI command fails, stop with the error message.

## Step 8 — Done Summary

Present results to the user:

```
**Epic Completed**
- **Epic**: {EPIC_NAME}
- **Slices completed**: {count completed} ({count abandoned} abandoned)
- **Cross-slice learnings**: {count from consolidated-learnings}
- **Architecture reconciliations**: {count updates applied} applied, {count deferred} deferred
- **Side quests created**: {count}
- **Artifacts promoted**: {count}
- **Status**: completed
```

## Sub-Agent Tool Restrictions

| Agent | allowedTools | Rationale |
|---|---|---|
| completion-epic | Read, Grep, Glob, Write | Reads slice artifacts, writes completion files |

All agents: `disallowedTools: ["Agent"]` — enforces flat hierarchy.

## Error Handling

- **CLI command failure**: Log the error, stop, and surface the error message to the user.
- **Sub-agent FAILED status**: Log the agent name and error summary, stop, and tell the user what happened.
- **Sub-agent PARTIAL status**: Surface to user via AskUserQuestion with options to continue, retry, or stop.
- **Unexpected return format**: If the sub-agent return cannot be parsed as JSON, log the raw return text to stderr and treat as FAILED.
- **Missing slice learnings**: If a slice's `completion/learnings.md` doesn't exist (e.g., slice was abandoned), pass the path anyway — the agent will handle missing files gracefully.
