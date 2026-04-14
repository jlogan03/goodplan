# Current System Snapshot (cycle 1, 2026-04-07)

Quick grounding scan to anchor the delta analysis. Not exhaustive — pulls only the structural facts that matter for the redesign.

## Skills (13)

Located in `plugin/skills/`. Line counts give a rough sense of orchestrator weight:

| Skill | LoC | Role |
|---|---|---|
| init | 205 | Bootstrap project |
| upgrade | 333 | Migrate / restructure |
| workflow-guide | 82 | Always-on orientation |
| status | 394 | "Where am I, what next" — biggest skill |
| task | 75 | Quick capture |
| explore | 335 | Research/brainstorm cycles |
| create-epic | 408 | Goal → exploration → architecture → slices |
| start-epic | 155 | Architecture review → activate |
| plan-slice | 121 | Plan an active slice |
| implement | 358 | Autonomous build → review loop → complete |
| complete-epic | 412 | Cross-slice rollup |
| create-side-quest | 175 | Off-ramp for follow-ups |
| audit | 208 | Quality scans |

Total ~3.3k lines of skill prose. Most skills are orchestrators that drive sub-agents through CLI state transitions.

## State machine

`src/core/state/transitions/` — 23 transition files, each one CLI verb. Highlights:

- `epic-create / epic-verify / epic-phase / epic-refine / epic-lifecycle` — epic flow
- `slice-create / slice-plan / slice-implement / slice-submit / slice-complete / slice-abandon`
- `quest-*` parallel set
- `task-create / task-lifecycle`
- `decision`, `rollup-learnings`, `init`

Helpers file is 20k bytes — most validation logic lives there. **No reverse transitions** anywhere (e.g., `implementing → planning`). Abandon is the only escape; recreate is the only re-entry.

## Context bundles

`src/core/context/types.ts` shape:

```ts
ContextBundle = { inline, references, decisions, learnings }
```

- **One-pass**: priority table per phase (`priorities.ts`, 9k bytes) → inline up to budget → overflow to references.
- No relevance scoring, no import-graph filtering, no excluded-reasons telemetry.
- Decisions/learnings filtered structurally only (status, scope), not by semantic relevance.
- Priority table is hand-curated per phase; no per-task tuning.

## Vision doc status (`docs/Target Workflow Vision.md`)

The Vision already specifies most of the ideal end-state:

- State protection via hooks ✅ (shipped)
- Two-pass context retrieval ⚠️ (Pass 1 partial, Pass 2 missing)
- Tech debt as entity ❌ (not built)
- Discovery checkpoints mid-implementation ❌ (not built)
- Architecture pre-mortem ❌ (not built)
- Back-transitions ❌ (not built)
- Phase-skipping / lightweight path ❌ (not built)
- Autonomy progression ❌ (not built)
- Alignment checkpoints (status summary at slice start) ⚠️ (status skill exists; doesn't do confirmation loop)
- Pre-planning interview protocol ⚠️ (plan-slice has Q&A, not the structured protocol)
- Telemetry backend ❌ (not built)
- Intervention system ❌ (not built)

So this exploration is partly "redesign" and partly "actually finish executing the Vision the user already wrote." The pain points the user surfaced suggest the Vision is right in spirit but needs sharpening on the four specific axes (transitions, context, rigidity, steering).

## Pain point traceability

| User pain | Where it lives |
|---|---|
| Clunky transitions | Each skill ends with "next: run /gp:foo" — user must manually fire it. No auto-handoff, no resume affordance after compaction. |
| Wrong context bundles | One-pass priority table; no blast-radius filtering; no relevance scoring; no excluded-reasons feedback. |
| Rigid state machine | 23 forward-only transitions, no reverse, no skip, no lightweight path. |
| Steering vs autonomy | `implement` skill is 358 lines of "fully autonomous." Only escape is AskUserQuestion on errors. No mid-flight "I noticed X, OK to continue?" checkpoints. |
