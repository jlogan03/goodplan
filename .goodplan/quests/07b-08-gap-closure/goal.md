# Quest: Slice Gap Closure (04, 07b, 08)

## Goal

Close implementation gaps between what slices 04, 07b, and 08 actually built vs what their original goal.md files specified.

## 04 Gaps — Refinement Loop CLI Surface

The trust layer logic (convergence evaluator, circuit breaker, extractors) was built, but the CLI command surface was not. The original slice 04 goal explicitly lists these commands as in-scope:

### Refinement Commands (8 commands)
- `refine:start` — start a refinement round (emits `refinement-round-started`)
- `refine:score` — record reviewer score (emits `reviewer-scored`)
- `refine:synthesize` — merge reviewer feedback (emits `refinement-synthesized`)
- `refine:revise` — record artifact revision (emits `artifact-revised`)
- `refine:evaluate` — evaluate convergence (emits `refinement-converged` or continues)
- `refine:converge` — mark refinement as converged
- `refine:stuck` — trigger circuit breaker (emits `refinement-circuit-breaker-tripped`)
- `refine:override` — override convergence threshold (emits `convergence-overridden`)

### Missing Refinement Event Types (7 events)
- `refinement-round-started`, `reviewer-scored`, `refinement-synthesized`, `artifact-revised`, `refinement-converged`, `refinement-circuit-breaker-tripped`, `convergence-overridden`

### Missing Tests
- Refinement loop integration tests (start → score → synthesize → revise → evaluate → converge)
- Circuit breaker trigger test
- Override test

**Note:** Current skills use `start-refinement`/`submit-refinement` subagent commands which work for the current workflow. The `refine:*` commands add granular event-sourcing for the refinement process itself, enabling audit trails and derived state for refinement history.

## 07b Gaps — Missing CLI Commands

### Side-Quest Commands (7 commands)
- `side-quest:create` — create a new side quest
- `side-quest:start` — begin implementation (or `side-quest:implement-start`)
- `side-quest:land` — complete and land a side quest
- `side-quest:abandon` — abandon a side quest
- `side-quest:list` — list all side quests
- `side-quest:show` — show side quest details

Note: Check if the existing `quest:*` commands already cover this or if `side-quest:*` is a distinct namespace in the architecture.

### Missing Entity Commands (10 commands)
- `finding:show` — show finding details (capture/list/triage exist)
- `briefing:generate` — generate briefing from events (we built `briefing:write` which takes stdin; `generate` may auto-produce from event log)
- `briefing:list` — list all briefings (we only built `briefing:latest`)
- `decision:record` — record a new decision (we have decision:create but original says `record`)
- `decision:supersede` — supersede an existing decision
- `learning:capture` — capture a new learning
- `learning:promote` — promote a learning to a higher scope
- `invariant:show` — show invariant details (we have list/check/propose/activate/deactivate)
- `invariant:enable` — enable an invariant (may map to `activate`?)
- `invariant:disable` — disable an invariant (may map to `deactivate`?)

### Missing Integration Tests
- Side-quest lifecycle: create → implement-start → chunk-start → chunk-verify → land
- Decision lifecycle: record → supersede → list/show
- Learning lifecycle: capture → promote → list/show

## 08 Gaps — Missing Tests + Depth

### Agent SDK Harness Test
- Create `tools/dogfood/test-core-skills-v2.ts`
- Test `/gp:init`, `/gp:status`, `workflow-guide` loading
- Follow pattern from existing `test-init.ts`, `test-plugin-skills.ts`

### Skill Rewrite Depth
- Review whether the incremental updates to the 5 skills are sufficient or if deeper rewrites are needed per the original goal's "rewrite for v2" language

## Approach

1. First, audit which commands already exist under different names (quest:* may cover side-quest:*, decision:create may be decision:record, activate/deactivate may be enable/disable)
2. Build only the genuinely missing commands
3. Add missing integration tests
4. Create the Agent SDK harness test for slice 08
