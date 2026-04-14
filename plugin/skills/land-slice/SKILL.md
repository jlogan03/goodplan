---
name: land-slice
description: >-
  Lands a completed slice: promotes spine artifacts, triages findings, captures learnings,
  and detects epic completion. Common triggers: 'land slice', 'land this slice', 'complete
  landing', 'finish slice'.
user-invocable: true
requires: gp >= 1.0.0
---

# Land Slice

Standalone slice landing skill. Spawns the `completion-slice` agent for architecture delta and learnings, optionally spawns `completion-side-quest` for findings triage, then surfaces recommendations for user decisions before calling `slice:land`.

## Shared References

@${CLAUDE_PLUGIN_ROOT}/skills/_references/cli-interaction.md
@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-discipline.md

**Exception**: The orchestrator MAY Read `architecture-current.md` (`_overview.md`) to derive the `old_string` for Edit tool operations during spine promotion (narrow, justified -- read to locate edit target only, not to interpret architectural content).

@${CLAUDE_PLUGIN_ROOT}/skills/_references/expertise-tracking.md

## Phase Table

| Phase | Type | What Happens |
|---|---|---|
| 1. Spine promotion | Autonomous | Update architecture-current.md with honest intermediate state |
| 2. Findings triage | Collaborative | Spawn completion-side-quest agent, surface proposals for user decisions |
| 3. Learnings + land | Autonomous + Collaborative | Extract learnings from completion-slice agent, surface recommendations, call `slice:land` |
| 4. Epic check | Autonomous | Detect if all slices terminal, suggest next steps |

## Step 0 -- Setup

Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.

Temp directory path formula (evaluated after Step 1 resolves SLICE_NAME):
```
TMPDIR="/tmp/gp-land-slice-${SLICE_NAME}"
```

## Step 1 -- Scope Resolution

Accept a slice name as argument, or auto-detect:

1. **Argument provided**: use it directly as `SLICE_NAME`.
2. **No argument**: query `$GP status --json`.
   - Check `.activeSlice` -- if present, use `.activeSlice.name`.
   - Otherwise, query `$GP slice:list --json` and find the first slice in `code-refinement-converged` status (P11).
   - If ambiguous, use AskUserQuestion to let the user choose.
3. If no suitable slice found, stop: "No slice ready for landing. Slice must be in `code-refinement-converged` (P11) status."

Resolve the epic:

```bash
$GP status --json
```

Extract `.activeEpic.name` as `EPIC_NAME`. If no active epic, use AskUserQuestion to ask the user for the epic name.

Derive `PLAN_SLUG` from slice name (kebab-case).

Create the temp directory:

```bash
mkdir -p "$TMPDIR"
```

## Step 2 -- Re-Entry Detection

Query current slice status:

```bash
$GP slice:show --slice $SLICE_NAME --json
```

Map the `status` field (phase):

| Status / Phase | Action |
|---|---|
| P11 (`code-refinement-converged`) | Ready for landing -- check for `$TMPDIR/agent-return.cache` (if exists, skip agent spawn in Step 3). Proceed to Step 3. |
| P12 (`landed`) | Already done. Inform user: "Slice is already landed." Stop. |
| P10 (`implementing` / code refinement in progress) | Not ready: "Slice is still implementing. Run `/gp:implement-slice` first." Stop. |
| P9 or earlier | Not ready: "Slice is in planning phase. Run `/gp:plan-slice` or `/gp:implement-slice` first." Stop. |

## Step 3 -- Spine Promotion

**The honest-intermediate-state rule:** `architecture-current.md` must always reflect what the codebase IS (not what it's becoming). After each slice lands, update it.

### 3a. Resolve Paths

- Architecture current: `.goodplan/architecture/_overview.md`
- Epic target architecture: `.goodplan/epics/${EPIC_NAME}/architecture/`

### 3b. Derive PRE_IMPL_COMMIT

Land-slice runs in a separate session from implement-slice, so `PRE_IMPL_COMMIT` is not available from a prior step. Derive it from git history:

```bash
FIRST_IMPL_COMMIT=$(git log --oneline --fixed-strings --grep="[${PLAN_SLUG}]" --reverse | head -1 | awk '{print $1}')
PRE_IMPL_COMMIT=$(git rev-parse ${FIRST_IMPL_COMMIT}^)
```

Use `--fixed-strings` to avoid regex interpretation of `PLAN_SLUG` characters.

### 3c. Compute Changed Files

```bash
CHANGED_FILES=$(git diff --name-only $PRE_IMPL_COMMIT..HEAD)
```

### 3d. Gather Architecture Paths

```bash
$GP status --json
```

Extract architecture file paths from `.artifacts.architecture.files`. Construct absolute paths by prepending `.goodplan/` to each.

### 3e. Gather Forward-Compat Conditions

Load active conditions per cli-interaction.md Conditions Loading section, filtering by the current slice/epic scope prefix.

### 3f. Spawn Completion-Slice Agent (or Load Cache)

**Re-entry check:** If `$TMPDIR/agent-return.cache` exists, load it and skip the agent spawn. Otherwise, spawn the agent.

**This single agent spawn serves both spine promotion (Step 3) and learnings capture (Step 5).** The agent's `architectureDelta` is used in Step 3g, and its `learnings` + `recommendations` are used in Step 5. This is documented coupling -- future maintainers: do not split this spawn without updating both consumers.

```
Agent: completion-slice
Task prompt: |
  Slice path: <slice-path from slice:show>
  Plan path: <plan path from slice:show>
  Changed files:
  {CHANGED_FILES}

  Architecture _overview.md path: .goodplan/architecture/_overview.md
  Epic architecture path: .goodplan/epics/${EPIC_NAME}/architecture/

  {if conditions found in 3e:
    "Decisions with reconsiderWhen conditions: {JSON}"
    "Learnings with validUntil conditions: {JSON}"
    "Evaluate each condition against slice-level learnings."
  }

  Synthesize learnings, review architecture delta, propose side quests.

  Write to:
  - <slice-path>/completion/learnings.md
  - <slice-path>/completion/architecture-delta.md
  - <slice-path>/completion/side-quest-proposals.md
  - <slice-path>/completion/health-update.md

  Return JSON: {
    "status": "SUCCESS" | "PARTIAL" | "FAILED",
    "summary": "...",
    "filesWritten": [...],
    "learnings": [
      { "category": "worked|didnt-work|domain|do-differently", "summary": "...", "detail": "...", "tags": [...], "rollupTo": ["epic"] }
    ],
    "architectureDelta": [
      { "subsystem": "...", "type": "add|modify|remove", "description": "..." }
    ],
    "recommendations": [
      { "type": "architecture-update|side-quest|debt", "description": "...", "priority": "high|medium|low" }
    ],
    "triggeredConditions": [
      { "type": "decision|learning", "id": "...", "condition": "...", "reason": "..." }
    ]
  }

allowedTools: ["Read", "Grep", "Glob", "Write"]
disallowedTools: ["Agent"]
```

### 3g. Parse Agent Return

Check `status`:

- **SUCCESS**: Cache the full return to `$TMPDIR/agent-return.cache` (JSON via Write tool). Proceed to 3h.
- **PARTIAL**: Surface to user via AskUserQuestion: "Completion partially completed: {summary}. Continue with partial results / Retry / Stop?"
  - Continue: cache what we have, proceed to 3h with partial data.
  - Retry: re-spawn the agent.
  - Stop: preserve temp directory, stop.
- **FAILED**: Stop with error message. Preserve temp directory.

If `triggeredConditions` is non-empty, surface each to the user: "Condition triggered on {type} `{id}`: {condition} -- {reason}. Review now / Defer / Skip?"

### 3h. Surface Architecture Deltas

For each entry in the agent's `architectureDelta` array, present to user via AskUserQuestion:

"**Architecture change:** [{subsystem}] {description} (type: {type})
- **Apply to architecture-current.md** -- update the spine
- **Defer** -- record as deferred work for a future slice
- **Skip** -- no action"

Track choices:
- **Apply**: **Orchestrator-discipline exception (narrow, justified):** Read `.goodplan/architecture/_overview.md` to locate the relevant subsystem section (by subsystem name match), then apply the update using Edit. The orchestrator reads only to derive the `old_string` for the Edit tool -- not to interpret architectural content.
- **Defer**: Add to `deferred` list with description. Ask the user which slice to target (`targetSlice` is required by the CLI schema).
- **Skip**: Move on.

Track applied deltas as `approvedArchitectureDelta` and deferred items as `deferredItems`.

## Step 4 -- Findings Triage

### 4a. Load Findings

```bash
$GP finding:list --epic $EPIC_NAME --json
```

If no findings exist (empty array or command returns no items), skip to Step 5.

### 4b. Spawn Completion-Side-Quest Agent

```
Agent: completion-side-quest
Task prompt: |
  findings: {JSON array from finding:list}
  epicArchitecturePaths: [".goodplan/epics/${EPIC_NAME}/architecture/"]
  conventionsPath: ".goodplan/conventions.md"

  Triage findings: promote to side quests, merge related findings, or cull.

allowedTools: ["Read", "Grep", "Glob"]
disallowedTools: ["Agent"]
```

### 4c. Parse Agent Return

Check `status`:

- **SUCCESS**: Proceed to 4d.
- **PARTIAL**: Log and continue with available proposals.
- **FAILED**: Log warning, skip findings triage (non-blocking -- landing can proceed without it).

### 4d. Surface Proposals

For each entry in the agent's `proposals` array, present to user via AskUserQuestion:

"**Proposed side quest:** {name} -- {goal} (scope: {scope})
Rationale: {rationale}
Source findings: {sourceFindings}
- **Create side quest** -- `$GP quest:create`
- **Defer** -- note for future consideration
- **Skip**"

For approved side quests:

```bash
echo '{"name":"<name>","goal":"<goal>"}' | $GP quest:create --json
```

If `quest:create` fails (e.g., duplicate name), log the error, inform the user, and continue. Do not stop the landing flow -- these are optional user-chosen actions.

### 4e. Record Triage Counts

Track: `promoteCount`, `cullCount`, `mergeCount` from the agent's `triageResults` array.

## Step 5 -- Learnings Capture + Land

### 5a. Extract Learnings

**On re-entry** (agent-return.cache loaded in Step 3f): Use the cached `learnings` array.

**On fresh run** (from Step 3g): Use the `learnings` array from the completion-slice agent's return.

### 5b. Surface Recommendations

From the completion-slice agent return (or cache), present each `recommendation` to the user via AskUserQuestion:

For `type: "architecture-update"`:
"**Architecture update recommendation:** {description} (priority: {priority})
- **Apply** -- update architecture
- **Create side quest** -- follow-up work
- **Skip**"

For `type: "side-quest"`:
"**Proposed side quest:** {description} (priority: {priority})
- **Create side quest** -- `$GP quest:create`
- **Defer**
- **Skip**"

For `type: "debt"`:
"**Technical debt identified:** {description} (priority: {priority})
- **Fix now** -- create side quest
- **Acknowledge** -- record in learnings
- **Skip**"

For approved side quests from recommendations:

```bash
echo '{"name":"<name>","goal":"Follow up: <description>. Estimated effort: <scope>"}' | $GP quest:create --json
```

For acknowledged debt, add to learnings array: `{ "category": "do-differently", "summary": "<description>", "detail": "Technical debt acknowledged during landing: <description>", "tags": ["debt"], "rollupTo": ["epic"] }`.

### 5c. Build and Submit slice:land Payload

Construct the payload from accumulated data:

- `deferred`: items the user chose to defer in Steps 3h and 4d
- `learnings`: from the completion-slice agent's `learnings` return field, plus any user-acknowledged debt from 5b
- `architectureDelta`: approved architecture changes from Step 3h (`approvedArchitectureDelta`)

```bash
echo '{"deferred":[...],"learnings":[...],"architectureDelta":[...]}' | $GP slice:land --epic $EPIC_NAME --slice $SLICE_NAME --json
```

If the CLI command fails, stop with the error message. In particular, if `slice:land` fails with invariant violation (`slice.code-refinement-converged-before-land`), inform user: "Code refinement must converge before landing. Run `/gp:implement-slice` to complete code refinement first."

## Step 6 -- Epic Completion Detection

After successful landing:

```bash
$GP slice:list --epic $EPIC_NAME --json
```

Parse the JSON output. Check if all slices are in a terminal state (`completed`, `abandoned`, or `landed`).

- **All terminal**: "All slices are complete. Run `/gp:complete-epic` when ready."
- **Not all terminal**: "Slice landed. Next unfinished slice: {name} (phase: {phase}). Run `/gp:plan-slice {name}` or `/gp:implement-slice {name}`."

## Step 7 -- Expertise Check + Done Summary

### 7a. Expertise Check

Use the guard pattern and format from expertise-tracking.md (auto-included above).

Reflect on the conversation: did landing this slice reveal new information about the user's expertise? If expertise data should be updated, follow the guard and format from the reference. If no new information, skip silently.

### 7b. Done Summary

Present results to the user:

```
**Slice Landed**
- **Slice**: {SLICE_NAME}
- **Architecture updates**: {count applied} applied, {count deferred} deferred
- **Side quests created**: {count}
- **Learnings captured**: {count}
- **Findings triaged**: {promoteCount} promoted, {cullCount} culled, {mergeCount} merged
- **Next**: {next step suggestion from Step 6}
```

## Sub-Agent Tool Restrictions

| Agent | allowedTools | Rationale |
|---|---|---|
| completion-slice | Read, Grep, Glob, Write | Reads slice artifacts, writes completion files |
| completion-side-quest | Read, Grep, Glob | Reads findings + architecture for context (no writes -- proposals returned as data) |

All agents: `disallowedTools: ["Agent"]` -- enforces flat hierarchy.

## Error Handling

@${CLAUDE_PLUGIN_ROOT}/skills/_references/orchestrator-error-handling.md

Additional cases:
- **`slice:land` invariant failure** (`slice.code-refinement-converged-before-land`): Inform user that code refinement must converge first. Suggest `/gp:implement-slice`.
- **`quest:create` failure in Steps 4d/5b**: Log the error, inform the user (e.g., "Side quest already exists -- skipping"), and continue. Do not stop the landing flow.
- **Missing git history for PLAN_SLUG**: If no commits match `[${PLAN_SLUG}]`, stop: "No implementation commits found for this slice. Verify the slice was implemented."
- **Agent-return cache corruption**: If `$TMPDIR/agent-return.cache` cannot be parsed as JSON, delete it and re-spawn the agent.

## Cleanup

On successful completion (no errors), delete the temp directory:
```bash
rm -rf $TMPDIR
```

On any error, preserve it for debugging and log:
```
[land-slice] Artifacts preserved at: $TMPDIR
```
