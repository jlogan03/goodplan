# Implementation Plan: tracer-bullet-integration

## Goal

Insert tiered verification requirements into slice goals 05-12 and the sequencing doc so that each slice includes integration testing appropriate to its layer, rather than deferring all integration testing to slice 12.

## Background

Slices 01-04 (engine layer) already have appropriate verification: unit tests and the `smoke-event-engine.ts` smoke script. No changes needed for those slices. The gap is in slices 05-12 which currently describe verification in terms of expected behaviors but do not specify *how* to verify (what test infrastructure, what patterns). This quest adds that specificity using a tiered model:

- **Command layer (05, 06, 07b):** CLI binary integration tests using `Bun.spawnSync` on the `gp` binary (absolute path) against fixture repos in `/tmp`. This extends the pattern from the slice 03 smoke script. Slice 05 also includes unit tests for the Context Bundler module.
- **Trust layer (07a):** Unit tests for trust-layer logic (reviewer registry, routing, YAML parsing) plus CLI binary integration tests for `gp reviewer:*` and `gp rubric:*` commands.
- **Skill layer (08-11):** Agent SDK harness tests using `tools/dogfood/` patterns (`query()` with `permissionMode: "bypassPermissions"`, local plugin, isolated env).
- **Capstone (12):** Full end-to-end dogfood -- unchanged, but now validates the *final* integration rather than being the *only* integration test.

---

## Phase 1: Update slice goals and docs with tiered verification strategy

**Objective:** Add explicit verification tier requirements to each slice goal (05-12) and update the sequencing doc and architecture docs to codify the tiered strategy. After this phase, any plan-phase agent reading the goal and architecture context will see the verification requirements and include them in generated plans.

**Precondition:** Before beginning edits, verify all 8 slice goal files (05 through 12) exist at their expected paths. If any are missing, create them with a minimal `## Goal` section first.

**Note:** Slices 01-04 (engine and trust foundation layers) already have appropriate verification via unit tests and the `smoke-event-engine.ts` smoke script. No changes are needed for those slices.

**Task ordering:** Update the sequencing doc first (task 1.1) to establish the tiered model vocabulary, then update individual slice goals (tasks 1.2-1.10) referencing it, then update the architecture doc (task 1.11).

### Expected Behavior

**Before:**
- Slice goals 05-12 list verification steps as behavioral expectations (e.g., "Full lifecycle test: create -> plan -> implement -> land") without specifying what test infrastructure to use
- Sequencing doc describes the ordering rationale by layer but says nothing about verification approach per layer
- No architecture guidance on which verification tier applies to which slice

**After:**
- Each slice goal 05-07b includes a "Verification Tier" section specifying the appropriate test tier (CLI binary integration tests, unit tests, or both) via `Bun.spawnSync` against fixture repos
- Each slice goal 08-11 includes a "Verification Tier" section specifying Agent SDK harness tests via `tools/dogfood/` patterns
- Slice 12 goal clarifies it is the capstone integration test, not the first
- Sequencing doc has a "Verification Strategy" section explaining the tiered model
- Architecture `commands.md` references the CLI binary test pattern for command-layer slices

### Tasks

#### 1.1 Update sequencing doc with verification strategy

**File:** `.goodplan/epics/workflow-bug-fixes/slices/sequencing.md`

**Add** a new section between "Slice Ordering" and "Dependency Graph":

```markdown
## Verification Strategy

Each slice includes tier-appropriate integration testing. The tiers escalate with architectural layer:

| Layer | Slices | Verification Tier | Pattern | Location |
|---|---|---|---|---|
| Engine (L0) | 01-03 | Unit tests + smoke script | Direct module imports, `Bun.spawnSync` on `gp` binary | `tests/`, `scripts/smoke-event-engine.ts` |
| Trust Foundation (L1) | 04 | Unit tests + smoke script | Same as L0 | `tests/` |
| Trust (L1) | 07a | Unit tests + CLI binary integration tests | Unit tests for registry/routing/parsing; `Bun.spawnSync` for CLI commands | `tests/trust/` |
| Command (L2) | 05, 06, 07b | CLI binary integration tests (+unit tests for 05 Context Bundler) | `Bun.spawnSync` on `gp` binary against fixture repos in `/tmp` | `tests/commands/`, `tests/context/` |
| Skill (L3) | 08-11 | Agent SDK harness tests | `query()` with local plugin, isolated env | `tools/dogfood/` |
| Capstone (L4) | 12 | Full end-to-end dogfood | Agent SDK harness against real `.goodplan/` state | `tools/dogfood/` |

**Principle: cheapest effective verification.** CLI binary tests (`Bun.spawnSync`) are sufficient for command-layer slices because they exercise the full command path (args -> derived state -> invariants -> event append -> output). Agent SDK harness tests are needed for skill-layer slices because they exercise the skill-to-CLI boundary (LLM decides which commands to call, parses output, handles errors).

**Repo vs installed plugin:** Changes to the repo do not affect the installed `gp` CLI or plugin. Slices can freely replace v1 commands with v2 commands. The installed plugin remains v1 throughout the epic. Test harnesses use the local `gp` build (resolved via absolute path, e.g., `join(import.meta.dir, "..", "gp")`) and `plugins: [{ type: "local", path: PLUGIN_DIR }]` (local plugin build), never the installed versions.
```

#### 1.2 Update slice 05 goal (epic-lifecycle-commands)

**File:** `.goodplan/epics/workflow-bug-fixes/slices/05-epic-lifecycle-commands/goal.md`

**Add** a "Verification Tier" section after the existing "Verification" section:

```markdown
## Verification Tier

**Tier: CLI binary integration tests + Context Bundler unit tests**

This slice owns the Context Bundler (`src/context/`), which is a pure computational module. It requires both:

1. **Unit tests** in `tests/context/` exercising the Context Bundler with mock `DerivedStateData` inputs (no CLI needed)
2. **CLI binary integration tests** in `tests/commands/epic/` exercising the `gp` binary via `Bun.spawnSync` against a fixture repo in `/tmp`

This supplements the existing integration tests in `tests/commands/` referenced in the slice goal.

CLI integration test pattern:

1. Create a temp directory with `gp init` (via spawnSync, using absolute binary path)
2. Run the command sequence under test (e.g., `gp epic:create`, `gp epic:goal-draft`, etc.)
3. Assert on exit codes, stdout JSON (parsed), and resulting event log entries
4. Clean up the temp directory

At minimum, cover:
- Epic creation + list/show round-trip
- Full lifecycle: create -> goal -> architecture -> pressure-test -> slices -> activate -> complete
- Error paths: invariant violations produce correct error codes and messages
- Context bundle: phase-starting commands return expected bundle fields
```

#### 1.3 Update slice 06 goal (slice-lifecycle-commands)

**File:** `.goodplan/epics/workflow-bug-fixes/slices/06-slice-lifecycle-commands/goal.md`

**Add** a "Verification Tier" section after the existing "Verification" section:

```markdown
## Verification Tier

**Tier: CLI binary integration tests**

Integration tests in `tests/commands/slice/` exercising the `gp` binary (resolved via absolute path) using `Bun.spawnSync` against a fixture repo. Pattern: create temp dir, init, create epic, activate, then exercise slice commands.

At minimum, cover:
- Slice creation within an active epic + list/show round-trip
- Full lifecycle: create -> plan-draft -> plan-commit -> implement-start -> chunk lifecycle -> code-refine -> land
- Chunk lifecycle paths: start -> verify -> complete, and start -> fail, and start -> skip
- Invariant enforcement: can't land without completing implementation, can't start chunk before implement-start
- Context bundle fields from phase-starting commands
```

#### 1.4 Update slice 07a goal (reviewer-registry-rubrics)

**File:** `.goodplan/epics/workflow-bug-fixes/slices/07a-reviewer-registry-rubrics/goal.md`

**Add** a "Verification Tier" section after the existing "Verification" section:

```markdown
## Verification Tier

**Tier: Trust-layer unit tests + CLI binary integration tests**

Slice 07a is architecturally in the Trust layer, not the Command layer. It has a dual nature: trust-layer logic (reviewer registry, routing, YAML rubric parsing) and CLI commands (`gp reviewer:*`, `gp rubric:*`). Both need verification:

1. **Unit tests** in `tests/trust/` exercising reviewer registry, routing logic, and YAML rubric parsing with mock data (no CLI needed)
2. **CLI binary integration tests** in `tests/trust/` exercising reviewer and rubric CLI commands via `Bun.spawnSync` against a fixture repo in `/tmp`

At minimum, cover:
- `gp reviewer:list` returns all registered reviewers with valid metadata
- `gp reviewer:show <id>` returns correct reviewer details
- `gp rubric:list` returns all rubrics
- `gp rubric:validate` detects intentionally broken rubric fixtures
- Registry correctly routes review requests to matching reviewers (unit test)
```

#### 1.5 Update slice 07b goal (supporting-entity-commands)

**File:** `.goodplan/epics/workflow-bug-fixes/slices/07b-supporting-entity-commands/goal.md`

**Add** a "Verification Tier" section after the existing "Verification" section:

```markdown
## Verification Tier

**Tier: CLI binary integration tests**

Integration tests in `tests/commands/` exercising all ~25 supporting entity commands via `Bun.spawnSync`. Pattern: create temp dir, init, create epic (for scoping), then exercise entity commands.

At minimum, cover:
- Side-quest lifecycle: create -> implement-start -> chunk-start -> chunk-verify -> land
- Finding lifecycle: capture -> triage -> list/show
- Decision lifecycle: record -> supersede -> list/show
- Learning lifecycle: capture -> promote -> list/show
- Events query: events:tail returns recent events
- Invariant enforcement on each entity type
```

#### 1.6 Update slice 08 goal (core-skills)

**File:** `.goodplan/epics/workflow-bug-fixes/slices/08-core-skills/goal.md`

**Add** a "Verification Tier" section after the existing "Verification" section:

```markdown
## Verification Tier

**Tier: Agent SDK harness tests**

Create `tools/dogfood/test-core-skills-v2.ts` exercising each skill through the Agent SDK harness. Pattern: `query()` with `permissionMode: "bypassPermissions"`, `plugins: [{ type: "local", path: PLUGIN_DIR }]`, `settingSources: []`, `env: createTestEnv(PLUGIN_DIR)`.

At minimum, cover:
- `/gp:init` skill initializes a project in a temp directory (existing `test-init.ts` pattern, adapted for v2 commands)
- `/gp:status` skill returns structured project state
- `workflow-guide` skill provides orientation text referencing v2 commands
- All skills invoke the local `gp` binary (not v1 state mutations) for state changes
```

#### 1.7 Update slice 09 goal (epic-creation-skills)

**File:** `.goodplan/epics/workflow-bug-fixes/slices/09-epic-creation-skills/goal.md`

**Add** a "Verification Tier" section after the existing "Verification" section:

```markdown
## Verification Tier

**Tier: Agent SDK harness tests**

Create or extend `tools/dogfood/test-create-epic-v2.ts` exercising the create-epic pipeline through the Agent SDK harness.

At minimum, cover:
- `create-epic` skill produces an epic with goal, architecture, and slices via v2 `gp epic:*` commands
- Shape checkpoint commands are called during the flow
- `start-epic` skill activates the epic
- Event log contains expected event sequence (verified via `gp events:tail --json`)
```

#### 1.8 Update slice 10 goal (slice-execution-skills)

**File:** `.goodplan/epics/workflow-bug-fixes/slices/10-slice-execution-skills/goal.md`

**Add** a "Verification Tier" section after the existing "Verification" section:

```markdown
## Verification Tier

**Tier: Agent SDK harness tests**

Create or extend `tools/dogfood/test-slice-execution-v2.ts` exercising the slice execution pipeline through the Agent SDK harness.

At minimum, cover:
- `plan-slice` skill produces a plan via v2 `gp slice:*` commands
- `implement-slice` skill emits chunk lifecycle events
- `land-slice` skill completes the slice and detects final-slice epic completion
- Full pipeline: plan -> implement -> land produces expected event sequence
```

#### 1.9 Update slice 11 goal (supporting-skills)

**File:** `.goodplan/epics/workflow-bug-fixes/slices/11-supporting-skills/goal.md`

**Add** a "Verification Tier" section after the existing "Verification" section:

```markdown
## Verification Tier

**Tier: Agent SDK harness tests**

Create or extend `tools/dogfood/test-supporting-skills-v2.ts` exercising side-quest and audit skills through the Agent SDK harness.

At minimum, cover:
- `create-side-quest` skill creates a side quest via v2 `gp side-quest:*` commands
- Side-quest lifecycle: create -> implement -> land through skills
- `audit` skill dispatches to agents and produces structured findings
```

#### 1.10 Update slice 12 goal (migration-dogfood)

**File:** `.goodplan/epics/workflow-bug-fixes/slices/12-migration-dogfood/goal.md`

**Change** the goal framing to clarify this is the capstone, not the first integration test.

**Replace** the first paragraph of the Goal section with:

```markdown
## Goal

Implement the full `gp migrate` command (v1 -> v2 state migration) and run the capstone end-to-end dogfood test against real project state. By this point, each preceding slice has its own tier-appropriate integration tests (CLI binary tests for 05-07b, Agent SDK harness tests for 08-11). This slice validates the full system works together against real `.goodplan/` state, and that migration from v1 produces a valid v2 event log.
```

#### 1.11 Update architecture commands doc

**File:** `.goodplan/epics/workflow-bug-fixes/architecture/commands.md`

**Add** a section at the end of the file:

````markdown
## Command Integration Test Pattern

All command-layer slices (05, 06, 07b) and trust-layer slice 07a include CLI binary integration tests. The pattern uses `Bun.spawnSync` to invoke the built `gp` binary (resolved via absolute path) against fixture repos:

```typescript
import { spawnSync } from "bun";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestEnv } from "./utils";

// Resolve binary path absolutely (not relative ./gp)
const GP_BIN = join(import.meta.dir, "..", "gp");

// Setup
const dir = mkdtempSync(join(tmpdir(), "gp-test-"));
const gp = (args: string[]) => {
  const result = spawnSync([GP_BIN, ...args], { cwd: dir, env: createTestEnv(dir) });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
    json: () => JSON.parse(result.stdout.toString()),
  };
};

// Init fixture
gp(["init", "--non-interactive"]);

// Exercise commands
const createResult = gp(["epic:create", "--name", "test-epic", "--json"]);
assert(createResult.exitCode === 0);
assert(createResult.json().ok === true);

// Teardown
rmSync(dir, { recursive: true });
```

This pattern extends the approach from `scripts/smoke-event-engine.ts` but operates at the CLI binary level rather than importing modules directly. Each command-layer slice adds tests to `tests/commands/<namespace>/`.
````

### Verification

**Before:** `grep -r 'Verification Tier' .goodplan/epics/workflow-bug-fixes/slices/*/goal.md` returns no matches

1. Read each modified goal file and confirm the "Verification Tier" section is present and specifies the correct tier
2. Read the sequencing doc and confirm the "Verification Strategy" section is present between "Slice Ordering" and "Dependency Graph"
3. Read `architecture/commands.md` and confirm the "Command Integration Test Pattern" section is present at the end
4. Confirm slice 12 goal explicitly mentions preceding slices have their own integration tests

---

## Summary

- **1 phase**, documentation-only
- **11 files** modified (8 slice goals, 1 sequencing doc, 1 architecture doc, plus the slice 12 goal reframing)
- **Zero code changes** -- purely updating goals and docs so future plan-phase agents see the verification requirements (no code files should be modified)
- **Key constraint respected:** No new reviewer agent (installed plugin won't have it). Verification requirements are embedded directly in slice goals where the plan-phase agent reads them.
