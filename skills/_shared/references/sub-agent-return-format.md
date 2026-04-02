# Sub-Agent Return Format

All sub-agents spawned by pipeline orchestrators return a structured JSON object as their final message. The orchestrator parses this to decide next steps.

## Return Shape

```json
{
  "status": "SUCCESS | PARTIAL | FAILED",
  "summary": "one-line description of what happened",
  "filesWritten": ["path1", "path2"],

  "score": 8,
  "reviewers": ["reviewer-holistic", "reviewer-software-architecture"],

  "triggeredConditions": [
    { "entityType": "decision", "title": "...", "condition": "..." }
  ],

  "questions": [
    { "question": "...", "context": "why this matters" }
  ],
  "researchTopics": [
    { "topic": "...", "context": "what to look for and why" }
  ],
  "continuationFile": "path",

  "review": "full review text (reviewer agents only)"
}
```

## Field Descriptions

| Field | Required | Type | Description |
|---|---|---|---|
| `status` | yes | `"SUCCESS" \| "PARTIAL" \| "FAILED"` | Outcome of the agent's work |
| `summary` | yes | `string` | One-line description for orchestrator logging |
| `filesWritten` | yes | `string[]` | Paths written by this agent (empty array if none) |
| `score` | no | `number` | 1-10 score (reviewer and synthesis agents) |
| `reviewers` | no | `string[]` | Selected reviewer names (refinement-coordinator only) |
| `triggeredConditions` | no | `array` | Decisions/learnings whose conditions were triggered |
| `questions` | no | `array` | Questions for the user (PARTIAL status only) |
| `researchTopics` | no | `array` | Topics to research (PARTIAL status only) |
| `continuationFile` | no | `string` | Path to continuation file (PARTIAL status only) |
| `review` | no | `string` | Full review text (reviewer agents — orchestrator writes to file) |

## Status Meanings

- **SUCCESS** — agent completed its task. Orchestrator advances.
- **PARTIAL** — agent needs help (user answers, research). `questions` and `researchTopics` specify what's needed. `continuationFile` enables re-spawn.
- **FAILED** — unrecoverable error. Orchestrator surfaces to user.

## Agent-Specific Return Fields

| Agent Type | Required Fields Beyond Base | Notes |
|---|---|---|
| plan-phase | `filesWritten` | Plan draft path |
| refinement-coordinator | `reviewers` | List of reviewer agent names to spawn |
| reviewer-* | `score`, `review` | Score + full review text (orchestrator writes to file) |
| synthesis | `score` | Aggregate score across all reviewers |
| editor | `filesWritten` | Modified artifact paths |

<!-- Sync: TypeScript validation schema lives in tools/dogfood/ — update both when changing fields -->
