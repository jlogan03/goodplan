# Implementation Plan — 12-migration-dogfood-v2

## Goal

Wire the existing RPC-based migration system (`src/core/rpc/migrate.ts`, 1932 lines) into the `gp migrate` command (currently detection-only), add v2 event generation from the migrated state tree, and run the capstone dogfood test. The existing migration infrastructure handles Q&A rounds, state building, artifact copying, and learnings migration — this slice extends it to also produce `events.jsonl` files for the v2 event-sourced system.

---

## Phase 1: Wire Existing RPC Migration into `gp migrate`

**Objective:** Connect the existing `rpcMigrate()` function from `src/core/rpc/migrate.ts` to the `gp migrate` command entry point, which currently only detects v1/v2 projects but defers actual migration.

### Expected Behavior

**Before:** `gp migrate --json` reports `{ version: "v1", message: "Full migration available in a future release." }`. The comment in `migrate.ts` says "Full migration logic is deferred to slice 12."

**After:** `gp migrate` wires through to the existing RPC migration protocol. The `/gp:upgrade` skill already drives this protocol — `gp migrate` now works as the CLI transport for the Q&A rounds.

**Verification:**
- `bun run build` succeeds
- `bun test` passes (existing migration tests still pass)
- `gp migrate --json` on a v1 project initiates the RPC migration protocol

### Tasks

#### 1.1 Wire rpcMigrate into the Command

Update `src/commands/global/migrate.ts`:
- Import `rpcMigrate` from `../../core/rpc/migrate.js`
- After v1 detection, call `rpcMigrate(goodplanDir, stdinData, cwd)` to start the RPC protocol
- The existing RPC protocol handles rounds (inventory, epic detail, confirmation) via stdin/stdout JSON
- The `/gp:upgrade` skill already knows how to drive this protocol — no skill changes needed
- Remove the "deferred to slice 12" comment

#### 1.2 Verify Existing Test Suite

Run `bun test tests/integration/migrate*.test.ts` — all existing tests must pass with the wiring change. The existing tests exercise:
- 3-round migration flow
- `buildMigrationState()` correctness
- `commitState()` output
- Learnings migration (`migrate-learnings.test.ts`)
- Overview consolidation (`migrate-overview.test.ts`)

### Verification

1. `bun run build` succeeds
2. `bun test tests/integration/migrate*.test.ts` passes
3. `gp migrate --json` no longer returns "deferred" message

---

## Phase 2: Add v2 Event Generation Post-Migration

**Objective:** After the existing `buildMigrationState()` + `commitState()` completes (producing v1-format entity JSON files), generate v2 events from the migrated state tree and write them to scope-appropriate `events.jsonl` files. This enables the v2 derived state computer to work on migrated projects.

### Expected Behavior

**Before:** Migration produces entity JSON files (epic.json, slice.json, quest.json) but no `events.jsonl`. The v2 derived state computer cannot process migrated state.

**After:** Migration additionally produces `events.jsonl` files at each scope (project, epic, side-quest) with valid v2 event envelopes. `gp status --json` works on migrated state via the v2 event replay path.

**Verification:**
- `bun run build` succeeds
- `bun test` passes
- `events.jsonl` exists at project and epic scopes after migration
- `gp verify` passes on migrated state
- `gp status --json` returns correct derived state

### Tasks

#### 2.1 Create Event Generator Module

Create `src/core/rpc/migrate-events.ts`:
- `generateV2Events(state: ProjectState, goodplanDir: string): void` — walks the migrated ProjectState tree and writes v2 events
- **Bulk write approach**: Build all event envelopes in-memory per scope, validate each via `AnyEventEnvelopeSchema.parse()`, then write the entire batch with `fs.writeFileSync()`. Do NOT use `appendEvent` — migration bypasses the invariant engine (INV-001 exception) and avoids per-event lock overhead.
- Each event envelope has: UUID `id` (generated via `crypto.randomUUID()`), `schemaVersion: 1`, `ts` (use entity timestamps from migrated state where available, fall back to migration time; ensure monotonically increasing within scope), `scope`/`scopeRef` (derived from directory path), `actor: { kind: "cli", id: "gp:migrate" }`, `branch` (current git branch via `getGitBranch()`, fall back to `"migration"` if detached HEAD), `commitHint` (current HEAD via `getGitCommitHint()`), `domain`/`type`/`payload` per event type, `prevId` (chained in-memory — each event's `prevId` = previous event's `id` in same scope, first event has `prevId: null`).

#### 2.2 Map Migrated State to V2 Event Sequences

For each entity in the migrated ProjectState, emit the minimum event sequence that produces the equivalent v2 phase:

**Project scope** (`events.jsonl`):
- `project-initialized` (always)

**Epic scope** (`epics/*/events.jsonl`):

**Complete V1 Epic Status → V2 Event Mapping** (all 14 EpicStatus values from `src/schemas/entities/epic.ts`):

| V1 Epic Status | V2 Events to Emit | Rationale |
|---|---|---|
| `created` | `epic-created` | No goal yet |
| `exploring` | `epic-created`, `epic-goal-committed` | Goal done, exploration in progress |
| `explored` | `epic-created`, `epic-goal-committed` | Exploration done (no v2 explore events needed — migration captures end-state) |
| `defining-architecture` | `epic-created`, `epic-goal-committed` | Architecture in progress |
| `architecture-defined` | `epic-created`, `epic-goal-committed` | Architecture done, pre-refinement |
| `refining-architecture` | `epic-created`, `epic-goal-committed` | Architecture refinement in progress |
| `architecture-refined` | `epic-created`, `epic-goal-committed` | Architecture refined |
| `defining-slices` | `epic-created`, `epic-goal-committed` | Slices in progress |
| `slices-defined` | `epic-created`, `epic-goal-committed` | Slices done, pre-refinement |
| `refining-slices` | `epic-created`, `epic-goal-committed` | Slice refinement in progress |
| `slices-refined` | `epic-created`, `epic-goal-committed` | Slices refined, ready for activation |
| `activated` | `epic-created`, `epic-goal-committed`, `epic-activated` | Active epic |
| `completed` | `epic-created`, `epic-goal-committed`, `epic-activated`, `epic-completed` | Done |
| `abandoned` | `epic-created`, `epic-abandoned` | Abandoned |

**Note:** Intermediate statuses (`exploring` through `slices-refined`) all collapse to the same v2 event sequence (`epic-created` + `epic-goal-committed`). The v2 phase model doesn't have equivalents for these intermediate states — the derived state computer will show the epic at an early phase, which is correct since the detailed phase work was done under v1 and not captured as v2 events.

**Complete V1 Slice Status → V2 Event Mapping** (all 9 SliceStatus values from `src/schemas/entities/slice.ts`):

| V1 Slice Status | V2 Events to Emit |
|---|---|
| `created` | `slice-created` |
| `planning` | `slice-created` |
| `plan-created` | `slice-created`, `slice-plan-drafted` |
| `refining` | `slice-created`, `slice-plan-drafted`, `plan-shape-checkpoint-auto-shaped` |
| `plan-refined` | `slice-created`, `slice-plan-drafted`, `plan-shape-checkpoint-auto-shaped`, `slice-plan-committed` |
| `implementing` | above + `slice-implementation-started` |
| `implementation-complete` | above + `slice-implementation-started` |
| `completed` | above + `slice-implementation-started`, `slice-code-refinement-started`, `code-refinement-converged`, `slice-landed` |
| `abandoned` | `slice-created`, `slice-abandoned` |

**Note:** `slice-code-refinement-started` is emitted for `completed` slices because the v2 reducer requires it to reach the `slice-landed` phase (P12 requires P11 code-refinement-converged invariant). This is a migration-specific accommodation — the original slice may not have had a formal code refinement phase.

**Complete V1 Quest Status → V2 Side-Quest Event Mapping** (all 11 QuestStatus values):

| V1 Quest Status | V2 Events to Emit |
|---|---|
| `created` | `side-quest-created` |
| `exploring` | `side-quest-created` |
| `explored` | `side-quest-created` |
| `planning` | `side-quest-created`, `side-quest-goal-committed` |
| `plan-created` | `side-quest-created`, `side-quest-goal-committed` |
| `refining` | `side-quest-created`, `side-quest-goal-committed` |
| `plan-refined` | `side-quest-created`, `side-quest-goal-committed`, `side-quest-plan-committed` |
| `implementing` | above + `side-quest-implementation-started` |
| `implementation-complete` | above + `side-quest-implementation-started` |
| `completed` | above + `side-quest-implementation-started`, `side-quest-landed` |
| `abandoned` | `side-quest-created`, `side-quest-abandoned` |

**Design notes:**

**ContentRef construction for migration payloads:** Several event payloads require `ContentRef` (git blob SHA + size + path + mediaType) — e.g., `epic-goal-committed` needs `{ goal: ContentRef }`, `slice-plan-drafted` needs `{ plan: ContentRef }`, `side-quest-goal-committed` needs `{ goal: ContentRef }`. V1 stores these as plain strings or files, not git blobs. **Strategy:** For each content artifact, read its content as a string (via `fs.readFileSync(path, "utf-8")` for on-disk files, or directly for in-memory strings from entity JSON), then call `await storeContentRef(content, logicalPath, "text/markdown")` from `src/engine/content/store.ts`. The `logicalPath` is the relative path within `.goodplan/` where the artifact lives (e.g., `epics/<name>/goal.md`). The function's signature is `storeContentRef(content: string, filePath: string, mediaType: string): Promise<ContentRef>` — the first parameter is always the content string, NOT a file path.

**planExtractSchema for `slice-plan-committed`:** The `slicePlanCommittedPayloadSchema` requires `extract: planExtractSchema` (structured plan data). The schema uses `.strict()` with 4 required fields. **Strategy:** Attempt to use `planExtractor` from `src/trust/extractors/` to parse existing `plan.md`/`plan-refined.md`. However, v1 plan files lack fenced `yaml extract` blocks, so extraction will typically return `{ success: false }` — this is expected. **Fallback (common path for migration):** use a minimal extract: `{ chunks: [], chunkDependencies: [], affectedSubsystems: [], rollbackPath: "N/A - migrated from v1" }`. The migrated state captures that a plan was committed, even if the structured extract is unavailable. Note: `side-quest-plan-committed` does NOT require an `extract` field (asymmetry with slices).

**`preference` field for auto-shaped events:** `plan-shape-checkpoint-auto-shaped` requires `preference: SteeringPreferenceSchema` (one of `"always-consult"`, `"best-guess-and-flag"`, `"ask-in-the-moment"`). **Migration default:** use `"best-guess-and-flag"` — this is the default steering preference and accurately reflects that migration auto-approved without user consultation.

**`sliceRef` for slice events:** All slice-scoped event payloads require `sliceRef: string`. Populate from the slice's directory name (same as the `name` field in v1 entity JSON).

**`dir` and `goal` for `side-quest-created`:** The `sideQuestCreatedPayloadSchema` requires `dir` (directory slug) and `goal` (string). Derive `dir` from the v1 quest directory name; `goal` from the v1 quest entity's goal field.

**Payload schema locations:** `src/schemas/events/epic.ts`, `src/schemas/events/slice.ts`, `src/schemas/events/side-quest.ts`, `src/schemas/events/project.ts`. Validate each event type string at compile time by importing type constants from these modules — do not use raw string literals.

#### 2.3 Wire into Migration Pipeline

In `src/core/rpc/migrate.ts`, after `commitState()` completes:
1. Call `generateV2Events(newState, outputDir)` to write `events.jsonl` files
2. This is additive — the existing entity JSON files are preserved for v1 backward compatibility
3. The v1 fallback shim in `slice:list`/`slice:show` (added in slice 06) reads entity JSON when no events exist; now events will exist too, and the v2 path takes priority

**Error handling:** If `generateV2Events()` throws mid-write (e.g., after writing project events but before epic events), treat the migration as failed. Delete any partially-written `events.jsonl` files (the entity JSON from `commitState()` is still valid — the v1 fallback path works). Log the error and suggest re-running migration. The entity JSON provides a safe fallback until event generation succeeds.

#### 2.4 Handle Envelope Fields

**Branch:** Use `getGitBranch()` from `src/util/git-info.ts`. If detached HEAD (returns `"HEAD"`), use `"migration"` as fallback. Document this: migration events carry the branch at migration time, not the original branch.

**Timestamps:** Use v1 entity `created`/`updated` fields (NOT `createdAt`/`updatedAt` — the actual field names in `src/schemas/entities/epic.ts`, `slice.ts`, `quest.ts` are `created` and `updated`). For entities without timestamps, use migration completion time. **Precision:** The `eventTimestampSchema` requires `datetime({ precision: 3 })` (exactly 3 decimal places). V1 entity timestamps may lack ms precision — normalize all timestamps to ISO 8601 with exactly 3 decimal places before use (e.g., append `.000Z` if missing). Ensure monotonically increasing timestamps within each scope (add 1ms increments if needed to prevent duplicates).

**Scope/ScopeRef:** Project events: `scope: "project", scopeRef: null`. Epic events: `scope: "epic", scopeRef: epicName`. Side-quest events: `scope: "side-quest", scopeRef: questName`.

### Verification

1. `bun run build` succeeds
2. `bun test` passes
3. After migration, `events.jsonl` exists at project, epic, and side-quest scopes
4. Each event passes `AnyEventEnvelopeSchema.parse()` validation
5. prevId chains are valid (each event's prevId = previous event's id)
6. `gp status --json` returns correct derived state from v2 event replay

---

## Phase 3: Integration Tests for Event Generation

**Objective:** Add tests verifying the v2 event generation produces valid event logs that the derived state computer can process.

### Expected Behavior

**Before:** Existing migration tests verify entity JSON output only.

**After:** New tests verify events.jsonl generation, prevId chains, derived state correctness, and idempotency.

### Tasks

#### 3.1 Extend Existing Migration Tests

Add to `tests/integration/migrate.test.ts` (or a new `tests/integration/migrate-events.test.ts`):
- Test: after migration, `events.jsonl` exists at each scope
- Test: each event in the log parses via `AnyEventEnvelopeSchema`
- Test: prevId chains are valid per scope
- Test: `computeDerivedState()` on the event log produces correct phase for each entity
- Test: migrated epic phase matches v1 status (e.g., v1 `activated` → v2 derived phase P6)
- Test: migrated slice phase matches v1 status (e.g., v1 `plan-refined` → v2 derived phase P9)

#### 3.2 Test Post-Migration appendEvent Compatibility

**Critical:** After bulk-writing migration events, the v2 system must be able to append new events normally. Test that `appendEvent` works on a scope that has bulk-written events:
- After migration, call a v2 command (e.g., `gp slice:create --epic <name> --name test-slice --json`) on the migrated state
- Verify it succeeds (no prevId chain errors, no lock issues)
- Verify the new event's `prevId` correctly references the last migration event's `id`

This validates that bulk-written events are fully compatible with the normal append pipeline.

#### 3.3 Test Idempotency

- Test: running migration on already-migrated state (v2 events exist) detects v2 and skips
- Test: re-running the event generator on existing events.jsonl does not duplicate events

#### 3.4 Use Existing Fixtures

Use the existing `tests/fixtures/pre-cli-project/` and `withMigrateFixture()` helper pattern. Extend if needed with additional v1 state configurations (e.g., epic with multiple slices at various statuses).

### Verification

1. `bun test tests/integration/migrate*.test.ts` passes with new event tests
2. Event generation tests cover all v1 status → v2 event sequence mappings

---

## Phase 4: Capstone Dogfood Test

**Objective:** Run migration against a copy of this repo's actual `.goodplan/` state, then verify the v2 system works on the migrated output.

### Expected Behavior

**Before:** No end-to-end migration dogfood test exists.

**After:** `tools/dogfood/test-migration-v2.ts` runs migration on a copy of real project state, verifies integrity, and confirms the v2 derived state computer produces correct output.

### Tasks

#### 4.1 Create Migration Dogfood Script

Create `tools/dogfood/test-migration-v2.ts` as a **CLI-only test** (not Agent SDK — migration is a command, not a skill). This is intentionally different from the skill-based dogfood tests:

1. Deep-copy this repo's `.goodplan/` to a temp directory
2. Initialize a git repo in the temp dir (migration needs git context)
3. Run `gp migrate` via the built binary (use `GP_BIN` path from `platformBinaryDir()`, not installed `gp`), threading through the RPC rounds programmatically. **Answer derivation strategy:** Parse the copied `.goodplan/` v1 state files to extract answer payloads dynamically (not hardcoded). Use the existing migration schemas from `src/commands/global/migrate/schemas.ts` (`inventoryResponseSchema`, `epicDetailResponseSchema`, `confirmationResponseSchema`) to construct valid answers:
   - Round 1 (inventory): read `project.json` for name, read `overview.json` or entity dirs for epic/quest names and statuses
   - Round 2 (epic details): read `epics/*/epic.json` for slice lists, read slice directories for ordering
   - Round 3 (confirmation): confirm with `{ confirmed: true }`
4. Verify migration exit code 0
5. Verify `events.jsonl` exists at project and epic scopes
6. Verify `gp verify --json` passes
7. Verify `gp status --json` returns expected structure (epic name, slice count)
8. Verify idempotency: run `gp migrate --json` again → detects v2, skips

**Note:** This test uses `execFileSync` with the built binary, not Agent SDK `query()`. Migration is a pure CLI command with RPC rounds, not a skill/agent workflow. The test feeds pre-computed answers to the RPC protocol.

#### 4.2 Verify Derived State Correctness

After migration + event generation:
- `gp epic:show --epic workflow-bug-fixes --json` — verify epic is discoverable with correct phase
- `gp slice:list --epic workflow-bug-fixes --json` — verify slices are listed with correct statuses
- Event log entries have valid UUIDs and prevId chains

### Verification

1. `bun tools/dogfood/test-migration-v2.ts` exits with code 0
2. Migration produces valid v2 event logs from real project state
3. `gp verify` passes post-migration
4. Derived state matches expected (epic active, slices at correct phases)

---

## Phase 5: Build Verification + Cleanup

**Objective:** Final build check, test suite pass, command registry update.

### Tasks

#### 5.1 Full Build + Test

`bun run build` and `bun test` — both must pass with zero failures.

#### 5.2 Command Registry Verification

Verify `gp migrate --help` works correctly and the command routes to `rpcMigrate`. Update `schema.ts` if needed for any new args.

#### 5.3 Architecture Doc Reconciliation

Review `.goodplan/epics/workflow-bug-fixes/architecture/migration.md` against what was actually implemented. Note any deviations:
- Date-prefixed epic directory renaming: if NOT implemented (existing migration doesn't do this), note as deferred/superseded in the architecture doc
- Architecture doc consolidation (`architecture-current.md`): if the existing migration preserves `architecture/` as-is, note this as the current behavior

### Verification

1. `bun run build` succeeds
2. `bun test` passes with 0 failures

---

## Notes

### Relationship Between Existing Systems

| System | Purpose | Location |
|---|---|---|
| `rpcMigrate()` | Multi-round Q&A migration protocol | `src/core/rpc/migrate.ts` (1932 lines) |
| `buildMigrationState()` | Constructs ProjectState from Q&A answers | Same file |
| `commitState()` | Writes entity JSON, overview, HMAC | `src/core/data/commit.ts` |
| `migrateLearnings()` | Converts monolithic learnings to per-file | `src/core/rpc/migrate.ts` |
| `migrateOverviewConsolidation()` | Merges old-style overviews | Same file |
| `/gp:upgrade` skill | Drives the Q&A protocol via Agent SDK | `plugin/skills/upgrade/SKILL.md` |
| `gp migrate` command | CLI entry point (currently detection-only) | `src/commands/global/migrate.ts` |
| **NEW: `generateV2Events()`** | Writes events.jsonl from migrated state | `src/core/rpc/migrate-events.ts` |

### What This Slice Adds vs What Already Exists

| Capability | Status |
|---|---|
| V1 detection | ✅ Exists (migrate.ts) |
| Q&A protocol (3 rounds) | ✅ Exists (rpcMigrate) |
| State tree building | ✅ Exists (buildMigrationState) |
| Entity JSON writing | ✅ Exists (commitState) |
| Learnings migration | ✅ Exists (migrateLearnings) |
| Overview consolidation | ✅ Exists (migrateOverviewConsolidation) |
| Artifact copying | ✅ Exists (copyMigrationArtifacts) |
| **Command wiring** | 🆕 This slice (Phase 1) |
| **V2 event generation** | 🆕 This slice (Phase 2) |
| **Event generation tests** | 🆕 This slice (Phase 3) |
| **Capstone dogfood** | 🆕 This slice (Phase 4) |

### Event Writing Strategy

**Bulk write, not appendEvent.** Migration events bypass the invariant engine (INV-001 exception). Envelopes are built in-memory with manual prevId chaining, validated via `AnyEventEnvelopeSchema.parse()`, and written in a single `fs.writeFileSync()` per scope. This avoids per-event lock overhead and invariant conflicts from synthetic event sequences.

### Files Changed/Created by This Slice

**Modified:**
- `src/commands/global/migrate.ts` — wire rpcMigrate, remove "deferred" comment
- `src/core/rpc/migrate.ts` — add generateV2Events call after commitState
- `src/commands/global/schema.ts` — update migrate command args if needed

**Created:**
- `src/core/rpc/migrate-events.ts` — v2 event generation from migrated state
- `tests/integration/migrate-events.test.ts` — event generation tests
- `tools/dogfood/test-migration-v2.ts` — capstone dogfood test
