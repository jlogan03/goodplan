# TUI & CLI Review — Round 3

## Round 2 Resolution Assessment

Round 2 had 3 IMPORTANT issues and 4 MINOR issues.

**IMPORTANT-1** (submit-* two-step dance): RESOLVED. commands-api.md now explicitly documents that `submit-*` commands route through the RPC Layer, trigger state events (e.g., `submit-plan` triggers `COMPLETE_PLAN`), and handle content write + state transition in a single `commitState` call. The command-to-event mapping table includes the submit-* mappings. No two-step dance.

**IMPORTANT-2** (positional `<phase>` in context command): RESOLVED. The `context` command has been removed. Sub-agents get context via `start-*` commands. The overview notes "There is no standalone `context` command."

**IMPORTANT-3** (Windows platform gaps): RESOLVED. `_overview.md` now has a "Known Platform Gaps" section documenting `fs.rename` atomicity differences, path separator concerns, and `process.stdin.isTTY` behavior. Windows is marked as aspirational.

**MINOR-1** (schema positional arg): RESOLVED. `goodplan schema [--command <command-path>] [--json] [--query <jq>]` now uses `--command` flag.

**MINOR-2** (resource namespace inconsistency): Substantially addressed. Resource commands now show consistent flag patterns.

**MINOR-3** (`--override` not documented as pattern): NOT RESOLVED. `--override` still appears only inline on specific command signatures. Not in global flags table, not documented as a cross-cutting refinement convention.

**MINOR-4** (help text strategy): NOT RESOLVED. No mention of `--help` output quality as a concern.

## Issues

### IMPORTANT-1: abandon commands missing `--reason` flag but state machine requires `reason` field

**Severity:** IMPORTANT
**Files:** `commands-api.md`, `state-machine-api.md`

The state machine events are:
```
{ type: 'ABANDON_EPIC'; epic: string; reason: string }
{ type: 'ABANDON_SLICE'; slice: string; reason: string }
{ type: 'ABANDON_QUEST'; quest: string; reason: string }
```

All three require a `reason` string. The CLI commands show:
```
goodplan epic:abandon --epic <name>
goodplan slice:abandon --slice <name>
goodplan quest:abandon --quest <name>
```

No `--reason` flag is documented. Either the commands should show `--reason <text>` as a required flag, or accept reason via stdin JSON — but neither is specified. Implementers will hit a Zod validation failure or build the flag without spec guidance.

### IMPORTANT-2: `epic:complete` missing input documentation for `verificationResults`

**Severity:** IMPORTANT
**Files:** `commands-api.md`, `state-machine-api.md`

The state machine event is:
```
{ type: 'COMPLETE_EPIC'; epic: string; verificationResults: VerificationResult[] }
```

The CLI shows:
```
goodplan epic:complete --epic <name>
```

No input flags or stdin JSON structure is documented. `verificationResults` is non-trivial — the implementer needs to know its schema. Given that `slice:complete` has a detailed stdin JSON example, `epic:complete` should have equivalent documentation. The asymmetry is a spec gap.

### IMPORTANT-3: `COMPLETE_IMPLEMENTATION` and `COMPLETE_QUEST_IMPLEMENTATION` absent from command-to-event mapping table

**Severity:** IMPORTANT
**Files:** `commands-api.md`, `state-machine-api.md`

The state machine defines both `COMPLETE_IMPLEMENTATION` (slice) and `COMPLETE_QUEST_IMPLEMENTATION` (quest). The `submit-implementation` command exists in the sub-agent section but is not listed in the command-to-event mapping table. The mapping table ends at `submit-architecture` but does not include `submit-implementation`. An implementer following the table to wire up event dispatch will miss this case.

### MINOR-1: `epic:create`, `quest:create`, `decision:create` show no input documentation

**Severity:** MINOR
**Files:** `commands-api.md`

Create commands map to events with required fields:
- `CREATE_EPIC` requires `name: string; goal: string`
- `CREATE_QUEST` requires `name: string`
- `CREATE_DECISION` requires `id: string; domain: string; title: string; summary: string`

The CLI signatures show only `goodplan epic:create`, `goodplan quest:create`, `goodplan decision:create` with no flags or stdin JSON examples. Compare to `slice:complete` which has a detailed stdin example. Create commands need at minimum flag signatures (e.g., `epic:create --name <name>`) or a note that they accept stdin JSON with the required fields. The pattern is inconsistent: `epic:add-verification --epic <name>` shows the `--epic` flag explicitly, but `epic:create` shows nothing.

### MINOR-2: `--override` not in global flags table and not documented as a refinement convention

**Severity:** MINOR
**Files:** `commands-api.md`

`--override` appears on four commands (`epic:refine-architecture`, `epic:refine-slices`, `slice:refine-plan`, `quest:refine-plan`) but is absent from the global flags table and not described as a cross-cutting pattern. The global flags table lists `--json`, `--quiet`, `--query`, `--inline`, `--verbose` — `--override` is not "global" (applies to refinement commands only), but its usage pattern and semantics ("bypass score threshold circuit breaker") should be documented in one place. Currently an implementer must infer what `--override` does from its presence in command signatures alone.

### MINOR-3: `quest:start` event mapping undocumented

**Severity:** MINOR
**Files:** `commands-api.md`

The command-to-event mapping table maps `quest:create` → `CREATE_QUEST` but there is no row for `quest:start`. The quest lifecycle section shows `goodplan quest:start --quest <name>` and the state machine defines `BEGIN_QUEST`, but the connection is not in the mapping table. It appears to be an omission — `epic:explore` maps to `BEGIN_EXPLORE`, so `quest:start` should map to `BEGIN_QUEST`.

### MINOR-4: No help text quality guidance

**Severity:** MINOR
**Files:** `commands-api.md`

Carried from round 2. citty generates `--help` output automatically from command definitions. The architecture doesn't note that command `meta.description` fields and flag descriptions with types/defaults are required. For an LLM consumer, `goodplan schema` is the machine-readable interface, but `goodplan <cmd> --help` is the human fallback. One line noting that citty's generated help must include descriptions and flag metadata would be sufficient to prevent a "no help text" implementation default.

## Score: 8.5/10

Round 3 is a strong spec. The major round-2 issues (submit-* two-step, context command positional args, Windows gaps) are fully resolved. The command-to-event mapping is the best addition — it makes the CLI→state machine wiring explicit and testable. stdin behavior, color, `--query`, and `--verbose` are all correctly specified.

The remaining gaps are narrower but implementation-critical: three IMPORTANT issues all follow the same pattern — the CLI command surface doesn't document required input for mutations that the state machine requires. The abandon commands missing `--reason`, `epic:complete` missing `verificationResults`, and `COMPLETE_IMPLEMENTATION` missing from the mapping table are spec holes an implementer will discover only when wiring the RPC layer. These are quick fixes (add flags or stdin examples), not design changes.

## Summary

- Critical: 0
- Important: 3
- Minor: 4
