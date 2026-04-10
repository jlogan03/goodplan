# Implementation Plan: 02-invariant-engine

## Overview

Build the invariant enforcement framework that plugs into the `beforeAppend` hook from slice 01's event engine. This slice delivers: (1) an `InvariantRule` interface and `InvariantRegistry` for registering/querying rules, (2) an `InvariantChecker` that runs all applicable rules and collects violations, (3) all 24 core invariants as pure synchronous functions, (4) the `beforeAppend` integration that makes `appendEvent` reject invalid events with structured errors, (5) the GitOps port interface with a `MemoryGitOps` test adapter, and (6) extensible invariants loaded from YAML in `.goodplan/invariants.md`.

The invariant engine is the trust layer's first defense -- it prevents malformed state transitions from ever reaching the event log. All 24 invariants are pure functions of `(event, checkContext)` with no I/O. The checker collects all violations in a single pass and returns a structured result.

**Key architectural decision:** The architecture doc places the invariant engine at `src/engine/invariants/` (engine layer), not `src/trust/`. The engine layer overview confirms this: "Three subsystems: Event Engine, Invariant Engine, Derived State Computer." The task prompt says `src/trust/` but the architecture is authoritative. **Use `src/engine/invariants/` and `tests/engine/invariants/` per the architecture.**

**State context approach:** Rather than depending on the derived state computer (slice 03), invariants replay the event log directly via `replayEvents` from slice 01. Each invariant receives the new envelope plus a `CheckContext` wrapping the array of prior events for the same scope. This keeps the invariant engine independent of derived state -- it only depends on the event engine, matching the architecture's dependency rules. The `CheckContext` interface is designed for forward-compatible extension: when derived state lands in slice 03, it can be added to the context without bulk-refactoring all 24 invariants.

---

## Phase 1: Invariant Framework (Registry + Checker + Types) + GitOps Port

### Objective

Establish the core framework: `InvariantRule` interface, `CheckContext` wrapper, `InvariantRuleType` enum, `InvariantViolation` type, `InvariantRegistry` for rule registration/lookup, and `InvariantChecker` that runs applicable rules and returns a structured result. Also define the `GitOps` port interface and `MemoryGitOps` test adapter (ports-and-adapters boundary from the architecture). No actual invariants yet -- this is the skeleton.

### Files

| File | Purpose |
|---|---|
| `src/engine/invariants/types.ts` | `InvariantRule` interface, `CheckContext`, `InvariantRuleType`, `InvariantViolation`, `InvariantCheckResult` |
| `src/engine/invariants/registry.ts` | `InvariantRegistry` class: register, getAll, getByDomain, getById |
| `src/engine/invariants/checker.ts` | `checkInvariants()` function: runs rules, collects violations, returns result |
| `src/engine/invariants/index.ts` | Barrel exports |
| `src/engine/interfaces/git-ops.ts` | `GitOps` port interface: `hashObject`, `catFile`, `createMilestoneCommit` |
| `tests/engine/fixtures/git-ops-memory.ts` | `MemoryGitOps` in-memory adapter for unit tests |
| `tests/engine/invariants/registry.test.ts` | Registry registration, lookup, deduplication |
| `tests/engine/invariants/checker.test.ts` | Checker with mock rules: all-pass, all-fail, mixed, empty registry |
| `tests/engine/fixtures/git-ops-memory.test.ts` | MemoryGitOps round-trip tests (hash + cat, milestone commit) |

### Implementation Details

**`types.ts`:**

```typescript
import type { AnyEventEnvelope, EventDomain } from "../../schemas/envelope.js";

export type InvariantRuleType =
  | "unique"
  | "count_limit"
  | "required"
  | "foreign_key"
  | "all_match"
  | "precondition"
  | "custom";

/**
 * Context passed to every invariant check function.
 * Currently wraps priorEvents; designed for forward-compatible extension
 * with derivedState in slice 03 without bulk-refactoring all 24 invariants.
 */
export interface CheckContext {
  /** All prior events in this scope, unfiltered, in log order */
  allEvents: AnyEventEnvelope[];
  /** Pre-indexed events by type for O(1) lookup: Map<event.type, events[]> */
  eventsByType: ReadonlyMap<string, readonly AnyEventEnvelope[]>;
  /** Pre-indexed events by scopeRef for O(1) entity-scoped lookups */
  eventsByScopeRef: ReadonlyMap<string, readonly AnyEventEnvelope[]>;
}

/**
 * Build a CheckContext from a raw event array.
 * Pre-indexes events by type for efficient rule evaluation.
 */
export function buildCheckContext(priorEvents: AnyEventEnvelope[]): CheckContext {
  const eventsByType = new Map<string, AnyEventEnvelope[]>();
  const eventsByScopeRef = new Map<string, AnyEventEnvelope[]>();
  for (const e of priorEvents) {
    // Index by type
    const byType = eventsByType.get(e.type);
    if (byType) {
      byType.push(e);
    } else {
      eventsByType.set(e.type, [e]);
    }
    // Index by scopeRef (skip null scopeRef)
    if (e.scopeRef != null) {
      const byRef = eventsByScopeRef.get(e.scopeRef);
      if (byRef) {
        byRef.push(e);
      } else {
        eventsByScopeRef.set(e.scopeRef, [e]);
      }
    }
  }
  return { allEvents: priorEvents, eventsByType, eventsByScopeRef };
}

export interface InvariantRule {
  /** Unique rule ID, e.g. "epic.single-active-per-branch" */
  id: string;
  /**
   * Classification of the rule.
   * Named `ruleType` (not `type`) to avoid collision with the JS `type` keyword
   * and the `type` field on event envelopes. This is an intentional deviation
   * from the architecture doc's `type` field name.
   */
  ruleType: InvariantRuleType;
  /** Human-readable description of what this rule enforces */
  description: string;
  /**
   * Which event domains this rule applies to.
   * Empty array means "applies to all domains". To restrict, list specific domains.
   * Must include ALL domains whose events may trigger this rule, not just
   * the rule's "logical" domain. For example, entity-lifecycle rules that
   * need to fire on pressure-test domain events must list both domains.
   */
  appliesTo: EventDomain[];
  /**
   * Check the invariant. Returns null if the invariant holds,
   * or a structured violation with message and optional context if it fails.
   * Pure synchronous function -- no I/O.
   */
  check(event: AnyEventEnvelope, ctx: CheckContext): InvariantViolationData | null;
}

/** Structured violation data returned by rule check functions */
export interface InvariantViolationData {
  message: string;
  /** Optional structured context for debugging/reporting */
  context?: Record<string, unknown>;
}

export interface InvariantViolation {
  ruleId: string;
  message: string;
  /** Optional structured context. Note: when copying from InvariantViolationData,
   *  use conditional spread to satisfy exactOptionalPropertyTypes:
   *  `...(data.context !== undefined ? { context: data.context } : {})` */
  context?: Record<string, unknown>;
}

export type InvariantCheckResult =
  | { passed: true }
  | { passed: false; violations: InvariantViolation[] };
```

Note: The architecture doc's `InvariantRule.check` signature uses `derivedState: DerivedStateData`, but derived state is slice 03. For this slice, the check function receives a `CheckContext` wrapping the replayed event log for the scope (with a pre-built type index for efficient lookups). This is sufficient for all 24 invariants (they scan for precondition events, count active entities, check uniqueness, etc.). When derived state lands in slice 03, `CheckContext` can be extended with a `derivedState` field -- all 24 invariants continue working unchanged since they already receive the context object.

**`src/engine/interfaces/git-ops.ts`:**

The GitOps port is a ports-and-adapters boundary defined in the architecture (engine.md). The engine layer never calls git directly -- only through this injected adapter.

```typescript
/**
 * Port interface for git operations.
 * The engine defines this port; implementations are injected at composition time.
 */
export interface GitOps {
  /** Store content as a git blob, returns 40-char SHA. Equivalent to `git hash-object -w`. */
  hashObject(content: Uint8Array): Promise<string>;
  /** Retrieve content by SHA. Returns null if blob is missing. Equivalent to `git cat-file -p`. */
  catFile(sha: string): Promise<Uint8Array | null>;
  /** Create a milestone commit staging the given paths. Returns commit SHA. */
  createMilestoneCommit(message: string, paths: string[]): Promise<string>;
}
```

**`tests/engine/fixtures/git-ops-memory.ts`:**

```typescript
import { createHash } from "node:crypto";
import type { GitOps } from "../../../src/engine/interfaces/git-ops.js";

/** Compute SHA-1 hex digest. Used by MemoryGitOps for deterministic content hashing. */
function computeSha1Hex(data: string | Uint8Array): string {
  return createHash("sha1").update(data).digest("hex");
}

/**
 * In-memory GitOps adapter for unit tests.
 * Stores blobs in a Map and tracks milestone commits.
 * Uses a monotonic counter (not Date.now()) for deterministic commit SHAs in tests.
 */
export class MemoryGitOps implements GitOps {
  readonly blobs = new Map<string, Uint8Array>();
  readonly commits: Array<{ sha: string; message: string; paths: string[] }> = [];
  private commitCounter = 0;

  async hashObject(content: Uint8Array): Promise<string> {
    const sha = computeSha1Hex(content);
    this.blobs.set(sha, content);
    return sha;
  }

  async catFile(sha: string): Promise<Uint8Array | null> {
    return this.blobs.get(sha) ?? null;
  }

  async createMilestoneCommit(message: string, paths: string[]): Promise<string> {
    // Use monotonic counter for deterministic, reproducible test SHAs
    const commitSha = computeSha1Hex(`${message}:${this.commitCounter++}`);
    this.commits.push({ sha: commitSha, message, paths });
    return commitSha;
  }
}
```

Unit tests for `MemoryGitOps` verify round-trip (hash then cat returns same content), missing SHA returns null, and milestone commits are recorded.

**`registry.ts`:**

- `InvariantRegistry` class with a `Map<string, InvariantRule>` keyed by rule ID.
- `register(rule: InvariantRule): void` -- throws on duplicate ID.
- `getAll(): InvariantRule[]` -- returns all registered rules.
- `getByDomain(domain: EventDomain): InvariantRule[]` -- returns rules whose `appliesTo` includes the domain, or whose `appliesTo` is empty (applies to all).
- `getById(id: string): InvariantRule | undefined`.

**`checker.ts`:**

```typescript
export function checkInvariants(
  event: AnyEventEnvelope,
  ctx: CheckContext,
  rules: InvariantRule[],
): InvariantCheckResult
```

- Builds `CheckContext` from `priorEvents` if not already provided (via `buildCheckContext`).
- Iterates all rules. For each, calls `rule.check(event, ctx)`.
- Collects non-null results as `InvariantViolation` entries (copying `message` and `context` from the `InvariantViolationData` returned by the rule).
- Returns `{ passed: true }` if no violations, `{ passed: false, violations }` otherwise.
- All violations collected -- does not short-circuit.

**`index.ts`:** Barrel exports for types, registry, and checker.

### Expected Behavior

**Before:** No `src/engine/invariants/` directory exists. The `beforeAppend` hook in `appendEvent` has no concrete implementation.

**After:**
- `InvariantRegistry` accepts rule registrations and rejects duplicates.
- `getByDomain("entity-lifecycle")` returns only rules whose `appliesTo` includes `"entity-lifecycle"` or is empty.
- `checkInvariants()` with an empty rule set returns `{ passed: true }`.
- `checkInvariants()` with two failing mock rules returns `{ passed: false, violations: [v1, v2] }` -- both violations present, not just the first.
- All types compile under `strictNullChecks`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`.

### Verification

```bash
bun run test tests/engine/invariants/registry.test.ts
bun run test tests/engine/invariants/checker.test.ts
bunx tsc --noEmit   # Full type check
bunx biome check src/engine/invariants/
```

---

## Phase 2: Entity-Lifecycle Invariants

### Objective

Implement the 17 entity-lifecycle invariants covering project, epic, slice, and side-quest rules. These are the highest-value invariants -- they enforce the phase ordering and entity constraints that prevent the most common workflow bugs. Chunk invariants are deferred to Phase 3 alongside other cross-domain rules.

### Files

| File | Purpose |
|---|---|
| `src/engine/invariants/rules/_helpers.ts` | Shared helpers: `lastEvent`, `findLatest`, `countMatching`, `hasEventOfType`, `narrowPayload` |
| `src/engine/invariants/rules/project.ts` | `project.exists` |
| `src/engine/invariants/rules/epic.ts` | 8 epic invariants |
| `src/engine/invariants/rules/slice.ts` | 7 slice invariants |
| `src/engine/invariants/rules/side-quest.ts` | `side-quest.single-active-per-branch` |
| `src/engine/invariants/core-rules.ts` | `createCoreRegistry()` factory that registers all 24 rules |
| `tests/engine/invariants/core-rules.test.ts` | Registry count, ID completeness, no duplicates |
| `tests/engine/invariants/rules/project.test.ts` | Tests for project.exists |
| `tests/engine/invariants/rules/epic.test.ts` | Tests for all 8 epic invariants |
| `tests/engine/invariants/rules/slice.test.ts` | Tests for all 7 slice invariants |
| `tests/engine/invariants/rules/side-quest.test.ts` | Tests for side-quest invariant |

### Implementation Details

Each rule file exports one or more `InvariantRule` objects. Helper functions for common patterns (find latest event of type, count events matching predicate, check if entity exists) live in a shared `src/engine/invariants/rules/_helpers.ts` utility file.

**Helper utilities (`src/engine/invariants/rules/_helpers.ts`):**

```typescript
import type { z } from "zod";
import type { AnyEventEnvelope } from "../../schemas/envelope.js";
import type { CheckContext } from "../types.js";

/**
 * Return the last event in ctx.allEvents, guarding for noUncheckedIndexedAccess.
 * Mandate use of this helper whenever rules need "the last event in ctx.allEvents"
 * to centralize the undefined guard.
 */
export function lastEvent(ctx: CheckContext): AnyEventEnvelope | undefined {
  return ctx.allEvents[ctx.allEvents.length - 1];
}

/** Find the most recent event matching a type using the pre-built index */
export function findLatest(
  ctx: CheckContext,
  type: string,
): AnyEventEnvelope | undefined {
  const events = ctx.eventsByType.get(type);
  if (!events || events.length === 0) return undefined;
  return events[events.length - 1];
}

/** Count events matching a predicate */
export function countMatching(
  ctx: CheckContext,
  predicate: (e: AnyEventEnvelope) => boolean,
): number

/** Check if any event of the given type exists using the pre-built index */
export function hasEventOfType(
  ctx: CheckContext,
  type: string,
): boolean {
  const events = ctx.eventsByType.get(type);
  return events !== undefined && events.length > 0;
}

/**
 * Narrow an event's unknown payload to a typed shape using a Zod schema.
 * Returns the parsed data on success, or null if parsing fails
 * (meaning the payload doesn't match the expected schema -- the invariant
 * passes because this rule doesn't apply to this payload shape).
 * Note: parse failures could mask issues; log parse errors in debug mode
 * when a debug logger is available.
 * Prevents `as any` creep across invariant implementations.
 */
export function narrowPayload<T>(
  payload: unknown,
  schema: z.ZodType<T>,
): T | null {
  const result = schema.safeParse(payload);
  return result.success ? result.data : null;
}
```

**Test helper (`tests/engine/invariants/rules/_test-helpers.ts` -- test code only, not production):**

```typescript
import { AnyEventEnvelopeSchema } from "../../../../src/schemas/envelope.js";

/**
 * Build a well-typed test envelope from an overrides bag.
 * Uses AnyEventEnvelopeSchema.parse() for runtime validation,
 * respecting exactOptionalPropertyTypes (no Partial<AnyEventEnvelope>).
 */
export function makeEnvelope(overrides: Record<string, unknown>): AnyEventEnvelope {
  return AnyEventEnvelopeSchema.parse({
    id: crypto.randomUUID(),
    schemaVersion: 1,
    ts: new Date().toISOString(),
    scope: "project",
    scopeRef: null,
    actor: { kind: "cli", id: "test" },
    branch: "main",
    commitHint: null,
    domain: "entity-lifecycle",
    type: "project-initialized",
    payload: {},
    prevId: null,
    ...overrides,
  });
}
```

**Invariant implementations (all 17 entity-lifecycle):**

| ID | Rule Logic |
|---|---|
| `project.exists` | If `event.type !== "project-initialized"`, check that `ctx.eventsByType` contains a `"project-initialized"` event. |
| `epic.single-active-per-branch` | If `event.type === "epic-created"`, count epics on `event.branch` that have been created but not completed/abandoned in `ctx.allEvents`. Fail if count >= 1. |
| `epic.dir.unique` | If `event.type === "epic-created"`, check that no prior `"epic-created"` event shares the same directory (payload field). Use `narrowPayload` for type-safe access. |
| `epic.goal.committed-before-explore` | If `event.type === "exploration-cycle-started"`, check that a `"epic-goal-committed"` event exists via `hasEventOfType(ctx, ...)`. |
| `epic.architecture-target-required-before-slice-set` | If `event.type === "slice-set-committed"`, check for `"architecture-target-committed"` via `hasEventOfType(ctx, ...)`. |
| `epic.pressure-test-required-before-slice-set` | If `event.type === "slice-set-committed"`, check for `"pressure-test-committed"` via `hasEventOfType(ctx, ...)`. Note: `appliesTo` must include both `"entity-lifecycle"` and `"pressure-test"` domains since `slice-set-committed` is entity-lifecycle but the rule checks for pressure-test domain events. |
| `epic.architecture-shape-approval-required` | If `event.type === "pressure-test-drafted"`, check for architecture shape approval event via `hasEventOfType(ctx, ...)`. |
| `epic.slice-shape-approval-required` | If `event.type` starts slice refinement, check for slice-set shape approval via `hasEventOfType(ctx, ...)`. |
| `epic.all-slices-landed-before-complete` | If `event.type === "epic-completed"`, check that all slices created in `ctx.allEvents` have corresponding `"slice-landed"` or `"slice-abandoned"` events. |
| `slice.single-active-per-branch` | If `event.type === "slice-implementation-started"`, count slices in P10-P11 on the same branch. Fail if >= 1. |
| `slice.plan-shape-approval-required` | If `event.type` starts plan refinement, check for plan shape approval via `hasEventOfType(ctx, ...)`. |
| `slice.plan-converged-before-implement` | If `event.type === "slice-implementation-started"`, check for `"slice-plan-committed"` or `"refinement-converged"` for this slice's plan. |
| `slice.plan-chunks-decidable` | If `event.type === "slice-plan-committed"`, verify every chunk in the payload has a `verificationType` field. Use `narrowPayload` for type-safe payload access. |
| `slice.chunks-all-decided-before-code-refine` | If `event.type === "slice-code-refinement-started"`, check that all chunks have been decided (started/verified/skipped). |
| `slice.code-refinement-converged-before-land` | If `event.type === "slice-landed"`, check for code refinement convergence. |
| `slice.deps-landed-before-start` | If `event.type === "slice-implementation-started"`, check that all dependency slices (from the plan's deps field) have `"slice-landed"` events. |
| `side-quest.single-active-per-branch` | If `event.type === "side-quest-created"`, count active side-quests on branch. Fail if >= 1. |

**`core-rules.ts`:** A `createCoreRegistry()` function that creates an `InvariantRegistry` and registers rules. This file is built incrementally: phase 2 creates the file with 17 entity-lifecycle rules registered; phase 3 updates it to register all 24 rules (adding the 7 remaining domain rules).

**Test approach:** Each test file creates a `priorEvents` array with specific events, then calls the rule's `check()` function directly. Tests cover:
- Happy path (invariant holds) -- returns null.
- Violation path (invariant broken) -- returns descriptive message string.
- Edge cases (empty prior events, multiple entities, scope boundaries).

A shared `tests/engine/invariants/rules/_test-helpers.ts` provides `makeEnvelope()` to build well-typed test envelopes without repeating boilerplate.

### Expected Behavior

**Before:** Framework exists but no actual rules are registered.

**After:**
- `createCoreRegistry()` returns a registry with 17 entity-lifecycle rules (the remaining 7 are added in phase 3).
- `project.exists` rejects any non-`project-initialized` event when no `project-initialized` exists in prior events.
- `epic.single-active-per-branch` rejects `epic-created` when an active epic already exists on the same branch.
- `epic.all-slices-landed-before-complete` rejects `epic-completed` when any slice lacks a landed/abandoned event.
- `slice.plan-converged-before-implement` rejects `slice-implementation-started` without prior plan convergence.
- Each invariant returns null for valid events and a descriptive message for violations.

### Verification

```bash
bun run test tests/engine/invariants/rules/
bunx tsc --noEmit
bunx biome check src/engine/invariants/
```

---

## Phase 3: Remaining Domain Invariants

### Objective

Implement the 7 remaining invariants covering chunk, refinement, spine, structural, pressure-test, and briefing domains. After this phase, all 24 core invariants are implemented and `createCoreRegistry()` returns the complete set.

### Files

| File | Purpose |
|---|---|
| `src/engine/invariants/rules/chunk.ts` | `chunk.evidence-non-empty`, `chunk.red-test-failed-before-green` |
| `src/engine/invariants/rules/refinement.ts` | `refinement.bar-matches-rubric` |
| `src/engine/invariants/rules/spine.ts` | `spine.write-only-via-milestone` |
| `src/engine/invariants/rules/structural.ts` | `event.prev-id-chain` |
| `src/engine/invariants/rules/pressure-test.ts` | `pressure-test.findings-all-accepted-before-slice-set` |
| `src/engine/invariants/rules/briefing.ts` | `briefing.written-at-pause` |
| `tests/engine/invariants/rules/chunk.test.ts` | Tests for chunk invariants |
| `tests/engine/invariants/rules/refinement.test.ts` | Tests for refinement invariant |
| `tests/engine/invariants/rules/spine.test.ts` | Tests for spine invariant |
| `tests/engine/invariants/rules/structural.test.ts` | Tests for prev-id-chain invariant |
| `tests/engine/invariants/rules/pressure-test.test.ts` | Tests for pressure-test invariant |
| `tests/engine/invariants/rules/briefing.test.ts` | Tests for briefing invariant |

### Implementation Details

| ID | Rule Logic |
|---|---|
| `chunk.evidence-non-empty` | If `event.type === "chunk-verified"`, check that the payload's `evidence` or `observation` field is a non-empty string. Use `narrowPayload` for type-safe access. |
| `chunk.red-test-failed-before-green` | If `event.type === "chunk-green-test-passed"`, check that a `"chunk-red-test-failed"` event exists in `ctx.eventsByType` for the same chunk ID. |
| `refinement.bar-matches-rubric` | If `event.type === "refinement-converged"`, validate that convergence was computed against a known rubric (payload contains rubric ref and all dimensions scored). |
| `spine.write-only-via-milestone` | **`ruleType: "custom"` with TODO.** If `event.type` is a spine-mutation event (`"architecture-committed"`, `"conventions-committed"`, etc.), check that the immediately preceding event in `ctx.allEvents` is a `"milestone-committed"` or that the current event is part of a milestone batch. This rule is underspecified in the architecture -- mark as `custom` with a TODO comment noting it will need refinement when the milestone system is built. |
| `event.prev-id-chain` | For every event: use `lastEvent(ctx)` to get the last prior event. Verify `event.prevId` matches `lastEvent(ctx)?.id` (or is null if `ctx.allEvents` is empty). This is a structural integrity check. Note: this rule requires the full unfiltered `ctx.allEvents` array, not the type-indexed subset. |
| `pressure-test.findings-all-accepted-before-slice-set` | If `event.type === "slice-set-committed"`, check that every `"finding-captured"` event in `ctx.allEvents` has a corresponding `"finding-triaged"` (accepted/dismissed) event. `appliesTo` must include both `"entity-lifecycle"` and `"finding"` domains. |
| `briefing.written-at-pause` | If `event.type !== "briefing-written"` and `event.type !== "pause-entered"`, use the `lastEvent(ctx)` helper to get the last event in `ctx.allEvents`. If it is `"pause-entered"`, fail -- a pause must be immediately followed by a briefing. |

**Update `core-rules.ts`:** Add the 7 remaining rules to `createCoreRegistry()`. After this phase, calling `createCoreRegistry().getAll()` returns exactly 24 rules.

### Expected Behavior

**Before:** 17 entity-lifecycle rules registered.

**After:**
- `createCoreRegistry().getAll().length === 24`.
- `event.prev-id-chain` rejects an event whose `prevId` does not match the last prior event's `id`.
- `briefing.written-at-pause` rejects any non-briefing event when the last event was `pause-entered`.
- `pressure-test.findings-all-accepted-before-slice-set` rejects `slice-set-committed` when unresolved findings exist.
- Every invariant is individually unit-tested with pass and fail cases.

### Verification

```bash
bun run test tests/engine/invariants/
# Confirm 24 rules registered:
bun run test tests/engine/invariants/core-rules.test.ts
bunx tsc --noEmit
bunx biome check src/engine/invariants/
```

---

## Phase 4: beforeAppend Integration + End-to-End Tests + Smoke Script

### Objective

Wire the invariant checker into `appendEvent`'s `beforeAppend` hook. Create an `InvariantError` class for structured error reporting. Write end-to-end tests showing real append rejections. Write a smoke script that demonstrates the system working with a real JSONL log. Add YAML-based extensible invariant loading from `.goodplan/invariants.md`.

### Files

| File | Purpose |
|---|---|
| `src/engine/invariants/error.ts` | `InvariantError` class extending `Error` with `violations` property |
| `src/engine/invariants/create-before-append-hook.ts` | Factory that creates a `beforeAppend` function wired to the checker |
| `src/engine/invariants/yaml-loader.ts` | Parse extensible invariants from `.goodplan/invariants.md` YAML block |
| `src/engine/invariants/index.ts` | Update barrel to export new items |
| `tests/engine/invariants/integration.test.ts` | End-to-end: `appendEvent` with invariant hook rejects bad events, accepts good ones |
| `tests/engine/invariants/yaml-loader.test.ts` | YAML invariant parsing, activation/deactivation, malformed input handling |
| `tests/engine/invariants/smoke.test.ts` | Smoke test: multi-event scenario with real JSONL file |

### Implementation Details

**`error.ts`:**

```typescript
import type { InvariantViolation } from "./types.js";

export class InvariantError extends Error {
  readonly code = "INVARIANT_FAILED" as const;
  readonly violations: readonly InvariantViolation[];

  constructor(violations: InvariantViolation[]) {
    const summary = violations.map((v) => `${v.ruleId}: ${v.message}`).join("; ");
    super(`Invariant check failed: ${summary}`);
    this.name = "InvariantError";
    this.violations = violations;
    // Each violation may carry structured context for debugging/reporting
  }
}
```

**`create-before-append-hook.ts`:**

```typescript
import type { AnyEventEnvelope } from "../../schemas/envelope.js";
import { buildCheckContext } from "./types.js";
import { checkInvariants } from "./checker.js";
import { InvariantError } from "./error.js";
import type { InvariantRegistry } from "./registry.js";
import type { CheckContext } from "./types.js";

/**
 * Factory function that retrieves the CheckContext for a given events file.
 * Injected to decouple the hook from the concrete replay implementation,
 * making it testable without real files.
 */
export type GetCheckContext = (eventsPath: string) => Promise<CheckContext>;

export interface CreateBeforeAppendHookOptions {
  /** Path to the events.jsonl file for this scope */
  eventsPath: string;
  /** The invariant registry with all rules to check */
  registry: InvariantRegistry;
  /**
   * Injected context factory. In production, wraps replayEvents + buildCheckContext.
   * In tests, can return a pre-built CheckContext without touching the filesystem.
   */
  getContext: GetCheckContext;
}

/**
 * Creates a beforeAppend hook function that:
 * 1. Retrieves the CheckContext via the injected factory
 * 2. Runs all applicable invariants
 * 3. Throws InvariantError if any violations found
 *
 * This is the concrete implementation of the beforeAppend
 * extension point defined in slice 01's AppendEventOptions.
 */
export function createBeforeAppendHook(
  opts: CreateBeforeAppendHookOptions,
): (envelope: AnyEventEnvelope) => Promise<void> {
  return async (envelope: AnyEventEnvelope): Promise<void> => {
    // Get check context (replayed events + type index)
    const ctx = await opts.getContext(opts.eventsPath);

    // Get rules applicable to this event's domain
    const rules = opts.registry.getByDomain(envelope.domain);

    // Run all invariant checks
    const result = checkInvariants(envelope, ctx, rules);

    if (!result.passed) {
      throw new InvariantError(result.violations);
    }
  };
}

/**
 * Production getContext factory: replays events from JSONL and builds CheckContext.
 * Accepts the replayEvents function as a parameter (injected at the composition root)
 * to avoid dynamic imports and keep the module statically analyzable.
 */
export function createReplayGetContext(
  replayEvents: (opts: { eventsPath: string }) => Promise<{ events: AnyEventEnvelope[] }>,
): GetCheckContext {
  return async (eventsPath: string): Promise<CheckContext> => {
    const { events } = await replayEvents({ eventsPath });
    return buildCheckContext(events);
  };
}
```

**`yaml-loader.ts` -- Extensible Invariants via Declarative DSL:**

Project-specific invariants are defined in a trailing YAML block in `.goodplan/invariants.md`. Instead of arbitrary JavaScript expression strings (which would require `eval()`/`new Function()` and are unsafe, unportable, and unauditable), the loader uses a **declarative DSL** with structured predicates. Activation/deactivation is tracked via `invariant-activated` / `invariant-deactivated` events in the event log, so replay produces consistent results.

```typescript
import type { InvariantRule, InvariantRuleType, CheckContext } from "./types.js";
import type { AnyEventEnvelope, EventDomain } from "../../schemas/envelope.js";

/**
 * Declarative check definition -- a discriminated union of supported check types.
 * No arbitrary code execution. Each variant is type-safe, portable, and auditable.
 */
type YamlCheckDef =
  | {
      /** Count events matching a given type and compare against a threshold */
      checkType: "event-count";
      eventType: string;
      comparison: "eq" | "lt" | "lte" | "gt" | "gte";
      value: number;
    }
  | {
      /** Check that a specific field exists in the event payload */
      checkType: "field-exists";
      field: string;
    }
  | {
      /** Check that a payload field matches an expected value */
      checkType: "field-matches";
      field: string;
      expected: string | number | boolean;
    };

interface YamlInvariantDef {
  id: string;
  description: string;
  ruleType: InvariantRuleType;
  appliesTo: EventDomain[];
  /** Declarative check specification -- no arbitrary code */
  check: YamlCheckDef;
}

/**
 * Parse extensible invariants from .goodplan/invariants.md YAML block.
 * Returns parsed definitions (not yet registered -- caller filters by
 * activation status from the event log before registering).
 */
export function parseInvariantDefinitions(
  markdownContent: string,
): YamlInvariantDef[]

/**
 * Filter definitions to only those currently active, by scanning for
 * invariant-activated / invariant-deactivated events in the event log.
 */
export function filterActiveInvariants(
  definitions: YamlInvariantDef[],
  events: AnyEventEnvelope[],
): YamlInvariantDef[]

/**
 * Convert a YamlInvariantDef into an InvariantRule by constructing a pure
 * check function from the declarative spec. No eval() or new Function().
 *
 * Examples of what each checkType produces:
 * - "event-count": counts events of the specified type in ctx, compares against threshold
 * - "field-exists": checks event.payload has the named field (not undefined)
 * - "field-matches": checks event.payload[field] === expected value
 */
export function buildYamlInvariantRule(def: YamlInvariantDef): InvariantRule {
  const { id, description, ruleType, appliesTo, check } = def;
  return {
    id,
    ruleType,
    description,
    appliesTo,
    check: buildCheckFunction(check, description),
  };
}

function buildCheckFunction(
  spec: YamlCheckDef,
  description: string,
): InvariantRule["check"] {
  switch (spec.checkType) {
    case "event-count": {
      const { eventType, comparison, value } = spec;
      return (_event: AnyEventEnvelope, ctx: CheckContext) => {
        const events = ctx.eventsByType.get(eventType);
        const count = events?.length ?? 0;
        const passed =
          comparison === "eq" ? count === value :
          comparison === "lt" ? count < value :
          comparison === "lte" ? count <= value :
          comparison === "gt" ? count > value :
          count >= value; // gte
        return passed ? null : { message: `${description}: expected ${eventType} count ${comparison} ${value}, got ${count}` };
      };
    }
    case "field-exists": {
      const { field } = spec;
      return (event: AnyEventEnvelope, _ctx: CheckContext) => {
        const payload = event.payload as Record<string, unknown> | null;
        if (payload == null || !(field in payload)) {
          return { message: `${description}: missing required field "${field}" in payload` };
        }
        return null;
      };
    }
    case "field-matches": {
      const { field, expected } = spec;
      return (event: AnyEventEnvelope, _ctx: CheckContext) => {
        const payload = event.payload as Record<string, unknown> | null;
        const actual = payload?.[field];
        return actual === expected ? null : { message: `${description}: expected ${field} = ${String(expected)}, got ${String(actual)}` };
      };
    }
  }
}
```

Tests for `yaml-loader.ts` cover: parsing valid YAML with each `checkType` variant, handling malformed YAML gracefully (missing fields, unknown checkType), activation/deactivation event filtering, and round-trip (parse -> build -> check) for each declarative check type.

**Performance note:** The hook replays the full event log on every append. Per the architecture's performance analysis, this is <50ms for typical logs (<400 events). This is acceptable for v2. If profiling shows otherwise, a cached replay can be added later.

**Replay Zod re-validation note:** The production `getContext` (via `replayEvents`) re-validates all prior events through Zod on every append call. This is a known optimization point -- since events were already validated on write, a future optimization could use `JSON.parse` without re-validation for the replay path. Not blocking for v2; correctness over performance.

**Integration tests (`integration.test.ts`):**

Test scenarios using real `appendEvent` calls with the invariant hook:

1. **Happy path:** Append `project-initialized`, then `epic-created` -- both succeed.
2. **Violation: missing project-initialized:** Append `epic-created` without prior `project-initialized` -- throws `InvariantError` with `project.exists` violation.
3. **Violation: duplicate active epic:** Append two `epic-created` on same branch -- second throws with `epic.single-active-per-branch`.
4. **Multiple violations:** Construct a scenario triggering 2+ invariants simultaneously -- error contains all violations.
5. **prevId chain integrity:** Append event with wrong prevId -- `event.prev-id-chain` catches it.

Each test uses a real temp directory with a real `events.jsonl` file, matching slice 01's test pattern.

**Smoke test (`smoke.test.ts`):**

A single test that exercises a realistic multi-event workflow, covering at least one invariant from each major domain category (entity-lifecycle, structural, pressure-test, briefing):

```
 1. project-initialized                    (pass)
 2. epic-created                           (pass -- project exists)
 3. epic-goal-committed                    (pass)
 4. exploration-cycle-started              (pass -- goal committed)
 5. exploration-cycle-started w/ bad prevId (FAIL -- event.prev-id-chain)
 6. epic-created on same branch            (FAIL -- single active per branch)
 7. architecture-target-committed          (pass)
 8. pressure-test-committed                (pass)
 9. slice-set-committed w/o findings triaged (FAIL -- pressure-test.findings-all-accepted)
10. slice-set-committed                    (pass -- no unresolved findings)
11. slice-implementation-started           (pass after plan convergence events)
12. epic-completed without slices landed   (FAIL -- all slices landed)
13. pause-entered                          (pass)
14. epic-completed w/o briefing            (FAIL -- briefing.written-at-pause)
```

Verifies the JSONL file contains exactly the 9 successful events (5 failures rejected and not appended). This exercises 8+ distinct invariants across entity-lifecycle, structural, pressure-test, and briefing domains.

### Expected Behavior

**Before:** `appendEvent` has a `beforeAppend` hook but no concrete implementation. Events are appended without invariant checks.

**After:**
- `createBeforeAppendHook()` returns a function compatible with `AppendEventOptions.beforeAppend`.
- Calling `appendEvent` with the hook rejects events that violate invariants by throwing `InvariantError`.
- The `InvariantError` contains all violations (not just the first), with `code: "INVARIANT_FAILED"`.
- Rejected events are NOT written to the JSONL file.
- The 72 existing event engine tests continue passing (they don't use the hook).
- The smoke test demonstrates a realistic 14-event scenario with 9 passes and 5 rejections, exercising 8+ invariants across entity-lifecycle, structural, pressure-test, and briefing domains.

### Verification

```bash
# Run all invariant tests (framework + rules + integration + smoke)
bun run test tests/engine/invariants/

# Confirm existing event engine tests still pass
bun run test tests/engine/events/

# Full test suite
bun run test

# Type check
bunx tsc --noEmit

# Lint
bunx biome check src/engine/invariants/
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Event type names not yet finalized** | Invariants reference specific event types like `"epic-created"`, `"slice-landed"`. If event schemas (slice 03+) use different names, invariants break. | Use the canonical names from the architecture doc's event catalog. If names change, invariant rules are simple string comparisons -- easy to update. |
| **Payload field access on `unknown`** | `AnyEventEnvelope.payload` is `unknown`. Invariants that inspect payload fields (e.g., `chunk.evidence-non-empty` checking for an `evidence` field) need type narrowing. | Use the `narrowPayload(payload, schema)` helper from `_helpers.ts` which takes a Zod schema and returns typed data or `null`. This prevents `as any` creep across all 24 invariants. Fall back to `as Record<string, unknown>` with runtime property checks only when no Zod schema exists yet. |
| **Replay performance on every append** | Each append replays the full log. For a hot append loop (e.g., bulk event creation), this could be slow. | Not a v2 concern per architecture doc (< 50ms for < 400 events). If needed, the hook can cache the replay result within a single command invocation. |
| **Invariant ordering/dependencies** | Some invariants implicitly depend on others (e.g., `epic.goal.committed-before-explore` assumes `project.exists` passed). If `project.exists` fails, the explore check may produce a confusing secondary error. | The checker runs all rules and reports all violations. Callers see the full picture. No ordering needed -- the violation messages are self-explanatory. |
| **`spine.write-only-via-milestone` semantics unclear** | The architecture says spine changes must be bundled into milestones, but the exact event sequencing is not yet implemented. | Implement as `ruleType: "custom"` with a TODO comment. Best-effort check: spine-domain events should have a `milestone-committed` event as the immediately preceding event. Flag this as needing refinement when the milestone system is built. |
| **Architecture doc says `src/engine/invariants/` but task prompt says `src/trust/`** | Conflicting paths. | Follow the architecture doc (`src/engine/invariants/`). The overview, engine.md, and conventions all confirm the invariant engine is in the engine layer, not trust. |

## Smoke Script

The smoke script is implemented as `tests/engine/invariants/smoke.test.ts` (a Vitest test, not a standalone script) to match slice 01's verification pattern. It can be run standalone:

```bash
bun run test tests/engine/invariants/smoke.test.ts
```

The smoke test creates a temp directory, wires up `appendEvent` with the invariant hook, and runs the 14-event scenario described in Phase 4. It asserts:
- 9 events successfully appended to JSONL.
- 5 events rejected with `InvariantError` containing the expected rule IDs.
- The JSONL file contains exactly 9 lines, each valid JSON matching `AnyEventEnvelopeSchema`.
- The prevId chain is unbroken across all 9 events.
- At least 8 distinct invariant IDs are exercised (verified by collecting violation rule IDs).

Additionally, a standalone smoke script at `tests/engine/invariants/smoke-standalone.ts` (runnable via `bun tests/engine/invariants/smoke-standalone.ts`) provides a non-Vitest verification path that prints pass/fail results to stdout, matching the pattern from slice 01.
