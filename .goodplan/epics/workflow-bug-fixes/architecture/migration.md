# Migration Strategy

## Approach: Clean Break

v2 is built from scratch alongside v1. The v1 state machine (`core/state/`) is retired entirely — not incrementally modified. A migration command converts existing `.goodplan/` state.

**Rationale:** The architectural change (mutable JSON entities -> append-only event log + derived state) is too fundamental for incremental migration. Every command's internals must be rewritten regardless of whether the CLI surface stays the same.

## Build Ordering

Four layers with internal dependencies. Each layer is testable independently before proceeding to the next.

### Layer 0: Event Engine + Hooks (foundation)

| # | Item | Depends on | Deliverable |
|---|---|---|---|
| 1 | Event log writer/reader | — | Append JSONL, read/stream, prevId chain validation |
| 2 | Event envelope schema | 1 | Zod schemas for envelope + entity lifecycle event types |
| 3 | Invariant engine | 1, 2 | Core invariants, check-before-append |
| 4 | Derived state computer | 1, 2 | Stream events -> current state, phase detection, blocker identification, suggestedNextSteps |
| 5 | Hook updates | — | Protect `events.jsonl` and spine files immediately |

**Test gate:** Can append events, check invariants, and compute derived state from a test event log.

### Layer 1: Core CLI + Bootstrap Trust Substrate

| # | Item | Depends on | Deliverable |
|---|---|---|---|
| 6 | `gp init` | 1-4 | Bootstrap with events.jsonl, `project-initialized`, subsystem registration |
| 7 | `gp status` | 4 | Derived state + suggestedNextSteps |
| 8 | Bootstrap rubric | — | Hardcoded test rubric with 1-2 reviewers |
| 9 | `gp refine:*` | 1-4, 8 | Artifact-agnostic refinement loop, convergence evaluator, circuit breaker |
| 10 | Milestone logic | 1 | Internal milestone commit (called by phase-completing commands) |

**Test gate:** Can init a project, run status, and exercise the refinement loop with the bootstrap rubric.

**Chicken-and-egg note:** `gp refine:*` needs rubrics to test, but the full reviewer registry comes in Layer 2. The bootstrap rubric (item 8) resolves this — a minimal hardcoded rubric with 1-2 reviewers is sufficient for Layer 1 testing.

### Layer 2: Entity Commands + Full Trust Substrate

Items have internal ordering. Build in sequence:

**2a. Foundation commands:**

| # | Item | Depends on | Deliverable |
|---|---|---|---|
| 11 | Extractor framework | 2 | All 10 extractors (required before commit commands) |
| 12 | `gp subsystem:*` | 1-4 | Register, update-maturity, retire, list, show |
| 13 | Full reviewer registry + rubrics | 8 | All reviewers registered, rubrics in YAML, routing function |
| 14 | Context bundler integration | 4 | Per-phase context assembly (internal module called by phase-starting entity commands) |

**2b. Entity commands (depend on 2a):**

| # | Item | Depends on | Deliverable |
|---|---|---|---|
| 15 | `gp epic:*` | 11, 13 | Full lifecycle: goal, architecture, pressure-test, slices, shape checkpoints, steering |
| 16 | `gp slice:*` | 15 | Plan, shape, implement, chunks, code-refine, land |
| 17 | `gp side-quest:*` | 11, 13 | Full lifecycle (uses same extractor/reviewer infra) |

**2c. Supporting commands (parallel with 2b):**

| # | Item | Depends on | Deliverable |
|---|---|---|---|
| 18 | `gp finding:*`, `gp briefing:*`, `gp invariant:*` | 1-4 | Trust substrate commands |
| 19 | `gp reviewer:*`, `gp rubric:*` | 13 | Registry query commands |
| 20 | `gp decision:*`, `gp learning:*`, `gp events:*`, `gp project:*` | 1-4 | Remaining commands |

**Test gate:** Full command surface exercised via unit and integration tests.

### Layer 3: Skills + Agents

| # | Item | Depends on | Deliverable |
|---|---|---|---|
| 21 | Reviewer file migration | 13 | Move reviewer `.md` files to `plugin/reviewers/`, update YAML frontmatter to v2 format |
| 22 | Skill rewrites | 6-20 | Starting with `workflow-guide` and `status`, then phase-owning skills |
| 23 | Agent contract updates | — | Structured return format, new agents (pressure-test, verifier, completion-side-quest) |
| 24 | Agent reference rewrites | 23 | Rubric YAML, review-preamble, plan-format, sub-agent-return-format |

**Test gate:** Agent SDK harness exercises the full skill pipeline.

### Layer 4: Migration + Validation

| # | Item | Depends on | Deliverable |
|---|---|---|---|
| 25 | `gp migrate` | 1-20 | v1 to v2 migration command |
| 26 | Test harness updates | 22-24 | Exercise new pipeline end-to-end |
| 27 | Dogfood: real epic | 25, 26 | Validate with actual usage on this repo |

### Critical Path

```
Event engine -> derived state -> gp status -> bootstrap rubric -> gp refine:*
  -> extractors -> entity commands -> skills
```

Extractors are on the critical path because commit commands (e.g., `gp epic:goal-commit`) run extractors to produce structured event payloads.

## v1 to v2 Migration (`gp migrate`)

### Precondition

**Commit all changes before running `gp migrate`.** Git history is the rollback mechanism. If migration produces unexpected results, `git checkout -- .goodplan/` restores the pre-migration state. The migration command verifies a clean working tree and aborts with `STATE_CONFLICT` if uncommitted changes exist under `.goodplan/`.

### v1 Command Rename Mapping

| v1 Command | v2 Equivalent | Notes |
|---|---|---|
| `gp plan` | `gp slice:plan-draft` | Now scoped to a specific slice |
| `gp implement` | `gp slice:implement-start` | Split into implement + land |
| `gp task:create` | `gp finding:capture` | Renamed concept |
| `gp quest:create` | `gp side-quest:create` | Renamed concept |
| `gp quest:complete` | `gp side-quest:land` | Renamed concept |
| `gp rollup` | `gp learning:promote` | Renamed concept |
| `gp create-epic` | `gp epic:create` | Now entity-namespaced |

Skills using v1 command names will receive a deprecation warning with the v2 equivalent. v1 command names are **not** aliased in v2 -- they fail with `NOT_FOUND` and a helpful error message pointing to the v2 equivalent.

### v1-to-v2 Error Code Mapping

| v1 Error | v2 Error Code | Notes |
|---|---|---|
| `STATE_INVALID_TRANSITION` | `STATE_CONFLICT` | Transition guard failures become derived-state conflicts |
| `DATA_CONCURRENT_MODIFICATION` | `STATE_CONFLICT` | HMAC-based concurrency replaced by file lock + prevId |
| `DATA_NO_PROJECT` | `NOT_FOUND` | No initialized project |
| `VALIDATION_INVALID_INPUT` | `SCHEMA_INVALID` | Zod validation failures |
| `STATE_ALREADY_INITIALIZED` | `ALREADY_EXISTS` | Project already initialized |
| `STATE_MISSING_VERIFICATIONS` | `EVIDENCE_MISSING` | Chunk verification evidence absent |
| `STATE_MAX_ROUNDS_REACHED` | `CONVERGENCE_STUCK` | Circuit breaker tripped |

Scripts that match on v1 error codes must be updated. v1 error codes are not emitted in v2.

### Steps

1. Read `.state-cache.json` and entity JSON files
2. Generate equivalent events in `events.jsonl` (per scope)
3. Move architecture docs -> `.goodplan/architecture-current.md`
4. Rename epic directories -> date-prefixed format (`<YYYY-MM-DD>_<slug>`)
5. Rename quest -> side-quest directories
6. Convert `decisions.jsonl` entries -> `decision-recorded` events
7. Convert `learnings.jsonl` entries -> `learning-captured` events + per-file `.md`
8. Generate `project.json` metadata -> `project-initialized` event
9. Validate prevId chain integrity (abort with `STATE_CONFLICT` if chain is broken; user must re-run migration from clean state via `git checkout -- .goodplan/`)
10. Write `invariants.md` (empty initial YAML block)

### What Gets Retired

| v1 File | Disposition |
|---|---|
| `.state-cache.json` | Deleted (replaced by derived state) |
| `activity-log.jsonl` | Deleted (replaced by event log) |
| `decisions.jsonl` | Converted to events, then deleted |
| `learnings.jsonl` | Converted to events + per-file `.md`, then deleted |
| `overview.json` | Deleted (replaced by derived state) |
| `project.json` | Converted to `project-initialized` event, then deleted |
| `epic.json`, `slice.json`, `quest.json` | Converted to events, then deleted |
| `architecture/` directory | Content moved to `.goodplan/architecture-current.md` |
| `src/core/state/` (23 files) | Deleted from source |
| `src/core/data/hmac.ts` | Deleted |
| `src/schemas/state-events.ts` | Complete rewrite |

### Testing

Build migration last. Test with this repo's own `.goodplan/` as the primary test case.

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| **Invariant extraction from transition guards** | Guards are code not data. Manual extraction is error-prone. | Write tests for each invariant BEFORE retiring the transition file. The test becomes the spec. |
| **Event schema explosion** | ~80 event types. Large Zod surface. | Discriminated unions with shared envelope. Start with entity lifecycle, add incrementally. Two-level discriminant if compile times suffer. |
| **Derived state performance** | Streaming full event log per `gp status` could be slow. | Defer optimization. If slow, add derived-state cache file recomputed on append. |
| **Reviewer structured output** | 20 reviewers need format changes. LLMs don't always produce valid JSON. | Zod parsing with retry. Start with 3-5 active reviewers per artifact type. |
| **implement skill split** | Splitting into implement-slice + land-slice requires clear P11->P12 boundary. | Define boundary event (`code-refinement-converged`) first. |
| **v1->v2 migration** | Active projects need to migrate. | Build last. Test with this repo's `.goodplan/`. |
| **Context window pressure** | Chunk events + evidence + reviewer output = lots of context. | Aggressive token budgeting per phase. Sub-agent model (fresh context per chunk). |
| **Rubric bootstrapping** | `refine:*` needs rubrics to test, but full rubrics come later. | Bootstrap rubric with 1-2 reviewers in Layer 1. |
| **Hook protection gap** | New protected files exist before hooks are updated. | Update hooks in Layer 0, not Layer 3. |
| **Collaborative mode regression** | Skills that should wait for user might proceed autonomously. | Phase mode explicitly checked. Test both collaborative and autonomous paths. |

## Cross-References

- Full current-to-target mapping: [brainstorm/11-delta.md](../brainstorm/11-delta.md)
- Current codebase inventory: [research/2026-04-08_codebase-inventory_a7k2z.md](../research/2026-04-08_codebase-inventory_a7k2z.md)
