# Current Build & Install Pipeline

Research date: 2026-03-29

## 1. package.json Scripts

| Script | Command | Purpose |
|---|---|---|
| `check` | `biome check .` | Lint + format check via Biome |
| `test` | `vitest` | Run test suite via Vitest v4 |
| `build` | `bun build --compile src/index.ts --outfile goodplan --define __GOODPLAN_VERSION__='"<version>"'` | Compile to standalone native binary |
| `install:skills` | `bash scripts/install-skills.sh` | Build CLI binary + install skills to `~/.claude/skills/` |

## 2. Dependencies

### Runtime
- `citty` (^0.2.1) -- CLI framework (command routing, arg parsing, usage display)
- `picocolors` (^1.1.1) -- Terminal color output
- `zod` (^4.0.0) -- Schema validation
- `@michaelhomer/jqjs` (github:mwh/jqjs) -- jq query engine for JSON filtering

### Dev
- `@anthropic-ai/claude-agent-sdk` (^0.2.81) -- Agent SDK (used in tests/dogfooding)
- `@biomejs/biome` (^1.9.0) -- Linter/formatter
- `bun-types` (^1.3.11) -- Bun runtime type definitions
- `typescript` (^5.8.0) -- Type checking
- `vitest` (^4.0.0) -- Test framework

## 3. Build Process (`bun run build`)

**Input:** `src/index.ts` (entry point)

**Mechanism:** `bun build --compile` produces a self-contained native Mach-O arm64 binary (~58 MB). All dependencies are bundled. No separate `dist/` output -- the compiled binary is written directly to the repo root as `./goodplan`.

**Version injection:** The build script reads `version` from `package.json` via Node, then passes it as a compile-time define: `--define __GOODPLAN_VERSION__='"1.0.0"'`. The `src/version.ts` module uses a `declare const __GOODPLAN_VERSION__` that gets replaced at build time. In dev/test mode, it falls back to reading `package.json` from disk.

**Output:** `./goodplan` (repo root) -- a standalone native binary, no runtime required.

## 4. Install Process (`bun run install:skills` / `scripts/install-skills.sh`)

The install script does **two things**:

### 4a. Build and install CLI binary
1. Runs the same `bun build --compile` as the build script
2. Copies the binary to `~/.local/bin/goodplan`
3. Warns if `~/.local/bin` is not on PATH

### 4b. Install skills
1. Source: `skills/` directory in repo (19 skill directories)
2. Destination: `~/.claude/skills/`
3. Method: `rsync -a` each skill directory individually (excludes `.DS_Store`)
4. Hardcoded list of skill directories in the script (must be updated when skills are added)

**Skill directories installed:**
`_shared`, `audit-architecture`, `audit-docs`, `audit-tests`, `capture`, `complete`, `create-architecture`, `create-epic`, `create-plan`, `create-slices`, `explore`, `implement-plan`, `migrate`, `onboard-repo`, `project-status`, `refine-architecture`, `refine-plan`, `refine-slices`, `start-epic`

**Note:** The repo `skills/` directory also has `start-epic` which IS in the install list. It does NOT include: `refine-slices` wait no, it does. Let me re-check... The script lists 19 entries. The repo has 20 directories (19 skill dirs + `_shared`). Checking the diff: the repo has `start-epic` listed AND installed. The install list is missing `refine-slices` -- wait, no, it IS in the list. Actually the hardcoded list has 19 entries total including `_shared`. The repo's `skills/` has 20 entries (counting `_shared`). The missing one is: the install script does NOT list `start-epic`. Wait -- yes it does, it's the last entry. The actual unlisted directory would be... none, or possibly new ones added since the script was last updated. No issue found on current inspection.

## 5. `src/` Directory Structure

```
src/
  index.ts              -- Entry point (CLI main loop, arg parsing, version check, error handling)
  version.ts            -- VERSION constant (build-time injection with dev fallback)
  commands/             -- CLI command definitions
    main.ts             -- Root command with subCommands registration
    global-args.ts      -- Shared CLI flags (--json, --quiet, --force)
    decision/           -- decision:* commands
    epic/               -- epic:* commands
    global/             -- global commands (init, schema, version)
    learning/           -- learning:* commands
    quest/              -- quest:* commands
    slice/              -- slice:* commands
    subagent/           -- subagent:* commands
    task/               -- task:* commands
  core/                 -- Core business logic
    artifacts.ts        -- Artifact handling
    tree.ts             -- State tree (JSON/JSONL read/write)
    context/            -- Context loading
    data/               -- Data layer (filesystem I/O, load/save, project resolution)
    rpc/                -- RPC layer (workflow orchestration)
    state/              -- State machine (pure reducers)
  schemas/              -- Zod schemas
    commands/           -- Command input/output schemas
    entities/           -- Entity schemas (Project, Epic, Slice, etc.)
    records/            -- Record schemas
    shared.ts           -- Shared schema types
    error-output.ts     -- Error output schema
    state-events.ts     -- State event schemas
  types/
    jqjs.d.ts           -- Type declarations for jqjs (no @types available)
  util/                 -- Utilities
    debug.ts, errors.ts, json.ts, output.ts, pagination.ts, query.ts, semver.ts, slug.ts, stdin.ts, validate.ts
```

## 6. `skills/` Directory Structure

```
skills/
  _shared/              -- Shared references (loaded by multiple skills)
    references/         -- 17 reference files (architecture docs, conventions, etc.)
  audit-architecture/   -- SKILL.md + references/
  audit-docs/
  audit-tests/
  capture/              -- SKILL.md only (no references/)
  complete/
  create-architecture/
  create-epic/
  create-plan/
  create-slices/
  explore/
  implement-plan/
  migrate/
  onboard-repo/
  project-status/
  refine-architecture/
  refine-plan/
  refine-slices/
  start-epic/
```

Each skill directory contains a `SKILL.md` (the skill definition) and optionally a `references/` subdirectory with context files the skill loads.

## 7. Test Infrastructure

```
tests/
  global-setup.ts       -- Vitest global setup
  fixtures/             -- Test fixture data
  unit/                 -- Unit tests
  integration/          -- Integration tests
  fitness/              -- Fitness/property tests
```

Tests run via `vitest` (no special config file seen -- uses vitest defaults or config in package.json).

## 8. tsconfig.json Configuration

- **Target/Module:** ESNext
- **Module resolution:** bundler (Bun-compatible)
- **Strict mode:** Full strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `verbatimModuleSyntax`
- **Output:** `outDir: "dist"`, `rootDir: "src"`, `declaration: true`
- **Types:** `bun-types` only
- **Note:** The `dist/` directory and `declaration: true` suggest tsc can produce JS output, but the actual build uses `bun build --compile` which produces a binary, not JS files. The tsconfig `outDir` is likely used for type-checking only (or is vestigial).

## 9. biome.json Configuration

- **Formatter:** Tabs, indent width 2, line width 100
- **Linter:** Recommended rules + `noUnusedImports: error`, `noUnusedVariables: error`, `noNonNullAssertion: error`
- **Ignored paths:** `node_modules`, `dist`, `bun.lockb`, `.project`, `.claude`, `.superpowers`

## 10. Key Observations for `build:plugin`

1. **Single-binary architecture:** The build produces one self-contained binary via `bun build --compile`. No separate bundle step, no `dist/` output used in practice.

2. **Skills are separate from the binary:** Skills are plain Markdown + reference files, installed via file copy (rsync). They are NOT compiled into the binary.

3. **Hardcoded skill list:** The install script has a hardcoded array of skill directory names. Adding a new skill requires updating this list. A `build:plugin` system could auto-discover or use a manifest.

4. **Two install targets:** Binary goes to `~/.local/bin/`, skills go to `~/.claude/skills/`. A plugin system would need a third target or extend one of these.

5. **Version is injected at build time** via `--define`. The `VERSION` constant is the single source of truth from `package.json`.

6. **No plugin infrastructure exists today.** There's no plugin loading, no plugin manifest, no dynamic skill discovery -- everything is statically known at build/install time.

7. **The binary is ~58 MB** (Mach-O arm64). This is Bun's compiled output size -- includes the runtime.

8. **`module: "ESNext"` with `moduleResolution: "bundler"`** means the codebase uses ESM imports throughout. Bun handles bundling at compile time.
