# Engine Layer

The foundation of goodplan v2. Three subsystems: Event Engine, Invariant Engine, Derived State Computer. All other layers depend on this; it depends only on `schemas/` and `util/`.

## Event Engine (`src/engine/events/`)

### Event Log Format

One JSONL file per scope:
- `.goodplan/events.jsonl` — project scope
- `.goodplan/epics/<dir>/events.jsonl` — epic scope
- `.goodplan/side-quests/<dir>/events.jsonl` — side-quest scope

Each line is a self-contained JSON object (the event envelope). Append-only — no updates, no deletes.

### Event Envelope Schema

```typescript
import type { z } from "zod/v4";

// The universal event envelope wrapping every event
interface EventEnvelope<D extends EventDomain, T extends string, P> {
  id: string;           // UUID v4
  schemaVersion: number; // starts at 1; see Schema Evolution below
  ts: string;           // ISO-8601 UTC with ms precision
  scope: "project" | "epic" | "side-quest";
  scopeRef: string | null;  // slug for epic/side-quest, null for project
  actor: {
    kind: "user" | "cli" | "skill" | "agent";
    id: string;         // e.g. "gp:create-epic", "reviewer-holistic"
  };
  branch: string;       // current git branch
  commitHint: string | null;  // HEAD SHA at time of event, or null
  domain: D;            // top-level event domain (see EventDomain)
  type: T;              // kebab-case event type
  payload: P;           // type-specific, Zod-validated
  prevId: string | null;  // UUID of previous event in this scope's log
}

// Erased envelope type for invariant rules and generic processing.
// Rules operate on this and narrow via the `type` discriminant for
// type-safe payload access.
type AnyEventEnvelope = EventEnvelope<EventDomain, string, unknown>;
```

### ContentRef

References to artifact content stored as git blobs:

```typescript
interface ContentRef {
  sha: string;      // 40-char git blob SHA (trust-on-write; verification deferred — see note below)
  size: number;     // byte count
  path: string;     // relative path within .goodplan/
  mediaType: string; // e.g. "text/markdown"
}
```

**Initial approach:** File paths only (ContentRef with `sha` populated via `git hash-object -w`). Content-addressed verification (comparing SHA to file content) is a tracked future task but not required for v2 launch.

**Risk:** Loose blobs between milestones are vulnerable to `git gc`. Milestone commits (triggered internally by phase-completing commands) make them reachable by staging the files. Mitigation: milestone logic runs at every phase boundary, and `gp verify` (see below) checks for dangling SHAs. If blob loss is detected between milestones, the file-path fallback in ContentRef allows recovery from the working tree.

### Append Semantics

Every event append follows this sequence:

```
1. Build envelope (generate UUID, capture timestamp, resolve prevId)
2. Validate payload against Zod schema for this event type
3. Run invariant checks (see Invariant Engine below)
4. If all invariants pass: append JSON line to scope's events.jsonl
5. If any invariant fails: return structured error (INVARIANT_FAILED)
```

The `prevId` chain provides ordering verification. Each event's `prevId` references the UUID of the immediately preceding event in the same scope's log. The first event in a scope has `prevId: null`. **Ordering note:** UUIDs are not monotonic and timestamps may collide across concurrent processes. Canonical event ordering is derived from `prevId` chain traversal, never from sorting by `id` or `ts`. The `prevId` chain is the source of truth for order; `ts` is informational only.

Note: `prevId` verifies that the reader sees events in the same order they were written, but does not provide tamper detection. True tamper detection would require a hash chain (hashing the previous event's content, not just referencing its ID). This is a potential future enhancement.

### Schema Evolution

The `schemaVersion` field on every envelope enables forward-compatible evolution of event shapes:

- **Current version:** `schemaVersion: 1` for all events at v2 launch.
- **Unknown event types:** The derived state computer skips event types it does not recognize (future event types added by newer CLI versions). This allows older CLI versions to read logs written by newer versions without crashing.
- **Extra payload fields:** Zod schemas use `.strip()` mode, so extra fields added by newer versions are silently dropped during parsing. This prevents validation failures when reading forward-compatible events.
- **Missing optional fields:** New optional fields use Zod `.default()` so older events missing those fields are parsed with sensible defaults.
- **Breaking changes:** When a payload shape changes incompatibly, `schemaVersion` is incremented. The Zod schema dispatches on `schemaVersion` to select the correct parser. Old events remain parseable forever.

### Write Safety

This is a single-user CLI tool. Concurrent writes to the same scope's `events.jsonl` are not expected in normal operation, but can occur if multiple skill/hook invocations overlap (e.g., a hook fires while a command is mid-append).

**Protection:** The read-prevId-then-append critical section is wrapped in a file lock (`flock` on macOS/Linux — the only supported platforms) scoped to the target `events.jsonl`. The lock is held only for the duration of the read-last-prevId + append-line operation (milliseconds). If the lock cannot be acquired within 5 seconds, the command fails with `STATE_CONFLICT`.

This is a safety net, not a concurrency design. If contention is ever observed in practice, it indicates a skill orchestration bug (two skills mutating the same scope simultaneously).

### Data Integrity Verification (`gp verify`)

With the removal of HMAC signing from v1, structural verification replaces cryptographic verification. The `gp verify` command validates:

1. **JSON validity** -- every line in `events.jsonl` parses as valid JSON
2. **Schema conformance** -- every event matches its Zod schema (dispatched by `type` field)
3. **prevId chain integrity** -- the chain is unbroken from the first event (prevId: null) to the last, with no forks or gaps
4. **ContentRef SHA validity** -- when content-addressing is enabled, `git cat-file -t <sha>` confirms each referenced blob exists (warns but does not fail if blob is missing, since gc may have collected it)
5. **schemaVersion monotonicity** -- `schemaVersion` never decreases within a scope

Output: `{ ok: boolean; errors: Array<{ line: number; check: string; message: string }> }`. Exit code 0 if all checks pass, 1 if any fail.

### Event Type Catalog (~80 types)

Events organized by domain. See [brainstorm/11-delta.md](../brainstorm/11-delta.md) section 3.2 for the full catalog. Key groups:

| Domain | Count | Examples |
|---|---|---|
| Entity lifecycle | ~42 | `epic-created`, `slice-plan-drafted`, `chunk-verified` |
| Spine updates | ~12 | `architecture-committed`, `subsystem-registered` |
| Refinement | ~9 | `reviewer-scored`, `refinement-converged`, `convergence-overridden` |
| Exploration | ~6 | `exploration-cycle-started`, `research-captured` |
| Pressure test | 4 | `pressure-test-drafted`, `pressure-test-finding-accepted` |
| Findings | 2 | `finding-captured`, `finding-triaged` |
| Briefings | 1 | `briefing-written` |
| Decisions & learnings | 3 | `decision-recorded`, `learning-captured` |
| Pauses & steering | ~4 | `pause-entered`, `steering-preference-set` |
| Reshape | 3 | `reshape-proposed`, `reshape-approved`, `reshape-applied` |
| Milestone | 1 | `milestone-committed` |

### Schema Organization

```
src/schemas/
  envelope.ts          — EventEnvelope + ContentRef
  shared.ts            — timestamps, common types
  events/
    project.ts         — project-initialized, steering-preference-set
    epic.ts            — epic-created, epic-goal-committed, ...
    slice.ts           — slice-created, slice-plan-drafted, chunk-*, ...
    side-quest.ts      — side-quest-created, side-quest-landed, ...
    refinement.ts      — reviewer-scored, refinement-converged, ...
    exploration.ts     — exploration-cycle-*, research-captured, ...
    spine.ts           — architecture-*, conventions-*, subsystem-*
    trust-domain.ts    — finding-*, briefing-*, decision-*, learning-* (named trust-domain to avoid collision with src/trust/)
    phase.ts           — pause-*, reshape-*, milestone-*
```

Event types use `z.discriminatedUnion()` (not `z.union()`) for better error messages and performance. Error codes use `z.enum()` for compile-time safety. To mitigate compile-time and DX risks with ~80 types in a single union, the design uses a two-level discriminant with `domain` on the envelope:

```typescript
// Level 1: domain discriminant (~10 groups from the event catalog)
type EventDomain =
  | "entity-lifecycle"
  | "spine"
  | "refinement"
  | "exploration"
  | "pressure-test"
  | "finding"
  | "briefing"
  | "decision-learning"
  | "pause-steering"
  | "reshape"
  | "milestone";

// Level 2: type discriminant within each domain
type EntityLifecycleEvent =
  | { domain: "entity-lifecycle"; type: "epic-created"; payload: EpicCreatedPayload }
  | { domain: "entity-lifecycle"; type: "slice-plan-drafted"; payload: SlicePlanDraftedPayload }
  // ... ~42 entity lifecycle events

type RefinementEvent =
  | { domain: "refinement"; type: "reviewer-scored"; payload: ReviewerScoredPayload }
  | { domain: "refinement"; type: "refinement-converged"; payload: RefinementConvergedPayload }
  // ... ~9 refinement events

// Top-level union dispatches on domain first, then type
type GoodplanEvent = EntityLifecycleEvent | RefinementEvent | SpineEvent | /* ... */;
```

TypeScript narrows the `domain` field first (10 branches), then the `type` field within each domain (5-42 branches each). This keeps type-checking fast and provides good IDE autocomplete. If compile times remain acceptable with a flat union during initial development, the two-level structure can be deferred -- but the `domain` field should be present on every event from the start to preserve the option.

### Milestone System

Phase-completing commands (e.g., `gp slice:land`, `gp epic:complete`) invoke milestone logic internally, which:
1. Stages spine files + `events.jsonl` for the relevant scope
2. Creates a git commit
3. Emits `milestone-committed` event

This makes ContentRef blobs reachable by git (protecting from `git gc`) and creates clean commit boundaries. There is no standalone `gp milestone:commit` command -- milestone creation is an internal side-effect of phase-completing commands.

**Testability (ports-and-adapters):** The engine layer never calls git directly -- only through the injected `GitOps` adapter. This is a ports-and-adapters boundary: the engine defines the port, and implementations are injected at composition time.

```typescript
// Port: src/engine/interfaces/git-ops.ts
interface GitOps {
  hashObject(content: Uint8Array): Promise<string>;   // git hash-object -w
  catFile(sha: string): Promise<Uint8Array | null>;    // git cat-file -p, null if missing
  createMilestoneCommit(message: string, paths: string[]): Promise<string>; // returns commit SHA
}
```

| Adapter | Location | Purpose |
|---|---|---|
| Real | `src/commands/infrastructure/git-ops-real.ts` | Production implementation using `Bun.spawn` |
| Memory | `tests/engine/fixtures/git-ops-memory.ts` | In-memory store for unit tests |

Unit tests inject `MemoryGitOps`; integration tests use a real repo in a temp directory.

---

## Invariant Engine (`src/engine/invariants/`)

### Rule Types

```typescript
type InvariantRuleType =
  | "unique"        // field value unique across events of a type
  | "count_limit"   // max N events matching a condition
  | "required"      // field must be non-empty
  | "foreign_key"   // referenced entity must exist in event log
  | "all_match"     // all items in a set satisfy a predicate
  | "precondition"  // event X must exist before event Y
  | "custom";       // arbitrary function
```

### Core Interface

```typescript
interface InvariantRule {
  id: string;           // e.g. "epic.single-active-per-branch"
  type: InvariantRuleType;
  description: string;
  // Operates on erased envelope — narrow via `event.type` for type-safe payload access
  check(event: AnyEventEnvelope, derivedState: DerivedStateData): string | null;
}

// Called before every event append
function checkInvariants(
  event: AnyEventEnvelope,
  derivedState: DerivedStateData,
  rules: InvariantRule[]
): { passed: true } | { passed: false; violations: Array<{ ruleId: string; message: string }> };
```

### Core Invariant Catalog (24)

| ID | Type | Enforcement |
|---|---|---|
| `project.exists` | precondition | `project-initialized` before other events |
| `epic.single-active-per-branch` | count_limit | <=1 active epic per branch |
| `epic.dir.unique` | unique | No directory collisions across history |
| `epic.goal.committed-before-explore` | precondition | Goal committed before exploration |
| `epic.architecture-target-required-before-slice-set` | precondition | Architecture target committed before slicing |
| `epic.pressure-test-required-before-slice-set` | precondition | Pressure test committed before slicing |
| `epic.architecture-shape-approval-required` | precondition | Architecture shaped before pressure test |
| `epic.slice-shape-approval-required` | precondition | Slices shaped before refinement |
| `epic.all-slices-landed-before-complete` | all_match | All slices landed/abandoned before epic completes |
| `slice.single-active-per-branch` | count_limit | <=1 slice in P10-P11 per branch |
| `slice.plan-shape-approval-required` | precondition | Plan shaped before refinement |
| `slice.plan-converged-before-implement` | precondition | Converged plan before implementation |
| `slice.plan-chunks-decidable` | all_match | Every chunk has verificationType |
| `slice.chunks-all-decided-before-code-refine` | all_match | All chunks decided before code refinement |
| `slice.code-refinement-converged-before-land` | precondition | Code refinement converged before landing |
| `slice.deps-landed-before-start` | precondition | Dependencies landed before starting |
| `side-quest.single-active-per-branch` | count_limit | <=1 active side quest per branch |
| `chunk.evidence-non-empty` | required | Verified events carry concrete observation |
| `chunk.red-test-failed-before-green` | precondition | TDD ordering: red before green |
| `refinement.bar-matches-rubric` | custom | Convergence computed against known rubric |
| `spine.write-only-via-milestone` | custom | Spine changes bundled into milestones |
| `event.prev-id-chain` | custom | prevId matches previous event in scope |
| `pressure-test.findings-all-accepted-before-slice-set` | all_match | Every finding accepted before slicing |
| `briefing.written-at-pause` | precondition | Every pause immediately followed by briefing |

### Extensible Invariants

Project-specific invariants defined in `.goodplan/invariants.md` trailing YAML block. Versioned via `invariant-activated` / `invariant-deactivated` events so replay produces consistent results.

```typescript
// CLI commands for invariant management
// gp invariant:list         — list all active invariants (core + custom)
// gp invariant:propose      — propose a new custom invariant
// gp invariant:activate     — activate a proposed invariant
// gp invariant:deactivate   — deactivate an invariant
// gp invariant:check        — run all invariants against current state
```

---

## Derived State Computer (`src/engine/derived-state/`)

### Purpose

Replaces the v1 state machine (`core/state/reduce.ts` + `transitions/*.ts`). Streams the JSONL event log on every CLI invocation and computes the current state.

### Core Interface

`DerivedStateData` is a plain serializable data interface. Accessor functions are standalone pure functions that operate on `DerivedStateData` -- they are not methods on the interface.

```typescript
// Plain data (serializable as JSON after Map -> Record conversion)
interface DerivedStateData {
  project: ProjectState;
  epics: Map<string, EpicState>;
  sideQuests: Map<string, SideQuestState>;

  // Trust projections (computed from reviewer-scored, refinement-converged, etc.)
  convergenceSnapshots: Map<string, ConvergenceSnapshot>; // key: `${scopeRef}:${artifactType}`
  latestDimensionScores: Map<string, DimensionScore[]>;   // same key scheme
}

// Standalone accessor functions (pure, operate on DerivedStateData)
function currentPhase(state: DerivedStateData, scopeRef: string): PhaseInfo | null;
function validTransitions(state: DerivedStateData, scopeRef: string): Transition[];
function blockers(state: DerivedStateData, scopeRef: string): Blocker[];
function suggestedNextSteps(state: DerivedStateData): NextStep[];
function convergenceState(state: DerivedStateData, scopeRef: string, artifactType: string): ConvergenceSnapshot | null;
function latestScores(state: DerivedStateData, scopeRef: string, artifactType: string): DimensionScore[];
```

**Note on JSON serialization:** `Map<string, T>` fields in `DerivedStateData` (e.g., `epics`, `sideQuests`, `convergenceSnapshots`) do not JSON-serialize natively. When persisting or outputting as JSON, these must be converted to `Record<string, T>`. The canonical conversion is performed in the `--json` output path of each command.

`DerivedStateData` is serializable. Accessor functions are pure and operate on `DerivedStateData`.

interface EpicState {
  dir: string;
  goal: ContentRef | null;
  architectureTarget: ContentRef | null;
  pressureTest: ContentRef | null;
  sliceSet: ContentRef | null;
  steeringPreference: SteeringPreference;
  phase: Phase;
  slices: Map<string, SliceState>;
  findings: Finding[];
  // ... derived from scanning epic event log
}

interface SliceState {
  dir: string;
  goal: ContentRef | null;
  plan: ContentRef | null;
  phase: Phase;
  chunks: Map<string, ChunkState>;
  // ... derived from scanning epic event log
}

interface NextStep {
  command: string;      // e.g. "gp slice:plan-draft --slice=auth-layer"
  description: string;  // human-readable explanation
  priority: number;     // ordering hint
}

type SteeringPreference = "always-consult" | "best-guess-and-flag" | "ask-in-the-moment";
```

### Performance Strategy

Stream full event log on every invocation. No cache initially.

**Back-of-envelope estimate:** A typical epic generates ~200-400 events (goal, exploration cycles, architecture drafts, pressure test, slice set, per-slice plan/implement/refine events). At ~1KB per event envelope, that is 200-400KB of JSONL. Bun's JSON parser handles this in <50ms. Even a large project with multiple completed epics would have <2000 events total (~2MB), well within single-digit-hundred-millisecond territory. This justifies the no-cache approach for v2.

**Multi-scope note:** `gp status` replays all scope event logs (project + every epic + every side-quest). For a project with 5 completed epics, that is ~6 file reads and ~6 replay passes. This is still well within acceptable latency, but is the most expensive read path.

**If profiling shows this is too slow:** Add a derived-state cache file recomputed on append. This is explicitly deferred — do not build until measured need exists.

**Storage growth acknowledgment:** Event logs grow O(n) with project activity, and derived state computation replays the full log on every CLI invocation. For v2 this is acceptable (see estimates above). For long-lived projects with many completed epics, a future compaction approach is sketched: completed scopes (epics/side-quests where all slices are landed or abandoned) can be archived to a snapshot file + truncated log, preserving the full event history in git while reducing the replay set. This is explicitly deferred -- build only when profiling shows need.

### Phase Detection

The derived state computer determines the current phase by scanning for the latest phase-boundary event:

```
project-initialized           -> P0 complete
epic-goal-committed           -> P1 complete, P2 available
exploration-concluded          -> P2 complete
architecture-target-committed  -> P3 complete
pressure-test-committed        -> P4 complete
slice-set-committed           -> P5 complete
epic-activated                -> P6 complete, P7 available
slice-plan-drafted            -> P7 complete, P8 available
plan-shape-approved /
  plan-shape-checkpoint-auto-shaped -> P8 complete, P9 available
slice-plan-committed          -> P9 complete
slice-implementation-started  -> P10 active
slice-code-refinement-started -> P11 active
code-refinement-converged     -> P11 complete
slice-landed                  -> P12 complete
```

**Side-quest phase detection** (simplified subset of epic phases):

```
side-quest-created              -> S0 complete
side-quest-goal-committed       -> S1 complete
side-quest-plan-committed       -> S1 complete, S2 available
side-quest-implementation-started -> S2 active
side-quest-landed               -> S3 complete
```

Side-quest events are scoped to their own `events.jsonl` (scope: `"side-quest"`). They do not appear in or interfere with epic event logs. Phase detection within a side-quest scope follows the same replay-and-scan approach as epics but with a smaller event set.

**Note:** Side-quest chunk events (`side-quest-chunk-started`, `side-quest-chunk-verified`) are simplified -- they do not participate in the TDD red/green cycle and do not affect side-quest phase detection (only `side-quest-implementation-started` and `side-quest-landed` are phase boundaries).

Phase is computed, not stored. There is no `status` field on entities.

## Cross-References

- Trust layer (convergence, reviewers): [trust.md](./trust.md)
- Trust projection types (ConvergenceSnapshot, DimensionScore): defined in `src/schemas/` shared layer, imported by both engine and trust
- Command layer (CLI surface): [commands.md](./commands.md)
- Context layer (bundle assembly): [context.md](./context.md)
- Plugin architecture: [plugin.md](./plugin.md)
- Data integrity verification: `gp verify` command -- see [commands.md](./commands.md#global-commands)
- Full event type catalog: [brainstorm/11-delta.md](../brainstorm/11-delta.md) section 3.2
