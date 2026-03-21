# Plan: Tracer Bullet

## Overview

Prove the goodplan CLI tech stack works end-to-end as a compiled binary. Creates the Bun project from scratch, establishes Zod schemas for project.json, builds a minimal data layer, sets up citty with colon-namespace command routing, implements `goodplan init` and `goodplan status`, and compiles to a binary via `bun build --compile`. Validates all high-risk unknowns: Bun compilation with deps, citty colon namespaces, jqjs in compiled binary.

Approach: bottom-up within the slice — scaffolding first, then schemas and data layer, then command framework, then commands, then compile and verify. Each phase is verifiable with `bun run` before the final compilation step.

Key decisions: minimal data layer (just project.json read/write — full state assembly comes in slice 02), stdin infrastructure included early (shared by all future mutation commands), jqjs validated via minimal `--query` flag (full --query behavior in slice 05).

Known limitations (deferred):
- citty silently ignores unknown flags (e.g., `goodplan status --typo-flag` succeeds). Future slices may add custom unknown-flag detection.
- `--help` output for colon-namespaced commands is flat, not grouped. Help grouping for namespaced commands is deferred to a later slice.

## Phase 1: Project Scaffolding

Set up the Bun project with all dependencies, TypeScript config, Biome, and directory structure.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls package.json` — file not found
- [ ] `ls src/index.ts` — file not found

**After implementation** (should pass / show presence):
- [ ] `bun install` exits 0, node_modules/ created, bun.lockb created
- [ ] `bun run check` exits 0 (Biome lint + format passes on empty src/)
- [ ] `ls src/index.ts src/commands/ src/core/ src/schemas/ src/util/` — all exist
- [ ] `cat tsconfig.json | grep noUncheckedIndexedAccess` — returns `true`
- [ ] `cat tsconfig.json | grep exactOptionalPropertyTypes` — returns `true`
- [ ] `cat tsconfig.json | grep verbatimModuleSyntax` — returns `true`

### Tasks

- [x] Create `package.json` with name `goodplan`, type `module`, Bun as runtime
- [x] Add dependencies: citty, zod, picocolors, @michaelhomer/jqjs
- [x] Add dev dependencies: vitest, @biomejs/biome, typescript
- [x] Add scripts: `check` (biome check), `test` (vitest), `install:skills` (placeholder). Note: `build` script is added in Phase 6 when it can be verified
- [x] Create `tsconfig.json` with strict mode + noUncheckedIndexedAccess + exactOptionalPropertyTypes + verbatimModuleSyntax
- [x] Create `biome.json` with formatting and linting rules
- [x] Create directory structure: `src/commands/`, `src/core/data/`, `src/schemas/`, `src/util/`, `tests/unit/`, `tests/integration/`, `tests/fixtures/`. Only create directories needed for this slice — do not create empty placeholders like `src/core/state/` or `src/core/context/`. Note: `conventions.md` directory listing needs updating to match architecture docs
- [x] Create `src/index.ts` — empty entry point (citty setup in Phase 3)
- [x] Run `bun install`, verify clean install

### Verification
Run `bun install && bun run check` — both exit 0.

## Phase 2: Schemas & Minimal Data Layer

Define Zod schemas for project.json and StatusResult. Build minimal data layer: read/write project.json with deterministic key ordering, GOODPLAN_DIR support.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls src/core/data/json.ts` — file not found
- [ ] `ls src/schemas/entities/project.ts` — file not found

**After implementation** (should pass / show presence):
- [ ] `bun test tests/unit/schemas/` — schema validation tests pass (valid and invalid fixtures)
- [ ] `bun test tests/unit/data/` — read/write tests pass (deterministic key ordering, GOODPLAN_DIR override)

### Tasks

- [x] Create `src/schemas/shared.ts` — timestamp schema, version schema
- [x] Create `src/schemas/entities/project.ts` — projectSchema with Zod, infer `Project` type. Fields: version, name, activeEpic (nullable), activeSlice (nullable), activeQuest (nullable), created, updated
- [x] Create `src/schemas/commands/status.ts` — statusResultSchema. Fields: project (name, version), activeEpic/Slice/Quest (nullable objects with name, status, phase), artifacts (empty for now), recommendations (string[]), warnings (string[]). Note: activeEpic/Slice/Quest are projections requiring entity lookup — in this slice they are always null since entities don't exist yet. Document this in the schema file to prevent implementers from trying to populate them
- [x] Create `src/schemas/error-output.ts` — errorSchema (code, message, detail optional)
- [x] Convention: every schema file exports both the schema and its inferred type (e.g., `export type StatusResult = z.infer<typeof statusResultSchema>`, `export type Project = z.infer<typeof projectSchema>`). Establish this pattern for all schema files in this phase
- [x] Create `src/core/data/json.ts` — `readEntity<T>(path, schema)` and `writeEntity<T>(path, data, schema)` with deterministic key ordering using `JSON.stringify` replacer with sorted `Object.entries()`, Zod validation on both read and write
- [x] Create `src/core/data/project.ts` — `resolveProjectDir()` using GOODPLAN_DIR env var or walk up from cwd, `readProject()` and `writeProject()` wrapping json.ts as convenience layer
- [x] Create `src/util/errors.ts` — `GoodplanError` class with code, message, detail. `isGoodplanError()` type guard
- [x] Write unit tests: schema validation (valid/invalid), JSON round-trip (deterministic keys), GOODPLAN_DIR resolution, and a test that creates `.project/` two levels up and verifies `resolveProjectDir()` finds it from a nested subdirectory

### Verification
`bun test tests/unit/` — all pass. Manually verify: create a fixture project.json, read it, write it, confirm byte-identical output (deterministic keys).

## Phase 3: Command Framework

Set up citty with colon-namespace routing, global --json flag, shared output formatting, structured error handling, and stdin infrastructure.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts --help` — no output (empty entry point)
- [ ] `bun run src/index.ts badcommand` — no structured error

**After implementation** (should pass / show presence):
- [ ] `bun run src/index.ts --help` — shows "goodplan" with available commands listed
- [ ] `bun run src/index.ts badcommand 2>/tmp/err.txt; echo $?; cat /tmp/err.txt` — exit 2, stderr contains error message (captured separately to verify correct stream)
- [ ] `bun run src/index.ts badcommand --json 2>/tmp/err.txt; echo $?; test ! -s /tmp/err.txt` — exit 2, stdout shows `{"error":{"code":"VALIDATION_UNKNOWN_COMMAND",...}}`, stderr is empty (JSON errors go to stdout per architecture)

### Tasks

- [ ] Create `src/commands/main.ts` — citty main command definition with global flags: `--json` (boolean), `--help`
- [ ] Create `src/util/output.ts` — `output(data, args)` function: JSON mode (deterministic stringify), human-readable mode (picocolors), error output (JSON to stdout or message to stderr based on --json flag)
- [ ] Create `src/util/stdin.ts` — `readStdin()`: TTY detection (return `{}` if TTY, don't hang), read stdin as string, parse JSON, 1 MB size limit, error on invalid JSON with VALIDATION_INVALID_STDIN code. Add unit tests for TTY detection, JSON parsing, and size limit enforcement (stdin has no callers in this slice, so tests are the only verification)
- [ ] Create `src/util/validate.ts` — `validateInput(schema, args, stdin)`: merge CLI args and stdin, validate with Zod, return typed result or throw VALIDATION_* error. Merge semantics: stdin values are the base object, CLI flags override stdin values, merged object is validated through Zod schema which handles coercion
- [ ] Wire `src/index.ts` to use `runCommand` (NOT `runMain`) as the entrypoint. Build a custom top-level runner that: (1) calls `runCommand` programmatically, (2) catches errors and inspects error type/code, (3) sets `process.exitCode` with the correct code (1 generic, 2 validation, 3 state) and lets the process exit naturally after cleanup, (4) handles `--help` for the main command using citty's `showUsage` (subcommand `--help` like `goodplan init --help` is handled automatically by `runCommand`). This also avoids citty's `--version`/`-v` conflict
- [ ] Parse global flags (like `--json`) before dispatching to subcommands so that `badcommand --json` can return structured JSON errors
- [ ] Handle unknown commands: catch citty's unknown command error, return exit 2 with VALIDATION_UNKNOWN_COMMAND. Error code mapping for the custom runner's try/catch: `CLIError` with `E_UNKNOWN_COMMAND` -> exit 2, `EARG` (missing/invalid argument) -> exit 2, `GoodplanError` -> exit based on error code (1 generic, 2 validation, 3 state), all other errors -> exit 1
- [ ] Handle all uncaught errors: wrap in structured error format, exit 1

### Verification
Run `bun run src/index.ts --help` — shows command list. Run with `badcommand` and `badcommand --json` — verify exit codes and error format.

## Phase 4: Init Command

Implement `goodplan init` — creates .project/ with valid project.json.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts init --help` — command not found or no init-specific help
- [ ] Running init in a directory without .project/ — no .project/ created

**After implementation** (should pass / show presence):
- [ ] In a temp directory: `bun run src/index.ts init --name test-project` — creates `.project/project.json`
- [ ] `cat .project/project.json` — valid JSON with correct fields, validates against projectSchema
- [ ] `bun run src/index.ts init --name test-project --json` (in same dir) — exit 3, `{"error":{"code":"STATE_ALREADY_INITIALIZED",...}}`
- [ ] In a fresh temp dir named `my-test-dir`: `bun run src/index.ts init && cat .project/project.json` — project name is `"my-test-dir"` (verifies `--name` defaults to `path.basename(cwd)`)

### Tasks

- [ ] Create `src/commands/global/init.ts` — citty command: `--name` flag (optional, defaults to `path.basename(cwd)`), `--json` inherited
- [ ] Implement init logic: check if `cwd/.project/` exists via direct `fs.existsSync` (NOT `resolveProjectDir()`, which walks up and could find a parent's `.project/`; init must only check the current directory). Error if exists, otherwise create .project/ directory, write project.json via data layer with name, version "1.0.0", null active pointers, current timestamps
- [ ] Register init command in main.ts
- [ ] Write unit test for init logic (uses temp directory)

### Verification
In a fresh temp directory: `bun run src/index.ts init --name my-project && cat .project/project.json` — valid JSON with correct fields. Run again — exit 3 with STATE_ALREADY_INITIALIZED.

## Phase 5: Status Command & Minimal --query

Implement `goodplan status` (JSON + human-readable) and a minimal `--query` flag using jqjs.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts status` — command not found
- [ ] `bun run src/index.ts status --json --query '.project.name'` — command not found

**After implementation** (should pass / show presence):
- [ ] `bun run src/index.ts init --name test && bun run src/index.ts status --json` — returns valid StatusResult JSON: `{"project":{"name":"test","version":"1.0.0"},"activeEpic":null,...}`
- [ ] `bun run src/index.ts status` — colored terminal output with project name, "No active work", recommendations
- [ ] `bun run src/index.ts status --json --query '.project.name'` — returns `"test"` (just the project name, proving jqjs works)
- [ ] `NO_COLOR=1 bun run src/index.ts status` — produces uncolored output (picocolors respects NO_COLOR)
- [ ] `bun run src/index.ts status --query '.project.name'; echo $?` — exit 2, error about `--json` required (negative test: `--query` without `--json`)

### Tasks

- [ ] Create `src/commands/global/status.ts` — citty command: `--json`, `--query <expr>` flags
- [ ] Implement status logic: read project.json via data layer, build StatusResult (all active pointers null for fresh project, empty artifacts, recommendation: "Run epic:create to start")
- [ ] Implement human-readable output: project name in bold, version, "No active work" section, recommendations list
- [ ] Implement `--query <expr>`: import jqjs, apply the given jq expression to the StatusResult JSON, output the raw result. `--query` requires `--json` (error if used without it). Error handling: invalid jq expression -> exit 2 with `VALIDATION_INVALID_QUERY`; expression matches nothing -> exit 0, prints `null`; expression returns multiple results -> output as JSON array. Note: goal.md says `.name` but the correct filter is `.project.name` since StatusResult nests it under `project`. This minimal implementation validates the jqjs integration pattern that slice 05 uses at scale
- [ ] Register status command in main.ts
- [ ] Write unit tests for status logic and output formatting

### Verification
`bun run src/index.ts init --name smoke-test && bun run src/index.ts status --json` — valid JSON. `bun run src/index.ts status` — colored output. `bun run src/index.ts status --json --query '.project.name'` — returns `"smoke-test"`. `NO_COLOR=1 bun run src/index.ts status` — uncolored output.

## Phase 6: Compile & Binary Verification

Compile to binary and verify everything works as a standalone executable.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls goodplan` — binary doesn't exist
- [ ] `./goodplan status` — not found

**After implementation** (should pass / show presence):
- [ ] `bun run build` produces `./goodplan` binary, exit 0
- [ ] `./goodplan init --name binary-test` in temp dir — creates valid project.json
- [ ] `./goodplan init --name binary-test` again — exit 3, STATE_ALREADY_INITIALIZED
- [ ] `./goodplan status --json` — valid StatusResult JSON
- [ ] `./goodplan status` — colored human-readable output
- [ ] `./goodplan status --json --query '.project.name'` — returns `"binary-test"` (jqjs works in compiled binary)
- [ ] `./goodplan badcommand` — exit 2, structured error
- [ ] `./goodplan --help` — shows command list
- [ ] `NO_COLOR=1 ./goodplan status` — produces uncolored output

### Tasks

- [ ] Add `build` script to package.json: `bun build --compile src/index.ts --outfile goodplan`
- [ ] Add `goodplan` to .gitignore
- [ ] Run `bun run build` — verify binary is created
- [ ] Run full 9-check verification sequence (per Phase 6 verification list below) against the compiled binary
- [ ] Document binary size for baseline tracking in the slice's completion notes

### Verification
Full 9-check verification sequence (per plan verification list), executed against `./goodplan` (not `bun run src/index.ts`):
1. Compile: `bun run build` — exit 0, binary exists
2. Init: `./goodplan init --name test-project` — project.json created and valid
3. Init duplicate: `./goodplan init` — exit 3, STATE_ALREADY_INITIALIZED
4. Status JSON: `./goodplan status --json` — valid StatusResult
5. Status human: `./goodplan status` — colored output
6. jqjs query: `./goodplan status --json --query '.project.name'` — returns `"test-project"`
7. Unknown command: `./goodplan badcommand` — exit 2, structured error
8. Help: `./goodplan --help` — command list
9. NO_COLOR: `NO_COLOR=1 ./goodplan status` — uncolored output
