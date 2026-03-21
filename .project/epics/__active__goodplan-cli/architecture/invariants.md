# System Invariants

## INV-001: Every state mutation goes through the state machine

- **Rationale:** The state machine is the single enforcer of workflow rules, transition validity, and cross-entity consistency. Bypassing it (writing JSON directly) risks invalid states that the CLI can't recover from.
- **Scope:** System-wide — applies to all code paths that modify JSON entity files
- **Verification:** Read-only commands (`list`, `show`) go directly to the Data Layer. All mutation commands route through the RPC Layer which calls `reduce()`. Fitness function candidate: no direct `writeEntity()` calls outside of `commitState()` for entity JSON files.

## INV-002: JSON files always use deterministic key ordering

- **Rationale:** Alphabetical key ordering minimizes git merge conflicts when multiple branches modify the same JSON file. Without this, semantically identical JSON can produce diffs.
- **Scope:** Data Layer — all JSON and JSONL write operations
- **Verification:** Enforced in `writeEntity()`, `appendRecord()`, and `commitState()`. Fitness function candidate: round-trip test confirming write → read → write produces identical output.

## INV-003: The state machine is pure — no I/O

- **Rationale:** Purity makes the state machine trivially unit-testable and ensures all transition logic can be verified without filesystem setup. It also guarantees the state machine's behavior is deterministic and reproducible.
- **Scope:** State Machine subsystem — the `reduce()` function and all transition tables, guards, and apply functions
- **Verification:** The state machine imports no I/O modules (no `fs`, no `path` for file operations). Fitness function candidate: import analysis confirming no I/O dependencies.

## INV-004: Every command is stateless — target flags required

- **Rationale:** No implicit state from prior commands. Each command is self-describing and can be understood in isolation. This enables safe concurrent sessions (multiple terminals, orchestrator + sub-agents).
- **Scope:** Commands Layer — all command definitions
- **Verification:** Every mutation command requires explicit target flags (`--slice`, `--epic`, `--quest`). Fitness function candidate: command schema analysis confirming no commands rely on ambient state.

## INV-005: Schema validation on every read and every write

- **Rationale:** Invalid data must never reach the state machine (corrupting transition logic) or the filesystem (corrupting stored state). Validation at both boundaries catches bugs in either direction.
- **Scope:** Data Layer — all `readEntity()`, `writeEntity()`, `readRecords()`, `appendRecord()`, `assembleState()`, `commitState()` operations
- **Verification:** Every read parses through Zod and throws on failure. Every write validates through Zod before serializing. Fitness function candidate: test confirming malformed JSON is rejected on both read and write paths.

## INV-006: `schema` output reflects actual command signatures

- **Rationale:** The `schema` command is the mechanism by which skills stay in sync with the CLI without hardcoding. If its output diverges from actual command signatures, LLM orchestrators will construct invalid commands.
- **Scope:** Commands Layer — the `schema` global command and all command definitions
- **Verification:** The `schema` command output is generated from the same citty command definitions used at runtime — it is not a separate data source. Fitness function candidate: for each command in the schema output, compare its flags and input schema against the actual command definition and assert equality.

## INV-007: No silent errors — structured error responses with correct exit codes

- **Rationale:** Silent failures are undetectable by both humans and LLMs. Every error must be surfaced with a namespaced error code, a human-readable message, and the correct exit code so callers can reliably detect and handle failures.
- **Scope:** System-wide — all error paths
- **Verification:** Exit code 0 on success, 1 for internal/unexpected errors, 2 for validation/usage errors, 3 for state machine errors (invalid transitions, guard failures). All errors return the structured `{ error: { code, message, detail? } }` shape. No empty catch blocks. Fitness function candidate: test confirming every error code path produces a non-zero exit and a valid error JSON object.
