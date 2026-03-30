# Plan: Tracer Bullet

## Overview

Prove the goodplan CLI tech stack works end-to-end as a compiled binary. Creates the Bun project from scratch, establishes Zod schemas for project.json, builds a minimal data layer, sets up citty with colon-namespace command routing, implements `goodplan init` and `goodplan status`, and compiles to a binary via `bun build --compile`. Validates all high-risk unknowns: Bun compilation with deps, citty colon namespaces, jqjs in compiled binary.

Approach: bottom-up within the slice — scaffolding first, then schemas and data layer, then command framework, then commands, then compile and verify. Each phase is verifiable with `bun run` before the final compilation step.

Key decisions: minimal data layer (just project.json read/write — full state assembly comes in slice 02), stdin infrastructure included early (shared by all future mutation commands), jqjs validated via smoke test flag (full --query in slice 05).

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

- [ ] Create `package.json` with name `goodplan`, type `module`, Bun as runtime
- [ ] Add dependencies: citty, zod, picocolors, @michaelhomer/jqjs
- [ ] Add dev dependencies: vitest, @biomejs/biome, typescript
- [ ] Add scripts: `check` (biome check), `test` (vitest), `build` (bun build --compile), `install:skills` (placeholder)
- [ ] Create `tsconfig.json` with strict mode + noUncheckedIndexedAccess + exactOptionalPropertyTypes + verbatimModuleSyntax
- [ ] Create `biome.json` with formatting and linting rules
- [ ] Create directory structure: `src/commands/`, `src/core/data/`, `src/core/state/`, `src/core/context/`, `src/schemas/`, `src/util/`, `tests/unit/`, `tests/integration/`, `tests/fixtures/`
- [ ] Create `src/index.ts` — empty entry point (citty setup in Phase 3)
- [ ] Run `bun install`, verify clean install

### Verification
Run `bun install && bun run check` — both exit 0.

## Phase 2: Schemas & Minimal Data Layer

Define Zod schemas for project.json and StatusResult. Build minimal data layer: read/write project.json with deterministic key ordering, GOODPLAN_DIR support.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run -e "import { projectSchema } from './src/schemas/entities/project'"` — module not found
- [ ] `ls src/core/data/` — directory exists but empty

**After implementation** (should pass / show presence):
- [ ] `bun test tests/unit/schemas/` — schema validation tests pass (valid and invalid fixtures)
- [ ] `bun test tests/unit/data/` — read/write tests pass (deterministic key ordering, GOODPLAN_DIR override)

### Tasks

- [ ] Create `src/schemas/shared.ts` — timestamp schema, version schema
- [ ] Create `src/schemas/entities/project.ts` — projectSchema with Zod, infer `Project` type. Fields: version, name, activeEpic (nullable), activeSlice (nullable), activeQuest (nullable), created, updated
- [ ] Create `src/schemas/commands/status.ts` — statusResultSchema. Fields: project (name, version), activeEpic/Slice/Quest (nullable objects with name, status, phase), artifacts (empty for now), recommendations (string[]), warnings (string[])
- [ ] Create `src/schemas/errors.ts` — errorSchema (code, message, detail optional)
- [ ] Create `src/core/data/json.ts` — `readJson(path, schema)` and `writeJson(path, data, schema)` with deterministic key ordering (sort keys recursively before stringify), Zod validation on both read and write
- [ ] Create `src/core/data/project.ts` — `resolveProjectDir()` using GOODPLAN_DIR env var or walk up from cwd, `readProject()` and `writeProject()` wrapping json.ts
- [ ] Create `src/util/errors.ts` — `GoodplanError` class with code, message, detail. `isGoodplanError()` type guard
- [ ] Write unit tests: schema validation (valid/invalid), JSON round-trip (deterministic keys), GOODPLAN_DIR resolution

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
- [ ] `bun run src/index.ts badcommand 2>&1; echo $?` — exit 2, stderr shows error message
- [ ] `bun run src/index.ts badcommand --json 2>&1; echo $?` — exit 2, stdout shows `{"error":{"code":"VALIDATION_UNKNOWN_COMMAND",...}}`

### Tasks

- [ ] Create `src/commands/main.ts` — citty main command definition with global flags: `--json` (boolean), `--help`
- [ ] Create `src/util/output.ts` — `output(data, args)` function: JSON mode (deterministic stringify), human-readable mode (picocolors), error output (JSON to stdout or message to stderr based on --json flag)
- [ ] Create `src/util/stdin.ts` — `readStdin()`: TTY detection (return `{}` if TTY, don't hang), read stdin as string, parse JSON, 1 MB size limit, error on invalid JSON with VALIDATION_INVALID_STDIN code
- [ ] Create `src/util/validate.ts` — `validateInput(schema, args, stdin)`: merge CLI args and stdin, validate with Zod, return typed result or throw VALIDATION_* error
- [ ] Wire `src/index.ts` to import and run the main command
- [ ] Handle unknown commands: catch citty's unknown command error, return exit 2 with VALIDATION_UNKNOWN_COMMAND
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
- [ ] `cd /tmp/test-init && bun run /path/to/src/index.ts init --name test-project` — creates `.project/project.json`
- [ ] `cat /tmp/test-init/.project/project.json | bun run -e "import {projectSchema} from './src/schemas/entities/project'; const data = JSON.parse(await Bun.stdin.text()); console.log(projectSchema.parse(data))"` — validates successfully
- [ ] `bun run src/index.ts init --name test-project --json` (in same dir) — exit 3, `{"error":{"code":"STATE_ALREADY_INITIALIZED",...}}`

### Tasks

- [ ] Create `src/commands/global/init.ts` — citty command: `--name` flag (optional, defaults to `path.basename(cwd)`), `--json` inherited
- [ ] Implement init logic: check if .project/ exists (error if so), create .project/ directory, write project.json via data layer with name, version "1.0.0", null active pointers, current timestamps
- [ ] Register init command in main.ts
- [ ] Write unit test for init logic (uses temp directory)

### Verification
In a fresh temp directory: `bun run src/index.ts init --name my-project && cat .project/project.json` — valid JSON with correct fields. Run again — exit 3 with STATE_ALREADY_INITIALIZED.

## Phase 5: Status Command & jqjs Smoke Test

Implement `goodplan status` (JSON + human-readable) and the jqjs smoke test flag.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `bun run src/index.ts status` — command not found
- [ ] `bun run src/index.ts status --json --smoke-jq` — command not found

**After implementation** (should pass / show presence):
- [ ] `bun run src/index.ts init --name test && bun run src/index.ts status --json` — returns valid StatusResult JSON: `{"project":{"name":"test","version":"1.0.0"},"activeEpic":null,...}`
- [ ] `bun run src/index.ts status` — colored terminal output with project name, "No active work", recommendations
- [ ] `bun run src/index.ts status --json --smoke-jq` — returns `"test"` (just the project name, proving jqjs works)

### Tasks

- [ ] Create `src/commands/global/status.ts` — citty command: `--json`, `--smoke-jq` flags
- [ ] Implement status logic: read project.json via data layer, build StatusResult (all active pointers null for fresh project, empty artifacts, recommendation: "Run epic:create to start")
- [ ] Implement human-readable output: project name in bold, version, "No active work" section, recommendations list
- [ ] Implement `--smoke-jq`: import jqjs, apply `.project.name` filter to the StatusResult JSON, output the result. This flag is temporary — removed in slice 05 when full --query is added
- [ ] Register status command in main.ts
- [ ] Write unit tests for status logic and output formatting

### Verification
`bun run src/index.ts init --name smoke-test && bun run src/index.ts status --json` — valid JSON. `bun run src/index.ts status` — colored output. `bun run src/index.ts status --json --smoke-jq` — returns `"smoke-test"`.

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
- [ ] `./goodplan status --json --smoke-jq` — returns `"binary-test"` (jqjs works in compiled binary)
- [ ] `./goodplan badcommand` — exit 2, structured error
- [ ] `./goodplan --help` — shows command list

### Tasks

- [ ] Add `build` script to package.json: `bun build --compile src/index.ts --outfile goodplan`
- [ ] Add `goodplan` to .gitignore
- [ ] Run `bun run build` — verify binary is created
- [ ] Run full verification sequence from goal.md against the compiled binary
- [ ] Document binary size for baseline tracking

### Verification
Full verification sequence from goal.md, executed against `./goodplan` (not `bun run src/index.ts`):
1. Compile: `bun run build` — exit 0, binary exists
2. Init: `./goodplan init --name test-project` — project.json created and valid
3. Init duplicate: `./goodplan init` — exit 3, STATE_ALREADY_INITIALIZED
4. Status JSON: `./goodplan status --json` — valid StatusResult
5. Status human: `./goodplan status` — colored output
6. jqjs smoke: `./goodplan status --json --smoke-jq` — returns `"test-project"`
7. Unknown command: `./goodplan badcommand` — exit 2, structured error
8. Help: `./goodplan --help` — command list
