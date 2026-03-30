# TUI & CLI Review

## Issues

### CRITICAL-1: Brainstorm command surface diverges significantly from architecture commands-api.md
**Severity:** CRITICAL
**Resolution:** Reconcile commands-api.md with brainstorm/command-surface.md or explicitly supersede
**File:** `.project/epics/__active__goodplan-cli/architecture/commands-api.md`

The brainstorm document defines a rich, phase-scoped command surface (`epic:explore begin`, `build:plan begin`, `build:refine-plan start-reviewer`, etc.) with orchestrator/sub-agent verb separation (`begin`/`complete` vs `start-*`/`submit-*`). The architecture's commands-api.md flattens this into a different structure (`epic:explore`, `slice:plan`, `slice:refine-plan`) that drops the orchestrator/sub-agent verb split entirely. There are no `start-*`/`submit-*` commands in the architecture, no `build:` namespace, and no `synthesize-changes` phase.

This isn't a simplification -- it's an unresolved gap. The decision document (command-surface-conventions) explicitly establishes the orchestrator vs sub-agent verb split as a core convention. The architecture either needs to implement it or record a decision to drop it.

Specific conflicts:
- Decision says `begin`/`status`/`context`/`complete` are orchestrator verbs and `start-*`/`submit-*` are sub-agent verbs. Architecture has no `start-*`/`submit-*` commands at all.
- Brainstorm defines `build:` namespace for slice/quest execution. Architecture uses `slice:` and `quest:` namespaces instead.
- Brainstorm defines `build:synthesize-changes` as a completion sub-phase. Architecture has only `slice:complete`.
- Brainstorm's `resource:` namespace has create/update mutations. Architecture's `resource:` is read-only. (The architecture version is better -- but the conflict needs explicit acknowledgment.)

### CRITICAL-2: `--inline-context` flag definition is inconsistent across files
**Severity:** CRITICAL
**Resolution:** Standardize the flag name and type across all architecture files
**Files:** `commands-api.md`, `conventions.md`, `_overview.md`, `rpc-layer-api.md`

The flag appears as:
- `--inline-context` (boolean or number) in commands-api.md global flags table
- `--inline-context[=<bytes>]` in the `context` command signature
- `--inline-context` with `--inline` budget-based content inlining in _overview.md
- `--inline` in the decision document (2026-03-20-inline-flag-replaces-depth.md)
- `inlineContext?: boolean | number` in the RPC layer WorkflowOptions

The decision document chose `--inline` as the flag name. The architecture uses `--inline-context` everywhere. Pick one and be consistent. Also: the `context` command signature shows `--inline-context[=<bytes>]` suggesting optional-value syntax, but the global flags table shows it as `boolean or number` -- these are different CLI parsing strategies. citty's `type: 'string'` with optional value is different from a boolean flag with an optional numeric argument.

### IMPORTANT-1: No `--verbose` or `--debug` flag defined despite conventions referencing it
**Severity:** IMPORTANT
**Resolution:** Add `--verbose` to the global flags table in commands-api.md
**File:** `.project/epics/__active__goodplan-cli/architecture/commands-api.md`

Conventions.md states: "stderr for diagnostics (only with `--verbose`), stdout for command output. Never mix." But `--verbose` does not appear in the global flags table in commands-api.md. This is a cross-platform concern too -- diagnostic output to stderr is important for LLM consumers piping stdout through `jq` or similar tools. Define the flag and its behavior.

### IMPORTANT-2: No `--no-color` / color detection strategy defined
**Severity:** IMPORTANT
**Resolution:** Document color output behavior in commands-api.md
**File:** `.project/epics/__active__goodplan-cli/architecture/commands-api.md`

picocolors is listed as a dependency and human-readable mode uses colored output. But there's no mention of:
- `--no-color` flag or `NO_COLOR` env var (the de facto standard: https://no-color.org/)
- Automatic detection of non-TTY stdout (piped output should suppress color)
- How `--json` mode interacts with color (presumably no color, but not stated)

This matters for cross-platform compatibility and for LLM consumers who may pipe output. picocolors does handle `NO_COLOR` and TTY detection automatically, but the architecture should document the expected behavior so it's intentional rather than accidental.

### IMPORTANT-3: stdin JSON input pattern lacks practical detail for LLM consumers
**Severity:** IMPORTANT
**Resolution:** Define stdin content type detection and empty-stdin behavior
**File:** `.project/epics/__active__goodplan-cli/architecture/commands-api.md`

The architecture says mutations accept stdin JSON, but doesn't specify:
- What happens when stdin is empty (no pipe) -- does the command block waiting for input, or detect non-pipe stdin and skip?
- Whether stdin must be JSON or can be other formats (the brainstorm mentions heredocs)
- How the CLI detects "stdin has content" vs "stdin is a terminal" (important: `process.stdin.isTTY` in Bun)
- Maximum stdin size (relevant for plan content which could be large)

LLMs calling this CLI will pipe heredocs. If the CLI blocks waiting on stdin when no pipe is connected, every mutation command will hang when called without input. This is a common CLI footgun.

### IMPORTANT-4: `--query` flag error behavior undefined
**Severity:** IMPORTANT
**Resolution:** Specify error handling for invalid jq expressions
**File:** `.project/epics/__active__goodplan-cli/architecture/commands-api.md`

The `--query` flag applies a jq filter via jqjs, but the architecture doesn't specify what happens when:
- The jq expression is syntactically invalid
- The expression is valid but selects nothing (empty result)
- The expression produces multiple results

These need defined behaviors and exit codes. Invalid expression should be exit code 2 (usage error). Empty result could be exit 0 with empty output or exit 1 -- the choice matters for scripting.

### IMPORTANT-5: Windows cross-platform support unaddressed
**Severity:** IMPORTANT
**Resolution:** Add a cross-platform section to conventions.md or commands-api.md
**File:** `.project/epics/__active__goodplan-cli/architecture/conventions.md`

The overview lists `windows-x64` as a target platform, but the architecture has no mention of Windows-specific concerns:
- Path separators in `.project/` paths (forward slash in JSON, but Windows uses backslash natively)
- stdin pipe detection differences
- Signal handling (SIGINT/SIGTERM vs Windows equivalents)
- File locking for concurrent modification detection (rename atomicity differs on Windows)
- picocolors Windows terminal color support (modern Windows Terminal vs legacy cmd.exe)

If Windows is a real target, these need at least a "known gaps" section. If it's aspirational, say so.

### IMPORTANT-6: `resource:` namespace command routing is verbose
**Severity:** IMPORTANT
**Resolution:** Consider flattening resource commands or documenting the UX rationale
**File:** `.project/epics/__active__goodplan-cli/architecture/commands-api.md`

`goodplan resource:epic list` is 3 tokens deep before any flags. Compare with the entity namespace: `goodplan epic:create` is 2 tokens. This inconsistency means:
- Read operations: `goodplan resource:epic show --epic foo`
- Write operations: `goodplan epic:activate --epic foo`

The `resource:` prefix serves as a "read-only" marker, which is architecturally clean, but the UX cost is real. Users (human and LLM) must remember which namespace to use for reads vs writes. Consider whether `goodplan epic show --epic foo` (same namespace, verb implies read) would be simpler while maintaining the read-only routing contract internally.

### MINOR-1: The `schema` command's query capabilities are underspecified
**Severity:** MINOR
**Resolution:** Define what `goodplan schema` outputs
**File:** `.project/epics/__active__goodplan-cli/architecture/commands-api.md`

The brainstorm has detailed schema discovery (`goodplan schema epic`, `goodplan schema build:refine-plan submit-review`). The architecture just lists `goodplan schema [--json] [--query <jq>]` with no detail on what the output contains, whether it accepts a command path argument, or how deep the schema information goes. This is a key LLM ergonomics feature (per the skill-cli-integration decision, schema is the "escape hatch").

### MINOR-2: Exit code space could be richer
**Severity:** MINOR
**Resolution:** Consider adding exit code 3 for state machine errors
**File:** `.project/epics/__active__goodplan-cli/architecture/conventions.md`

Currently: 0 = success, 1 = error, 2 = validation/usage. State machine errors (invalid transitions) are lumped with data errors and internal errors under exit code 1. Since LLMs parse exit codes, distinguishing "you asked for an invalid transition" (recoverable, try a different command) from "filesystem error" (something is broken) would improve LLM error handling. Consider: 2 = usage/validation, 3 = state error (invalid transition), 1 = internal/data error.

### MINOR-3: Flows document uses command syntax inconsistent with commands-api.md
**Severity:** MINOR
**Resolution:** Update flows.md command examples to match commands-api.md
**File:** `.project/epics/__active__goodplan-cli/architecture/flows.md`

Flows.md shows `goodplan begin plan --slice 01-auth` and `goodplan complete --slice 01-auth` and `goodplan context plan --slice 01-auth` and `goodplan epic start --epic goodplan-cli`. Commands-api.md shows `goodplan slice:plan`, `goodplan slice:complete`, `goodplan epic:activate`. These are completely different command surfaces. The flows document appears to reflect an earlier verb-first design that was superseded by the colon-namespace decision.

### MINOR-4: `GOODPLAN_DIR` env var not mentioned in architecture files
**Severity:** MINOR
**Resolution:** Reference the env var in the data layer or conventions architecture files
**File:** `.project/epics/__active__goodplan-cli/architecture/data-layer-api.md`

Conventions.md defines `GOODPLAN_DIR` to override the default `.project/` location. The data layer architecture doesn't mention it. Since the data layer owns all filesystem paths, it should document how the base path is determined.

## Score: 5/10

The individual subsystem APIs (state machine, data layer, RPC layer) are well-designed with clear contracts and clean boundaries. The architecture excels at the "deep modules" goal -- each layer has a simple interface hiding significant complexity. However, the command surface -- the most critical part from a TUI/CLI perspective -- has serious internal inconsistencies. The brainstorm, decisions, and architecture files describe three different command surfaces that haven't been reconciled. The flows document uses yet another syntax. For an LLM-first CLI, getting the command surface right and consistent is table stakes.

To reach 9+:
1. Reconcile the command surface across all documents (CRITICAL-1) -- decide whether the orchestrator/sub-agent verb split exists and update everything to match
2. Standardize the `--inline-context` / `--inline` naming (CRITICAL-2)
3. Address the practical LLM-consumer concerns: stdin detection, `--verbose`, color handling, Windows paths
4. Update flows.md to use the actual command syntax

## Summary
- Critical: 2
- Important: 6
- Minor: 4
