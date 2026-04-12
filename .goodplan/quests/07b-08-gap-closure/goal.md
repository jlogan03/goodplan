# Quest: 07b-08 Gap Closure

## Goal

Close implementation gaps between what slices 07b and 08 actually built vs what their original goal.md files specified.

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
