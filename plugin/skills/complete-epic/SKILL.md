---
name: complete-epic
description: Complete an epic: synthesize cross-slice learnings, reconcile architecture, promote artifacts. Standalone skill (not a pipeline). Common triggers: 'complete epic', 'finish epic', 'epic completion', 'close epic', 'wrap up epic', 'epic is done'.
user-invocable: true
requires: gp >= 1.0.0
---

# Complete Epic

Standalone epic completion skill. Spawns the `completion-epic` agent for cross-slice analysis, then surfaces recommendations for user decisions. No phase table, no review loop — single logical step with a sub-agent.

## Context Discipline

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-discipline.md

**Exception**: The orchestrator MAY use `stat` or `ls` for file existence checks (re-entry detection on LLM-owned markdown).

@${CLAUDE_PLUGIN_ROOT}/skills/_references/expertise-tracking.md

## Step 0 — Setup

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

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
$GP slice:list --epic $EPIC_NAME --json
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
stat "${EPIC_DIR}/completion/side-quest-proposals.md" 2>/dev/null
stat "${EPIC_DIR}/completion/verification-assessments.cache" 2>/dev/null
stat "${EPIC_DIR}/completion/learnings.cache" 2>/dev/null
stat "${EPIC_DIR}/completion/recommendations.cache" 2>/dev/null
```

Map the presence of files to determine resume point:

| Files present | Action |
|---|---|
| None | Full run — proceed to Step 4 |
| All 4 markdown files + all 3 cache files (`verification-assessments.cache`, `learnings.cache`, `recommendations.cache`) | Agent completed. Skip to Step 5 (not Step 7 — Steps 5-6 involve user choices that may not have been applied). |
| All 4 markdown files but missing any cache file | Re-spawn agent. |
| Any other combination | Partial agent run. Re-spawn full agent (it will overwrite existing files). |

If resuming, present: "Epic completion in progress. Resuming from {step description}."

## Step 4 — Spawn Completion-Epic Agent

### 4a. Pre-Create Completion Directory

```bash
mkdir -p "${EPIC_DIR}/completion/"
```

### 4b. Load Epic Details

```bash
$GP epic:show --epic $EPIC_NAME --json
```

Check `.status` — must be `activated`. If not, stop early: "Epic '{EPIC_NAME}' is in status '{status}' — only epics in 'activated' status can be completed."

Extract the `verifications` array from the response — needed for the agent's task prompt (Step 4f) and for CLI submission (Step 7).

### 4c. Discover Slice Paths

```bash
$GP slice:list --epic $EPIC_NAME --json
```

Extract slice names from the JSON. Construct paths deterministically:
- Learnings: `${EPIC_DIR}/slices/{slice-name}/completion/learnings.md`
- Architecture deltas: `${EPIC_DIR}/slices/{slice-name}/completion/architecture-delta.md`

### 4d. Gather Forward-Compat Conditions

Load active conditions per cli-interaction.md Conditions Loading section, filtering by `epics/${EPIC_NAME}`.

### 4e. Build Cross-Slice Summary

From the `slice:list` output, construct a summary string listing each slice with its name, status, and any key metadata. This is a structural summary from CLI output, not content reading.

### 4f. Spawn Agent

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
  {structured summary from 4e}

  Top-level architecture path: .goodplan/architecture/_overview.md
  Epic target architecture path: {EPIC_DIR}/architecture/

  {if conditions found in 4d:
    "Decisions with reconsiderWhen conditions: {JSON}"
    "Learnings with validUntil conditions: {JSON}"
    "Evaluate each condition against epic-level learnings."
  }

  Verification criteria (from Step 4b epic:show):
  {JSON array of verifications from 4b}

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
    "learnings": [
      { "category": "worked|didnt-work|domain|do-differently", "summary": "...", "detail": "...", "tags": [...], "rollupTo": ["project"], "validUntil": ["optional"] }
    ],
    "recommendations": [
      { "type": "architecture-update", "target": "top-level|epic", "description": "...", "priority": "high|medium|low" },
      { "type": "side-quest", "description": "...", "scope": "small|medium|large", "priority": "..." },
      { "type": "artifact-promotion", "source": "...", "destination": "...", "priority": "..." },
      { "type": "decision", "id": "...", "domain": "...", "title": "...", "summary": "...", "priority": "..." }
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

### 4g. Parse Agent Return

Check `status`:
- **SUCCESS**: Validate `verificationAssessments` — the array length must match the number of verification criteria from Step 4b, and every entry must have a non-empty `notes` string. If validation fails, re-spawn the agent. On success, persist all structured arrays using the Write tool for re-entry resilience:
  - `${EPIC_DIR}/completion/verification-assessments.cache` — the verificationAssessments array
  - `${EPIC_DIR}/completion/learnings.cache` — the learnings array
  - `${EPIC_DIR}/completion/recommendations.cache` — the recommendations array
  Then proceed to Step 5.
- **PARTIAL**: log the `summary` and surface to user via AskUserQuestion: "Epic completion partially completed: {summary}. Continue with partial results / Retry / Stop?"
  - Continue: persist verificationAssessments only if non-empty AND length matches expected count. Persist learnings and recommendations if non-empty. Set `assessmentsIncomplete = true` if assessments not persisted. Proceed to Step 5 with partial data.
  - Retry: re-spawn the agent.
  - Stop: preserve completion directory, stop.
- **FAILED**: stop with error message.

If `triggeredConditions` is non-empty, surface each to the user: "Condition triggered on {type} `{id}`: {condition} -- {reason}. Review now / Defer / Skip?"

## Step 5 — Surface Recommendations

**On re-entry** (from Step 3): Read `${EPIC_DIR}/completion/recommendations.cache`.

**On fresh run** (from Step 4g): Use the `recommendations` array from the agent's return.

Present each recommendation to the user via AskUserQuestion, grouped by type:

### Architecture Updates

For each recommendation with `type: "architecture-update"`:

"**Architecture reconciliation:** {description}
- **Update top-level architecture** -- apply this change
- **Mark as incomplete work** -- create a side quest
- **Document as intentional scope reduction** -- no action needed
- **Skip**"

Track choices:
- "Update": apply the update using Edit on the target architecture file.
- "Incomplete work": add to side quest list (created in the Side Quests section below).
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

### Decision Records

For each recommendation with `type: "decision"`:

"**Create decision record:** {title} — {summary}
- **Create** — record via CLI
- **Skip**"

For approved decisions, create via CLI. The `createDecisionInputSchema` requires `id`, `domain`, `title`, and `summary`:

```bash
echo '{"id":"<kebab-case-id>","domain":"<domain>","title":"<title>","summary":"<summary>","reconsiderWhen":[]}' | $GP decision:create --json
```

Derive `id` from kebab-casing the title, `domain` from the recommendation context (e.g., "architecture", "tooling").

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

The completion-epic agent assesses the epic's verification criteria as part of its task. The orchestrator validates completeness.

**On re-entry** (when the agent was not spawned in this session — i.e., resuming through Steps 5-6 from Step 3): Read persisted assessments from `${EPIC_DIR}/completion/verification-assessments.cache`. If this file is missing, re-spawn the agent (go back to Step 4).

**On fresh run** (coming from Step 4g): Use the `verificationAssessments` array from the agent's return. If `assessmentsIncomplete` is true (PARTIAL + Continue path), the agent didn't provide usable assessments. Present each verification criterion to the user for manual pass/fail assessment via AskUserQuestion, collecting `notes` for each.

Load the epic's verification criteria. On re-entry from Step 3, Step 4b was skipped — run the command now:

```bash
$GP epic:show --epic $EPIC_NAME --json
```

Extract the `verifications` array from the response. Each entry has a `description`, `status`, `addedDuring`, and `modifiedDuring` field. On a fresh run (coming from Step 4g), this data was already loaded in Step 4b — reuse it.

Each assessment corresponds by position to the `verifications` array:

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

**On re-entry** (when the agent was not spawned in this session): Read persisted learnings from `${EPIC_DIR}/completion/learnings.cache`.

**On fresh run** (coming from Step 4g): Use the `learnings` array from the agent's return JSON.

Each entry must match `learningInputSchema`:

```json
{
  "category": "domain" | "worked" | "didnt-work" | "do-differently",
  "summary": "Short description (min 1 char)",
  "detail": "Detailed explanation (min 1 char)",
  "tags": ["tag1", "tag2"],
  "rollupTo": ["project"],
  "validUntil": ["optional condition"]
}
```

`validUntil` is optional — include it when a learning has a known expiration condition (e.g., "schema version changes"). Validate that each entry has non-empty `summary` and `detail`. Ensure `rollupTo` includes `"project"` so learnings roll up to project scope.

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

Use the guard pattern and format from expertise-tracking.md (auto-included above).

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
- **Cross-slice learnings**: {learnings array length}
- **Architecture reconciliations**: {count updates applied} applied, {count deferred} deferred
- **Side quests created**: {count}
- **Decisions recorded**: {count}
- **Artifacts promoted**: {count}
- **Status**: completed
```

## Sub-Agent Tool Restrictions

| Agent | allowedTools | Rationale |
|---|---|---|
| completion-epic | Read, Grep, Glob, Write | Reads slice artifacts, writes completion files |

All agents: `disallowedTools: ["Agent"]` — enforces flat hierarchy.

## Error Handling

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md

Additional cases:
- **Missing slice learnings**: If a slice's `completion/learnings.md` doesn't exist (e.g., slice was abandoned), pass the path anyway — the agent will handle missing files gracefully.
- **Step 5 CLI failures**: If `quest:create` or `decision:create` fails in Step 5 (e.g., `STATE_DUPLICATE_DECISION`, duplicate quest name), log the error, inform the user (e.g., "Decision already exists — skipping"), and continue with remaining recommendations. Do not stop the completion flow — these are optional user-chosen actions.
