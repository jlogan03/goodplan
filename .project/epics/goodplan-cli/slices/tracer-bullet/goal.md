# Tracer Bullet

## What We're Building
A minimal but real compiled CLI binary that proves the full technology stack works end-to-end: Bun compilation with all dependencies (citty, Zod, picocolors, jqjs), colon-namespaced commands via citty, JSON output, and basic `.project/` file I/O. Delivers two working commands: `goodplan init` and `goodplan status --json`.

## Behavior
1. `goodplan init` creates a `.project/` directory with a valid `project.json` (version, name from `--name` flag or directory basename, timestamps, null active pointers).
2. `goodplan init` on an existing `.project/` returns exit code 3 with error `STATE_ALREADY_INITIALIZED`.
3. `goodplan status --json` reads `project.json` and returns structured JSON: project name, version, no active epic/slice/quest, empty recommendations.
4. `goodplan status` (no flags) returns human-readable colored output.
5. `goodplan --help` shows the top-level command list.
6. `--json` flag supported on all commands for structured output.
7. Invalid commands return exit code 2 with structured error JSON.
8. One jqjs smoke test proves the dependency compiles into the binary: `goodplan status --json --smoke-jq` applies `.name` to status output and returns the project name. This flag is excluded from `schema` output and removed in slice 05 when full `--query` support is added.

## Success Criteria
- [ ] `bun build --compile` produces a working binary with zero runtime errors on darwin-arm64
- [ ] `goodplan init --name test-project` creates `.project/project.json` with valid schema
- [ ] `goodplan init` on existing project returns exit 3, `STATE_ALREADY_INITIALIZED`
- [ ] `goodplan status --json` returns valid JSON matching the StatusResult schema
- [ ] `goodplan status` (no flags) prints colored human-readable output
- [ ] `goodplan nonexistent` returns exit 2 with structured error
- [ ] jqjs smoke test passes in compiled binary: `goodplan status --json --smoke-jq` returns the project name (proves jqjs compiles correctly). Flag excluded from schema output.

## Verification
1. Compile the binary: `bun build --compile src/index.ts --outfile goodplan`
2. Run `./goodplan init --name test-project` in a temp directory. Inspect `.project/project.json` — verify it has `version`, `name`, `activeEpic: null`, timestamps.
3. Run `./goodplan init` again in the same directory — verify exit code 3 and error JSON.
4. Run `./goodplan status --json` — verify JSON output with project metadata.
5. Run `./goodplan status` — verify colored terminal output.
6. Run `./goodplan badcommand` — verify exit code 2.
7. Run jqjs smoke test — verify the jqjs dependency works in the compiled binary.

## Scope Boundaries
**In scope:** Project scaffolding (package.json, tsconfig, biome config), Zod schemas for project.json and StatusResult, minimal data layer (read/write project.json), citty command setup with colon namespaces, `--json` output formatting, jqjs smoke test (proves dependency compiles), error handling with structured JSON and exit codes, `goodplan init`, `goodplan status`, stdin infrastructure (TTY detection, size limits, empty-stdin handling) as shared command infrastructure.
**Out of scope:** Full data layer (state assembly, cache, CRUD, JSONL), state machine, RPC layer, entity commands beyond init/status, debug logging, `--inline` flag, `--quiet` mode (slice 05), `--query` as general mechanism (slice 05), `goodplan schema` command (slice 05).
