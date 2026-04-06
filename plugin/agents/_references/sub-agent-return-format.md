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
| `reviewers` | no | `string[]` | Selected reviewer names (reserved for future coordinator agent) |
| `triggeredConditions` | no | `array` | Decisions/learnings whose conditions were triggered |
| `questions` | no | `array` | Questions for the user (PARTIAL status only) |
| `researchTopics` | no | `array` | Topics to research. On PARTIAL: "I need research help." On SUCCESS (synthesis agent only): forwarded RESEARCH_NEEDED items for the orchestrator to handle. |
| `continuationFile` | no | `string` | Path to continuation file (PARTIAL status only) |
| `review` | no | `string` | Full review text (reviewer agents — orchestrator writes to file) |

## Status Meanings

- **SUCCESS** — agent completed its task. Orchestrator advances.
- **PARTIAL** — agent needs help (user answers, research). `questions` and `researchTopics` specify what's needed. `continuationFile` enables re-spawn.
- **FAILED** — unrecoverable error. Orchestrator surfaces to user.

## Agent-Specific Return Fields

Agents may include additional fields beyond the base Return Shape above. These fields are not in the base schema but are required for their specific agent type. The orchestrator should expect and handle them.

| Agent Type | Required Fields Beyond Base | Notes |
|---|---|---|
| plan-phase | `filesWritten` | Plan draft path |
| reviewer-* | `score`, `review` | Score + full review text (orchestrator writes to file) |
| synthesis | `score`, `criticalCount`, `importantCount`, `minorCount`, `hasUserInput`, `hasResearchNeeded`, `hasDirectlyActionable` | Aggregate score + structured counts + flags. Optional: `userInputQuestions`, `researchTopics` |
| editor | `filesWritten` | Modified artifact paths |
| implement-phase | `filesWritten`, `redGreenResults` | Changed files + RED/GREEN check results (`{ passed: boolean, hasUnexpectedPass: boolean, details: string }`) |
| completion-slice | `filesWritten`, `learnings`, `architectureDelta`, `recommendations`, `triggeredConditions` | Structured learnings + architecture deltas for CLI payload. `recommendations` is for orchestrator-side user decisions (side quest proposals, architecture updates, debt items) — not passed to the CLI directly. |
| completion-epic | `filesWritten`, `learnings`, `recommendations`, `verificationAssessments`, `triggeredConditions` | Cross-slice learnings (structured), architecture reconciliation, promotion list, verification assessments |
| slices-phase | `filesWritten`, `slices` | `slices: [{ name: string, goal: string }]` — structured metadata for CLI creation. Orchestrator uses this array (not file parsing) for `slice:create` calls. |
| onboard-phase | `filesWritten`, `onboardSummary` | `onboardSummary: { subsystems: string[], conventionsDetected: number, migrationsDetected: number, debtItemsDetected: number, hotSpots: number }` |
| audit-*-phase | `findings`, `scores`, `proposedSideQuests` | `findings: [{ severity, category, description, location, suggestion }]`, `scores: Record<string, number>`, `proposedSideQuests: [{ title, description }]`. Returns SUCCESS or FAILED only (no PARTIAL). Severity uses 4 levels (CRITICAL/IMPORTANT/MINOR/INFO) — adds INFO compared to the 3-level review system. |

<!-- Sync: TypeScript validation schema lives in tools/dogfood/ — update both when changing fields -->
