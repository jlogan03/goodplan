# Key Flows

## State Transition (Generic)

Every workflow command follows this pattern. The state machine sees the complete project state as a single object and returns a new version. The RPC layer handles serialization.

1. **Commands layer**: parse input (flags + stdin), validate with Zod schema
2. **RPC layer**: load state (from cache or full assembly), recompute `_derived` fields
3. **RPC layer**: pass `(state, event, input)` to State Machine
4. **State Machine**: validate transition using current state + input, run guards → return new state or error
5. **RPC layer**: diff old state vs new state, write only changed files via Data Layer
6. **RPC layer**: update state cache
7. **RPC layer**: return result to Commands layer
8. **Commands layer**: format and output result

If the State Machine returns an error at step 4, nothing is written. No partial state updates.

The state machine may update multiple files in a single transition — e.g., updating `slice.json` status, appending to `activity-log.jsonl`, and updating `project.json` active pointers. The diff-and-write step handles all of these atomically.

## `goodplan begin plan --slice 01-auth --json`

1. Commands parses flags: `--slice 01-auth`, `--json`
2. RPC loads unified state (cache + derived recompute)
3. RPC calls State Machine: `reduce(state, 'BEGIN_PLAN', { slice: '01-auth' })`
4. State Machine:
   - Reads `slices/01-auth/slice.json` from state → status is `defined`
   - Checks guard: previous slice complete or this is the first slice
   - Checks `_derived`: slice goal exists
   - Returns new state with `slice.json` status → `planning`, activity log entry appended
5. RPC diffs: `slice.json` changed, `activity-log.jsonl` has new entry → writes both, updates cache
6. RPC assembles response metadata: slice goal, epic name, active decisions (titles)
7. Commands outputs JSON result

If the sub-agent calls with `--inline-context`, step 6 additionally inlines prioritized content (slice goal text, current architecture overview, target architecture overview, conventions) up to the budget, with remaining files as path references.

## `goodplan complete --slice 01-auth --json` (with stdin)

The completion flow has a defined ordering. The state machine enforces it via guards on the input.

1. Commands parses flags and reads stdin JSON:
   ```json
   {
     "verificationPassed": true,
     "deferred": [{ "description": "...", "targetSlice": "03-rpc" }],
     "architectureDelta": [{ "subsystem": "auth", "type": "modify", "description": "..." }],
     "learnings": [{ "category": "domain", "summary": "...", "rollup": true }]
   }
   ```
2. RPC loads unified state
3. RPC calls State Machine: `reduce(state, 'COMPLETE', input)`
4. State Machine:
   - Reads slice status → `implementing`
   - **Verification guard**: checks `input.verificationPassed === true`. If false, returns error — slice stays in `implementing`, response indicates more work needed.
   - Updates `slice.json` status → `complete`
   - Appends deferred items to target slice's `slice.json` deferred array
   - Appends learnings to `slices/01-auth/learnings.jsonl`
   - If any learnings have `rollup: true`, appends to project-level `learnings.jsonl`
   - Appends activity log entry
   - **Implicit transition check**: scans all slices for the epic — if all complete, adds a note to the response (does not auto-transition the epic)
   - Returns new state with architecture paths for LLM to update
5. RPC diffs and writes all changed files, updates cache
6. RPC returns result including:
   - Architecture delta paths (directories where the LLM should update project-level architecture)
   - Whether all slices are complete (epic may need completion)
7. Commands outputs JSON result

## `goodplan context plan --slice 01-auth --json --inline-context`

Read-only — no state changes.

1. Commands parses flags
2. RPC loads unified state (for entity metadata) — no state machine call needed
3. RPC reads `slice.json` to determine the slice's epic
4. RPC reads `epic.json` for epic goal and verification criteria
5. RPC assembles content list in priority order:
   - Slice goal (from `slice.json`)
   - Current architecture overview (project-level `architecture/`)
   - Target architecture overview (epic-level `architecture/`)
   - Conventions (`.project/conventions.md`)
   - Active decisions (from `decisions.jsonl`)
   - Recent learnings (from `learnings.jsonl`)
6. With `--inline-context`: inlines content in priority order up to budget, remaining as path references
7. Without `--inline-context`: all content as path references only
8. Commands outputs JSON result

## `goodplan status --json`

Read-only — derives status from unified state + derived fields.

1. Commands parses flags
2. RPC loads unified state
3. RPC reads active pointers from `project.json` (epic, slice, quest)
4. RPC reads active entity metadata for current status
5. RPC uses `_derived` fields to report sub-phase progress (artifact counts)
6. RPC checks for implicit conditions (all slices complete? verification criteria missing?)
7. RPC assembles status: active work, current phase, artifact counts, recommendations for next action
8. Commands outputs JSON result

## Epic Activation (`goodplan epic start --epic goodplan-cli`)

1. Commands parses flags
2. RPC loads unified state
3. RPC calls State Machine: `reduce(state, 'ACTIVATE_EPIC', { epic: 'goodplan-cli' })`
4. State Machine runs activation guards:
   - **No other active epic**: checks `project.json` → `activeEpic` is null
   - **Verification criteria exist**: checks `epic.json` → `verifications` array is non-empty
   - If either guard fails → error with specific code (`STATE_EPIC_ALREADY_ACTIVE` or `STATE_MISSING_VERIFICATIONS`)
5. State Machine returns new state: `epic.json` status updated, `project.json` `activeEpic` set, activity log appended
6. RPC diffs and writes changed files, updates cache
7. Commands outputs result

## Learnings Rollup (`goodplan learning rollup --from slices/01-auth --to project`)

1. Commands parses flags
2. RPC loads unified state
3. RPC calls State Machine: `reduce(state, 'ROLLUP_LEARNINGS', { from: 'slices/01-auth', to: 'project' })`
4. State Machine:
   - Reads source `learnings.jsonl` from state
   - Filters entries where `rollup: true`
   - Appends filtered entries to target `learnings.jsonl` (preserving `source` field)
   - Appends activity log entry
   - Returns new state
5. RPC diffs and writes, updates cache
6. Commands outputs count of rolled-up entries
