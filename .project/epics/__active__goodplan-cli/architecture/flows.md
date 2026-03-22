# Key Flows

## State Transition (Generic)

Every workflow command follows this pattern. The state machine sees the complete project state as a single object and returns a new version. The RPC layer handles serialization.

1. **Commands layer**: parse input (flags + stdin), validate with Zod schema
2. **RPC layer**: load state (from cache or full assembly)
3. **RPC layer**: build `StateEvent` from command parameters, call `reduce(state, event)`
4. **State Machine**: validate transition using current state + event payload, run guards → return new state or error
5. **RPC layer**: diff old state vs new state, write only changed files via Data Layer
6. **RPC layer**: update state cache
7. **RPC layer**: return result to Commands layer
8. **Commands layer**: format and output result

If the State Machine returns an error at step 4, nothing is written — the RPC layer short-circuits before calling `commitState`.

The state machine may update multiple files in a single transition — e.g., updating `slice.json` status, appending to `activity-log.jsonl`, and updating `project.json` active pointers. Individual file writes are atomic (write-to-temp + rename), but the set of writes is not transactional. If the process crashes mid-write, some files may be updated and others not. Recovery: the state cache is written last; on cache miss, `assembleState()` rebuilds from individual files and reconciles. Write ordering: entity JSON files first, JSONL appends second, state cache last.

## `goodplan init --name my-project`

Project initialization goes through the state machine like any other transition. This ensures the state machine is the single authority on what the initial `.project/` structure looks like.

1. Commands parses flags: `--name my-project`
2. Commands checks `cwd/.project/` directly (NOT `resolveProjectDir()` walk-up). If exists, returns `STATE_ALREADY_INITIALIZED` immediately — no need to load state.
3. Data Layer: `assembleState()` — `.project/` doesn't exist, returns zero state (`{ type: "directory", contents: {} }`)
4. RPC calls State Machine: `reduce(zeroState, { type: 'INIT_PROJECT', name: 'my-project' })`
5. State Machine:
   - Validates no project exists in state (guard: `project.json` key absent)
   - Returns new state with `project.json` populated (name, version, timestamps, null active pointers), `epics/overview.json`, `slices/overview.json`, `quests/overview.json` (all empty collections), and `activity-log.jsonl` with init entry
6. Data Layer: `commitState(zeroState, newState)` — for each new key, creates parent directories and writes files. This creates `.project/`, `.project/epics/`, `.project/slices/`, `.project/quests/`, and all initial JSON/JSONL files.
7. Commands outputs result

**Note**: The tracer bullet's `init` implementation writes `project.json` directly (bypassing state machine and RPC). This is refactored in slice 03/04 when the state machine is available. The data layer (slice 02) prepares for this by implementing `assembleState()` zero-state behavior and `commitState()` directory creation.

## `goodplan slice:plan --slice 01-auth --json`

1. Commands parses flags: `--slice 01-auth`, `--json`
2. RPC loads unified state (cache or full assembly)
3. RPC calls State Machine: `reduce(state, { type: 'BEGIN_PLAN', slice: '01-auth' })`
4. State Machine:
   - Reads `slices/01-auth/slice.json` from state → status is `created`
   - Checks guard: previous slice completed/abandoned or this is the first slice
   - Returns new state with `slice.json` status → `planning`, activity log entry appended
5. RPC diffs: `slice.json` changed, `activity-log.jsonl` has new entry → writes both, updates cache
6. RPC assembles response metadata: slice goal, epic name, active decisions (titles)
7. Commands outputs JSON result

If the sub-agent calls with `--inline`, step 6 additionally inlines prioritized content (slice goal text, current architecture overview, target architecture overview, conventions) up to the budget, with remaining files as path references.

## `goodplan slice:complete --slice 01-auth --json` (with stdin)

The completion flow has a defined ordering. The state machine enforces it via guards on the input.

1. Commands parses flags and reads stdin JSON:
   ```json
   {
     "verificationPassed": true,
     "deferred": [{ "description": "...", "targetSlice": "03-rpc" }],
     "architectureDelta": [{ "subsystem": "auth", "type": "modify", "description": "..." }],
     "learnings": [{ "category": "domain", "summary": "...", "detail": "...", "tags": [], "rollupTo": ["epic", "project"] }]
   }
   ```
2. RPC loads unified state
3. RPC calls State Machine: `reduce(state, { type: 'COMPLETE_SLICE', slice: '01-auth', ...input })`
4. State Machine:
   - Reads slice status → `implementation-complete`
   - **Verification guard**: checks `input.verificationPassed === true`. If false, returns error — slice stays in `implementation-complete`, response indicates more work needed. Note: `verificationPassed` is a human/orchestrator assertion — the caller (orchestrator skill or user) reviews implementation results and decides whether verification criteria are met, then asserts the result in the `slice:complete` stdin payload. The CLI does not automatically determine verification.
   - Updates `slice.json` status → `complete`
   - Appends deferred items to target slice's `slice.json` deferred array
   - Appends learnings to `slices/01-auth/learnings.jsonl`
   - If any learnings have non-empty `rollupTo`, appends to the specified scope-level `learnings.jsonl` files
   - Appends activity log entry
   - **Implicit transition check**: scans all slices for the epic — if all complete, adds a note to the response (does not auto-transition the epic)
   - Returns new state with architecture paths for LLM to update
5. RPC diffs and writes all changed files, updates cache
6. RPC returns result including:
   - Architecture delta paths (directories where the LLM should update project-level architecture)
   - Whether all slices are complete (epic may need completion)
7. Commands outputs JSON result

## `goodplan status --json`

Read-only — derives status from the unified state tree.

1. Commands parses flags
2. RPC loads unified state
3. RPC reads active pointers from `project.json` (epic, slice, quest)
4. RPC reads active entity metadata for current status
5. RPC traverses `DirectoryEntry.contents` to count artifacts (research files, architecture files, etc.)
6. RPC checks for implicit conditions (all slices complete? verification criteria missing?)
7. RPC assembles status: active work, current phase, artifact counts, recommendations for next action
8. Commands outputs JSON result

## Epic Activation (`goodplan epic:activate --epic goodplan-cli`)

1. Commands parses flags
2. RPC loads unified state
3. RPC calls State Machine: `reduce(state, { type: 'ACTIVATE_EPIC', epic: 'goodplan-cli' })`
4. State Machine runs activation guards:
   - **No other active epic**: checks `project.json` → `activeEpic` is null
   - **Verification criteria exist**: checks `epic.json` → `verifications` array is non-empty
   - If either guard fails → error with specific code (`STATE_EPIC_ALREADY_ACTIVE` or `STATE_MISSING_VERIFICATIONS`)
5. State Machine returns new state: `epic.json` status updated, `project.json` `activeEpic` set, activity log appended
6. RPC diffs and writes changed files, updates cache
7. Commands outputs result

## Sub-Agent Flow: `slice:plan` (Orchestrator/Sub-Agent Sequence)

This shows the full two-actor sequence for a plan phase. Other sub-agent phases (implementation, explore, architecture, etc.) follow the same pattern.

1. **Orchestrator** calls `goodplan slice:plan --slice 01-auth --json`
   - Commands → RPC → State Machine: `reduce(state, { type: 'BEGIN_PLAN', slice: '01-auth' })`
   - State machine transitions slice to `planning`
   - Response includes slice goal, epic name, paths to relevant files
2. **Orchestrator** spawns a sub-agent with instructions to write a plan
3. **Sub-agent** calls `goodplan start-plan --slice 01-auth --inline`
   - Commands → RPC → `startContext('plan', { type: 'slice', name: '01-auth' }, { inlineContext: true })`
   - Read-only: assembles context bundle (slice goal, architecture, conventions, decisions, learnings) inlined up to budget
   - Returns: `{ inline: { "slice-goal": "...", "architecture-overview": "...", ... }, references: [...], decisions: [...] }`
4. **Sub-agent** writes plan markdown directly to `.project/slices/01-auth/plan.md`
5. **Sub-agent** calls `goodplan submit-plan --slice 01-auth` (with optional learnings via stdin)
   - Commands → RPC → `submit('plan', { type: 'slice', name: '01-auth' }, { phase: 'plan' }, {})`
   - State machine: `reduce(state, { type: 'COMPLETE_PLAN', slice: '01-auth' })`
   - Guard checks `hasChild(state, "slices/01-auth", "plan.md")` — plan.md must exist in the state tree
   - Slice transitions to `plan-created`
6. **Orchestrator** receives sub-agent completion, continues workflow (e.g., `slice:refine-plan`)

Key points:
- The orchestrator never sees plan content — it stays in the sub-agent's context
- `start-plan` is read-only; `submit-plan` is the state transition trigger
- The sub-agent writes content to the filesystem; `submit-plan` carries no content payload

## Learnings Rollup (`goodplan learning:rollup --from slices/01-auth --to project`)

1. Commands parses flags
2. RPC loads unified state
3. RPC calls State Machine: `reduce(state, { type: 'ROLLUP_LEARNINGS', from: 'slices/01-auth', to: 'project' })`
4. State Machine:
   - Reads source `learnings.jsonl` from state
   - Filters entries where `rollupTo` includes the target scope
   - Appends filtered entries to target `learnings.jsonl` (preserving `source` field)
   - Appends activity log entry
   - Returns new state
5. RPC diffs and writes, updates cache
6. Commands outputs count of rolled-up entries
