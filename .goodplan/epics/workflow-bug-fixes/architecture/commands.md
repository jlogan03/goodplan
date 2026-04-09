# Command Layer

~95 citty commands organized by entity namespace. Depends on all lower layers. Every command that mutates state does so by appending events through the engine layer.

## Global Flags

| Flag | Type | Behavior |
|---|---|---|
| `--json` | boolean | Output as JSON to stdout. Implies no interactive prompts. |
| `--query <jq>` | string | jq expression applied to JSON output |
| `--quiet` | boolean | Suppress non-essential output |
| `--verbose` | boolean | Extra diagnostic output |
| `--override=<reason>` | string | Override convergence gates. Scoped to `gp refine:*` commands only (not a global flag). Emits `convergence-overridden` event with reason. Never silent. |

## Error Codes

All CLI errors emit structured JSON to stderr:

```typescript
interface CLIError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// Defined as z.enum() for compile-time safety (see conventions.md)
type ErrorCode =
  | "INVARIANT_FAILED"     // Invariant check blocks event append
  | "SCHEMA_INVALID"       // Input fails Zod validation
  | "NOT_FOUND"            // Referenced entity/artifact doesn't exist
  | "ALREADY_EXISTS"       // Uniqueness constraint violated
  | "STATE_CONFLICT"       // Operation invalid for current derived state
  | "EVIDENCE_MISSING"     // Required verification evidence absent
  | "HOOK_BLOCKED"         // Pre-tool-use hook rejected operation
  | "CONFIGURATION_ERROR"  // Configuration issue (e.g., no applicable reviewers, missing rubric)
  | "CONVERGENCE_STUCK"    // Circuit breaker tripped
  | "USER_ABORTED"         // User cancelled interactive prompt
  | "INTERNAL";            // Unexpected error (bug)
```

## Command Tree

### Global Commands

| Command | Events Emitted | Purpose |
|---|---|---|
| `gp init` | `project-initialized`, `architecture-committed`, `conventions-committed`, `subsystem-registered` (per subsystem) | Bootstrap project |
| `gp status` | (read-only) | Derived state + `suggestedNextSteps` + latest briefing. Use `--json --query` for deep access to derived state (replaces the former `gp state` concept). |
| `gp schema` | (read-only) | Dump schemas (see Schema Command below) |
| `gp verify` | (read-only) | Validate event log integrity (see [engine.md](./engine.md#data-integrity-verification-gp-verify)) |
| `gp migrate` | (migration events) | v1 to v2 migration |

### Project Commands (`gp project:*`)

| Command | Events | Purpose |
|---|---|---|
| `gp project:show` | (read-only) | Project metadata |
| `gp project:set-steering` | `steering-preference-set` | Default steering preference |

### Epic Commands (`gp epic:*`)

| Command | Events | Purpose |
|---|---|---|
| `gp epic:create` | `epic-created` | Create epic directory + event log |
| `gp epic:list` | (read-only) | List epics |
| `gp epic:show` | (read-only) | Show epic state |
| `gp epic:goal-draft` | `epic-goal-drafted` | Draft epic goal artifact |
| `gp epic:goal-commit` | `epic-goal-committed` | Commit goal (runs extractor) |
| `gp epic:set-steering` | `epic-steering-preference-set` | Per-epic steering preference |
| `gp epic:architecture-draft` | `architecture-target-drafted` | Draft architecture-target |
| `gp epic:architecture-commit` | `architecture-target-committed` | Commit after refinement |
| `gp epic:architecture-shape-start` | `architecture-shape-checkpoint-reached` | Begin shape checkpoint |
| `gp epic:architecture-shape-approve` | `architecture-shape-approved` | User approves |
| `gp epic:architecture-shape-auto` | `architecture-shape-checkpoint-auto-shaped` | Auto-proceed per steering |
| `gp epic:pressure-test-draft` | `pressure-test-drafted` | Draft pressure test |
| `gp epic:pressure-test-commit` | `pressure-test-committed` | Commit pressure test |
| `gp epic:pressure-test-finding-disposition` | `pressure-test-finding-accepted` | Accept/dismiss finding |
| `gp epic:slices-draft` | `slice-set-drafted` | Draft slice set |
| `gp epic:slices-commit` | `slice-set-committed` | Commit slice set |
| `gp epic:slice-set-shape-start` | `slice-shape-checkpoint-reached` | Begin shape checkpoint |
| `gp epic:slice-set-shape-approve` | `slice-shape-approved` | User approves |
| `gp epic:slice-set-shape-auto` | `slice-shape-checkpoint-auto-shaped` | Auto-proceed |
| `gp epic:activate` | `epic-activated` | Activate epic (P6) |
| `gp epic:pause` | `epic-paused` | Pause active epic |
| `gp epic:resume` | `epic-resumed` | Resume paused epic |
| `gp epic:complete` | `epic-completed` | Complete epic (auto-triggered by final P12) |
| `gp epic:abandon` | `epic-abandoned` | Abandon epic |
| `gp epic:explore-start` | `exploration-cycle-started` | Start exploration cycle |
| `gp epic:explore-conclude` | `exploration-concluded` | Conclude exploration |
| `gp epic:research-capture` | `research-captured` | Capture research artifact |
| `gp epic:brainstorm-capture` | `brainstorm-captured` | Capture brainstorm artifact |

### Slice Commands (`gp slice:*`)

| Command | Events | Purpose |
|---|---|---|
| `gp slice:create` | `slice-created` | Create slice within epic |
| `gp slice:list` | (read-only) | List slices |
| `gp slice:show` | (read-only) | Show slice state |
| `gp slice:plan-draft` | `slice-plan-drafted` | Draft implementation plan |
| `gp slice:plan-commit` | `slice-plan-committed` | Commit plan (runs extractor) |
| `gp slice:plan-shape-start` | `plan-shape-checkpoint-reached` | Begin shape checkpoint |
| `gp slice:plan-shape-revise` | `plan-shape-revision-proposed` | Propose revision to shaped plan |
| `gp slice:plan-shape-approve` | `plan-shape-approved` | User approves plan |
| `gp slice:plan-shape-auto` | `plan-shape-checkpoint-auto-shaped` | Auto-proceed |
| `gp slice:implement-start` | `slice-implementation-started` | Begin implementation (P10) |
| `gp slice:chunk-start` | `slice-implementation-chunk-started` | Start chunk |
| `gp slice:chunk-red-written` | `chunk-red-test-written` | Red test written |
| `gp slice:chunk-red-failed` | `chunk-red-test-failed` | Red test confirmed failing |
| `gp slice:chunk-green` | `chunk-green-achieved` | Green achieved |
| `gp slice:chunk-verify` | `chunk-verified` | Chunk verified with evidence |
| `gp slice:chunk-unverifiable` | `chunk-unverifiable` | Cannot verify |
| `gp slice:chunk-decide` | `chunk-unverifiable-decided` | User decides on unverifiable |
| `gp slice:code-refine-start` | `slice-code-refinement-started` | Begin code refinement (P11) |
| `gp slice:code-refine-commit` | `code-refinement-converged` | Code refinement converged |
| `gp slice:land` | `slice-landed` | Land slice (P12) |
| `gp slice:abandon` | `slice-abandoned` | Abandon slice |

### Side-Quest Commands (`gp side-quest:*`)

| Command | Events | Purpose |
|---|---|---|
| `gp side-quest:create` | `side-quest-created` | Create side quest |
| `gp side-quest:list` | (read-only) | List side quests |
| `gp side-quest:show` | (read-only) | Show side quest state |
| `gp side-quest:goal-commit` | `side-quest-goal-committed` | Commit goal |
| `gp side-quest:plan-draft` | `side-quest-plan-drafted` | Draft plan |
| `gp side-quest:plan-shape-approve` | `side-quest-plan-shape-approved` | Approve plan |
| `gp side-quest:plan-commit` | `side-quest-plan-committed` | Commit plan |
| `gp side-quest:implement-start` | `side-quest-implementation-started` | Begin implementation |
| `gp side-quest:chunk-start` | `side-quest-chunk-started` | Start chunk (simplified subset of slice chunk model: no red/green TDD cycle, verification only) |
| `gp side-quest:chunk-verify` | `side-quest-chunk-verified` | Verify chunk |
| `gp side-quest:land` | `side-quest-landed` | Land side quest |
| `gp side-quest:abandon` | `side-quest-abandoned` | Abandon |

### Refinement Commands (`gp refine:*`)

Artifact-agnostic refinement loop. These commands are used by all skills that run refinement.

| Command | Events | Purpose |
|---|---|---|
| `gp refine:start` | `refinement-round-started` | Begin refinement round |
| `gp refine:score` | `reviewer-scored` | Record reviewer scores |
| `gp refine:synthesize` | `refinement-synthesized` | Record synthesis of reviewer feedback |
| `gp refine:revise` | `artifact-revised` | Record artifact revision |
| `gp refine:evaluate` | (read-only) | Evaluate convergence state (read-only despite `refine:` namespace -- scores but does not mutate) |
| `gp refine:converge` | `refinement-converged` | Record convergence achieved |
| `gp refine:stuck` | `refinement-circuit-breaker-tripped` | Record circuit breaker |
| `gp refine:override` | `convergence-overridden` | Override with reason |

### Trust Substrate Commands

| Command | Events | Purpose |
|---|---|---|
| `gp finding:capture` | `finding-captured` | Capture discovery (replaces `gp task:create`) |
| `gp finding:list` | (read-only) | List findings |
| `gp finding:triage` | `finding-triaged` | Triage finding at milestone |
| `gp briefing:write` | `briefing-written` | Write briefing at pause |
| `gp briefing:latest` | (read-only) | Read latest briefing |
| `gp invariant:list` | (read-only) | List invariants |
| `gp invariant:propose` | `invariant-proposed` | Propose custom invariant |
| `gp invariant:activate` | `invariant-activated` | Activate proposed |
| `gp invariant:deactivate` | `invariant-deactivated` | Deactivate |
| `gp invariant:check` | (read-only) | Run all invariants |
| `gp subsystem:register` | `subsystem-registered` | Register subsystem |
| `gp subsystem:update-maturity` | `subsystem-maturity-updated` | Update maturity |
| `gp subsystem:retire` | `subsystem-retired` | Retire subsystem |
| `gp subsystem:list` | (read-only) | List subsystems |
| `gp subsystem:show` | (read-only) | Show subsystem details |

### Query Commands

| Command | Events | Purpose |
|---|---|---|
| `gp reviewer:list` | (read-only) | List registered reviewers |
| `gp reviewer:show <id>` | (read-only) | Show reviewer details |
| `gp rubric:list` | (read-only) | List rubrics |
| `gp rubric:show <name>` | (read-only) | Show rubric |
| `gp rubric:validate <name>` | (read-only) | Validate rubric schema |
| `gp decision:record` | `decision-recorded` | Record decision |
| `gp decision:list` | (read-only) | List decisions |
| `gp decision:show` | (read-only) | Show decision |
| `gp decision:supersede` | `decision-superseded` | Supersede decision (distinct from `decision-recorded`) |
| `gp learning:capture` | `learning-captured` | Capture learning |
| `gp learning:list` | (read-only) | List learnings |
| `gp learning:promote` | `learning-promoted` | Promote learning (was `rollup`) |
| `gp events:tail` | (read-only) | Tail event log |
| `gp events:query` | (read-only) | Query events by type/scope/time |

## Verify Command (`gp verify`)

Validates event log structural integrity. Performs 5 checks:

1. **JSON validity** -- every line in `events.jsonl` parses as valid JSON
2. **Schema conformance** -- every event matches its Zod schema (dispatched by `type` field)
3. **prevId chain integrity** -- the chain is unbroken from first event (`prevId: null`) to last, with no forks or gaps
4. **ContentRef SHA validity** -- `git cat-file -t <sha>` confirms each referenced blob exists (warns but does not fail if blob is missing, since gc may have collected it)
5. **schemaVersion monotonicity** -- `schemaVersion` never decreases within a scope

**Output:** `{ ok: boolean; errors: Array<{ line: number; check: string; message: string }> }`

**Exit codes:** `0` if all checks pass, `1` if any fail.

**Scope:** Verifies all scopes (project + all epic + all side-quest event logs) by default. Use `--scope=<scopeRef>` to verify a single scope.

Cross-reference: [engine.md](./engine.md#data-integrity-verification-gp-verify) for implementation details.

## Schema Command (`gp schema`)

The schema command is the self-documentation surface for skills and external tooling.

| Subcommand | Output |
|---|---|
| `gp schema` | Full command tree with args/stdin/stdout schemas |
| `gp schema --command <cmd>` | Per-command detail: args, events emitted, output shape |
| `gp schema --events` | Event type catalog with payload Zod schemas (JSON Schema format) |
| `gp schema --agent-return` | AgentReturn discriminated union schema |
| `gp schema --output <cmd>` | JSON Schema for a specific command's `--json` output |

All output is JSON Schema (draft 2020-12) generated from the Zod definitions in `src/schemas/`. Skills use `gp schema --events` to validate event payloads and `gp schema --output <cmd>` to parse command output safely.

## Command Output Contracts

### Universal Mutating Command Output

Every mutating command returns the same envelope when `--json` is set:

```typescript
interface MutatingCommandOutput {
  ok: true;
  event: string;    // event ID (UUID)
  entity: string;   // affected entity ref (e.g., "epic:workflow-bug-fixes")
  phase?: string;   // new phase if a phase transition occurred
}
```

### Collection and Entity Output Patterns

List commands return `{ items: T[], total: number }`. Show commands return `T` directly. These patterns apply to all entity list/show commands unless otherwise noted.

### Key Read-Only Command Output Shapes

| Command | Output Shape |
|---|---|
| `gp status --json` | `{ project: ProjectState; epics: Record<string, EpicSummary>; sideQuests: Record<string, SideQuestSummary>; suggestedNextSteps: NextStep[]; latestBriefing: BriefingSummary \| null }` |
| `gp epic:show --json` | `EpicState` (DerivedState projection for one epic) |
| `gp slice:show --json` | `SliceState` (DerivedState projection for one slice) |
| `gp verify --json` | `{ ok: boolean; errors: Array<{ line: number; check: string; message: string }> }` |
| `gp refine:evaluate --json` | `ConvergenceResult` (see [trust.md](./trust.md)) |

Full output schemas are available via `gp schema --output <command>`.

## Help Structure

With ~95 commands, flat help output is unusable. The CLI uses a two-level help structure:

- **`gp --help`** (or `gp help`) -- shows namespace groups with one-line summaries:
  ```
  epic        Epic lifecycle commands (create, goal, architecture, ...)
  slice       Slice lifecycle commands (plan, implement, land, ...)
  side-quest  Side-quest commands
  refine      Artifact refinement loop
  ...
  ```
- **`gp <namespace> --help`** (or `gp help <namespace>`) -- lists commands within that namespace with descriptions.
- **`gp <namespace>:<command> --help`** -- detailed help for a specific command (args, flags, events emitted).

## Command Implementation Pattern

Every mutating command follows the same pattern:

```typescript
// Pseudocode for a typical command
export default defineCommand({
  meta: { name: "epic:goal-commit" },
  args: { epic: { type: "string", required: true } },
  async run({ args }) {
    // 1. Read derived state
    const state = computeDerivedState(args.epic);

    // 2. Validate preconditions (invariants check this too, but
    //    early validation gives better error messages)
    if (!state.goal) throw cliError("NOT_FOUND", "No drafted goal");

    // 3. Run extractor on the artifact
    const extract = extractEpicGoal(readFile(state.goalPath));
    if (!extract.success) throw cliError("SCHEMA_INVALID", extract.error.message);

    // 4. Build event
    const event = buildEnvelope("epic-goal-committed", {
      epicDir: args.epic,
      goal: contentRef(state.goalPath),
      extract: extract.data,
    });

    // 5. Append (invariant engine checks before write)
    await appendEvent(event);

    // 6. Output (matches MutatingCommandOutput contract)
    output({ ok: true, event: event.id, entity: `epic:${args.epic}` });
  },
});
```
