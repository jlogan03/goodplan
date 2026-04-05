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
GP="gp"
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

  Verification criteria (from `gp epic:show --json` `.verifications`):
  {JSON array of verifications from epic:show output}

  Synthesize cross-slice learnings, reconcile architecture, identify
  artifacts to promote, and propose side quests.

  Additionally, assess the epic's verification criteria. For each criterion
  in the `verifications` array above, evaluate whether it has been met based
  on the artifacts and completion state. Return your assessment in the
  `verificationAssessments` array (one entry per criterion, in order) —
  every entry must have a non-empty `notes` string explaining why it passed
  or failed.

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
    "verificationAssessments": [
      { "passed": true, "notes": "Criterion met because..." },
      { "passed": false, "notes": "Not met because..." }
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

For approved side quests, submit via stdin JSON:

```bash
echo '{"name":"<name>","goal":"Follow up: <description>. Estimated effort: <scope>"}' | $GP quest:create --json
```

Where `<name>` is a short kebab-case identifier derived from the description, `<description>` is the recommendation's `description` field, and `<scope>` is the recommendation's `scope` field (e.g., "small", "medium", "large"). If `scope` is not available, omit the "Estimated effort" suffix and use the description alone as the goal.

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

## Step 7 — Verification Assessment & CLI Submit

### 7a. Verification Assessment

The completion-epic agent spawned in Step 4 assesses the epic's verification criteria as part of its task. The orchestrator validates completeness of the agent's assessments — every criterion must have a corresponding entry with a non-empty `notes` string.

Query the epic's verification criteria:

```bash
$GP epic:show --epic $EPIC_NAME --json
```

Extract the `verifications` array from the response. Each entry has a `description`, `status`, `addedDuring`, and `modifiedDuring` field.

The completion-epic agent's return value should include a `verificationAssessments` array (added to its return schema in Step 4e). Each assessment corresponds by position to the `verifications` array:

```json
{ "passed": true, "notes": "Criterion met because..." }
```

Construct `verificationResults` from the agent's assessments, adding the positional `index` for each. Each result must match `verificationResultSchema`:
- `index`: number (integer, non-negative) — the array position in the epic's `verifications` array
- `passed`: boolean — whether the criterion is met
- `notes`: string (required, non-empty) — explanation of the assessment

**Every verification result MUST include a non-empty `notes` string.** The CLI rejects results with missing or empty notes.

### 7b. Verification Gate

If any verification result has `passed: false`, present the failures to the user via AskUserQuestion:

```
The following epic verification criteria were assessed as NOT met:

- Criterion {index}: {description}
  Assessment: {notes}

Options:
- **Fix and retry** — address the issues and re-run completion
- **Mark as accepted** — override and complete anyway
- **Cancel completion** — stop without completing
```

- **Fix and retry**: Stop and tell the user what needs fixing. They should re-run `/gp:complete-epic` after addressing the issues.
- **Mark as accepted**: Flip the accepted entries to `passed: true` before submitting (the CLI state machine rejects `passed: false` entries). Prepend the original assessment to `notes`: "User override: originally assessed as not met. {original notes}". This preserves the user's agency while staying CLI-compatible.
- **Cancel completion**: Preserve the completion directory and stop.

### 7c. Learnings Rollup

Read `${EPIC_DIR}/completion/consolidated-learnings.md` and parse each learning entry into properly-typed objects. This is a justified exception to context discipline — the orchestrator needs to read this file to construct the CLI payload.

Each learning must match `learningInputSchema`:

```json
{
  "category": "domain" | "worked" | "didnt-work" | "do-differently",
  "summary": "Short description (min 1 char)",
  "detail": "Detailed explanation (min 1 char)",
  "tags": ["tag1", "tag2"],
  "rollupTo": ["epic", "project"],
  "validUntil": ["optional condition"]
}
```

Parse **all** learning entries from the consolidated file — not just the first one. Set `rollupTo: ["project"]` on each learning so they roll up to project scope (unless the consolidated file specifies a different rollup target).

### 7d. Submit

Construct the full payload and submit via stdin JSON:

```bash
echo '{"verificationResults":[<RESULTS>],"learnings":[<LEARNINGS>]}' | $GP epic:complete --epic $EPIC_NAME --json
```

The `--epic` flag is required on the command line (citty validates required args before reading stdin). The stdin payload schema is:
- `verificationResults`: Array (required, non-empty) — each with `{ index: number, passed: boolean, notes: string }`
- `learnings`: Array (optional, defaults to []) — each matching `learningInputSchema`

If the CLI command fails, stop with the error message.

## Step 8 — Expertise Check

Read `../_shared/references/expertise-tracking.md` for the guard pattern and format.

Reflect on the conversation: did completing this epic reveal new information about the user's expertise? Consider:
- Technologies or patterns the user demonstrated deep knowledge of
- Areas where the user needed more guidance or asked clarifying questions
- New domains the user onboarded into during this epic

If expertise data should be updated, follow the guard and format from the reference.

## Step 9 — Done Summary

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
