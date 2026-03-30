# Rename Scope Audit: `goodplan` → `gp`, `.project/` → `.goodplan/`

**Date:** 2026-03-29
**Purpose:** Full scope of changes required for the rename. Research only — no changes made.

---

## Summary

| Category | Files Affected |
|---|---|
| Source code (`src/`) | 33 unique files |
| Skills (`skills/`) | 30 files (excl. `_shared/`) |
| Shared skills (`skills/_shared/`) | 8 files |
| Test files (`tests/`) | 38+ files |
| Test fixtures (`tests/fixtures/`) | 107 files (directory rename only) |
| Config files | 5 files |
| Architecture docs (`.project/architecture/`) | 7 files |
| Root docs (`CLAUDE.md`, `.gitignore`) | 2 files |

---

## 1. Source Code (`src/`)

**33 unique files affected** (17 with `.project/` refs, 29 with `project.json` refs, plus version/binary name refs).

### `.project/` path string references (17 files)

These contain string literals, error messages, comments, or logic tied to the `.project/` directory name. The directory name itself appears in:
- Walk-up logic and env var validation
- Error messages shown to users
- CLI description strings
- Comment/JSDoc documentation

Files:
- `src/index.ts` — "No .project/ found" comment, compat check comment
- `src/commands/global/init.ts` — "already initialized (.project/ exists)" error string, JSDoc
- `src/commands/global/migrate.ts` — multiple user-facing description strings
- `src/commands/global/migrate/schemas.ts` — Zod `.describe()` strings mentioning old `.project/`
- `src/commands/global/migrate/validate-source-path.ts` — JSDoc comment
- `src/commands/global/schema.ts` — command description strings for `init`, `migrate`, `state`
- `src/commands/global/state.ts` — file-level comment and command description string
- `src/commands/global/status.ts` — user-facing error string "No project.json found in .project/ directory"
- `src/core/data/assemble.ts` — file-level comment
- `src/core/data/files.ts` — JSDoc `@param` comments
- `src/core/data/markdown-files.ts` — JSDoc comments and type field comments
- `src/core/data/project.ts` — **critical**: walk-up search logic uses `".project"` literal, env var error messages, JSDoc
- `src/core/rpc/complete.ts` — comment
- `src/core/rpc/init.ts` — JSDoc comment
- `src/core/rpc/migrate.ts` — **critical**: renames `.project/` → `.project-old-<timestamp>/`, multiple path constructions, user-facing messages; also constructs `.project-old` paths for rollback
- `src/core/tree.ts` — JSDoc describing the root as `.project/`
- `src/schemas/commands/status.ts` — JSDoc comment

### `project.json` filename references (29 files)

`project.json` is a **data file name** stored inside `.project/` (or `.goodplan/`). This is the name used as a key in the state tree and as a filename on disk. This is a separate decision from the directory rename — it could stay as `project.json` or change to something like `goodplan.json`. All 29 files reference this name as a string key or path component.

Key files:
- `src/core/state/transitions/init.ts` — creates `project.json` in state tree
- `src/core/state/transitions/helpers.ts` — reads `project.json` from tree
- `src/core/state/transitions/epic-lifecycle.ts`, `quest-plan.ts`, `quest-complete.ts`, `quest-abandon.ts`, `slice-plan.ts`, `slice-complete.ts`, `slice-abandon.ts`, `rollup-learnings.ts` — all read/write `project.json` key in state tree
- `src/core/rpc/types.ts` — returns `"project.json"` as a sentinel string
- `src/core/rpc/version-stamp.ts` — reads/writes `project.json`
- `src/core/rpc/begin.ts`, `submit.ts`, `complete.ts`, `init.ts`, `migrate.ts` — all access `project.json`
- `src/commands/global/status.ts`, `schema.ts`, `migrate.ts`, `init.ts` — user-facing refs
- `src/commands/slice/list.ts`, `utils.ts` — reads `project.json`
- `src/core/context/index.ts`, `priorities.ts`, `types.ts` — reads `project.json`
- `src/index.ts` — reads `project.json` for compat check
- `src/util/semver.ts` — comment mentioning `project.json`

### `__GOODPLAN_VERSION__` define (1 file)

- `src/version.ts` — declares and uses `__GOODPLAN_VERSION__` build-time define. **Rename to `__GP_VERSION__`.**

### `GOODPLAN_DIR` env var (1 file, plus `version.ts`)

- `src/core/data/project.ts` — reads `process.env.GOODPLAN_DIR`. **Rename to `GP_DIR`.**

### Binary name `"goodplan"` in code (1 file)

- `src/commands/main.ts` — `name: "goodplan"` (citty command name, appears in help output). **Change to `"gp"`.**

### Debug log prefix `[goodplan]` (2 files)

- `src/util/debug.ts` — `[goodplan]` prefix in stderr log lines
- `src/core/rpc/migrate.ts` — `[goodplan] Warning:` messages

### Version output string (1 file)

- `src/index.ts` — `process.stdout.write(\`goodplan ${VERSION}\n\`)`. **Change to `gp ${VERSION}`.**

---

## 2. Skills (`skills/`, excluding `_shared/`)

**30 files affected** — all contain either `goodplan` CLI invocations or `.project/` path references.

### Files with `goodplan` CLI invocations (must change to `gp`)

- `skills/project-status/SKILL.md` — extensive CLI usage (`goodplan status`, `goodplan state`, `goodplan slice:list`, etc.)
- `skills/project-status/references/status-logic.md` — CLI invocation references
- `skills/audit-architecture/SKILL.md`
- `skills/audit-docs/SKILL.md`
- `skills/audit-tests/SKILL.md`
- `skills/capture/SKILL.md`
- `skills/complete/SKILL.md`
- `skills/complete/references/guidance.md`
- `skills/create-architecture/SKILL.md`
- `skills/create-epic/SKILL.md`
- `skills/create-plan/SKILL.md`
- `skills/create-plan/references/guidance.md`
- `skills/create-slices/SKILL.md`
- `skills/explore/SKILL.md`
- `skills/explore/references/explore-logic.md`
- `skills/implement-plan/SKILL.md`
- `skills/implement-plan/references/shared-preamble.md`
- `skills/implement-plan/references/sub-agent-prompts.md`
- `skills/migrate/SKILL.md`
- `skills/onboard-repo/SKILL.md`
- `skills/onboard-repo/references/architecture-extraction.md`
- `skills/onboard-repo/references/migration-detection.md`
- `skills/refine-architecture/SKILL.md`
- `skills/refine-plan/SKILL.md`
- `skills/refine-plan/references/shared-preamble.md`
- `skills/refine-slices/SKILL.md`
- `skills/start-epic/SKILL.md`

### Files with `.project/` path references (must change to `.goodplan/`)

All of the above plus several `references/` files that contain path examples:
- `skills/create-architecture/references/architecture-logic-templates.md`
- `skills/create-architecture/references/architecture-logic.md`
- `skills/create-architecture/references/design-tree.md`
- `skills/create-architecture/references/guidance.md`
- `skills/create-epic/references/templates.md`
- `skills/create-slices/references/guidance.md`
- `skills/explore/references/explore-logic.md`
- `skills/migrate/references/migration-heuristics.md`
- `skills/refine-architecture/references/guidance.md`
- `skills/refine-architecture/references/sub-agent-prompts.md`
- `skills/refine-slices/references/reviewers-slices.md`
- `skills/audit-tests/references/guidance.md`
- `skills/audit-tests/references/sub-agent-prompts.md`

Note: The `requires: goodplan >= 0.0.1` header in `skills/project-status/SKILL.md` is a version gate — it may need updating if the skill plugin format changes the CLI name.

---

## 3. Shared Skills (`skills/_shared/`)

**8 files affected.**

- `skills/_shared/references/README.md` — references
- `skills/_shared/references/audit-conventions.md` — CLI invocations and `.project/` paths
- `skills/_shared/references/cli-interaction.md` — CLI invocation patterns (most impactful: defines how all skills call the CLI)
- `skills/_shared/references/codebase-context-discovery.md` — `.project/` path examples
- `skills/_shared/references/decisions-format.md` — `.project/decisions/` path
- `skills/_shared/references/dependency-research.md` — may have `.project/` refs
- `skills/_shared/references/epic-conventions.md` — CLI invocations and `.project/epics/` paths
- `skills/_shared/references/state-and-activity-formats.md` — `.project/` state paths
- `skills/_shared/references/project-health-format.md` — `.project/` path references

The `cli-interaction.md` shared reference is especially high-leverage: if it defines canonical CLI invocation patterns used by all skills, updating it propagates context to all skills.

---

## 4. Test Files (`tests/`)

**38 test/helper files affected** (plus 107 fixture files).

### Test logic files (38)

All references fall into these buckets:

**A. `GOODPLAN_DIR` env var (rename to `GP_DIR`)** — 10 files:
- `tests/integration/helpers.ts` — sets `GOODPLAN_DIR: path.join(tmpDir, ".project")` (two places: the `.project` subpath will also need to change)
- `tests/integration/smoke.test.ts`
- `tests/integration/version-compat.test.ts`
- `tests/integration/workflow-quest.test.ts`
- `tests/integration/workflow-slice.test.ts`
- `tests/integration/result-paths.test.ts`
- `tests/integration/workflow-epic.test.ts`
- `tests/integration/error-transitions.test.ts`
- `tests/fitness/structured-errors.test.ts`
- `tests/unit/data/project.test.ts`

**B. `.project/` directory path in assertions (rename to `.goodplan/`)** — 14 files:
- `tests/integration/helpers.ts` — constructs `path.join(tmpDir, ".project")` — **key file**
- `tests/integration/workflow-init.test.ts` — asserts `.project/` created, checks `project.json` inside it
- `tests/integration/migrate.test.ts` — many refs to `.project/` directory
- `tests/integration/migrate-learnings.test.ts`
- `tests/fitness/mutation-through-state-machine.test.ts`
- `tests/fitness/schema-validation.test.ts`
- `tests/unit/commands/init.test.ts`
- `tests/unit/commands/status.test.ts`
- `tests/unit/commands/state.test.ts`
- `tests/unit/rpc/migrate.test.ts`
- `tests/unit/data/project.test.ts`

**C. `project.json` key in state tree (rename if the file is renamed)** — 32 files:
The majority of test files that reference `project.json` use it as a state tree key (e.g., `state.contents["project.json"]`). If `project.json` is renamed to e.g. `gp.json`, all of these need updating. Full list in the grep results above.

**D. `__GOODPLAN_VERSION__` build define** — 2 files:
- `tests/global-setup.ts` — `__GOODPLAN_VERSION__="${pkg.version}"` in build command
- `vitest.config.ts` — `define: { __GOODPLAN_VERSION__: ... }` (see Config section)

**E. Binary path reference** — 1 file:
- `tests/integration/helpers.ts` — `const BINARY_PATH = path.resolve(..., "../../goodplan")` — **rename to `gp`**

**F. Tmp dir prefixes (`goodplan-*`)** — 35 files:
Most test files create temp dirs with `mkdtempSync(path.join(os.tmpdir(), "goodplan-..."))`. These are cosmetic prefix strings, not functional. Low priority — can rename to `gp-` for consistency or leave as-is.

**G. `goodplan <version>` output assertion** — 1 file:
- `tests/integration/state.test.ts` — asserts `result.stdout` matches `/^goodplan \d+\.\d+\.\d+\n$/`

### Test fixture directories (107 files, 4 fixture sets)

The fixture directory structure itself is `.project/` inside each fixture. Renaming requires:
1. Rename all `tests/fixtures/*/` subdirectories from `.project/` to `.goodplan/`
2. No content changes inside the fixture files (they are JSON/JSONL data, no path literals inside)

Fixture sets:
- `tests/fixtures/epic-created/.project/` (10 files)
- `tests/fixtures/pagination/.project/` (8 files)
- `tests/fixtures/fresh-init/.project/` (8 files)
- `tests/fixtures/slice-in-progress/.project/` (17 files)
- `tests/fixtures/pre-cli-project/.project/` (many files — pre-CLI format)

---

## 5. Config Files

### `package.json` (root)

```json
"name": "goodplan",
"build": "bun build --compile src/index.ts --outfile goodplan --define __GOODPLAN_VERSION__=..."
```

Changes needed:
- `"name": "goodplan"` → `"name": "gp"` (package name)
- `--outfile goodplan` → `--outfile gp`
- `__GOODPLAN_VERSION__` → `__GP_VERSION__`

### `scripts/install-skills.sh`

Changes needed:
- `echo "Building goodplan CLI..."` → cosmetic update
- `--outfile goodplan` → `--outfile gp`
- `cp "$REPO_ROOT/goodplan" "$INSTALL_DIR/goodplan"` → `cp "$REPO_ROOT/gp" "$INSTALL_DIR/gp"`
- `"__GOODPLAN_VERSION__=\"$VERSION\""` → `"__GP_VERSION__=\"$VERSION\""`
- `echo "Installed goodplan binary to $INSTALL_DIR/goodplan"` → cosmetic

### `vitest.config.ts`

```ts
define: { __GOODPLAN_VERSION__: JSON.stringify(pkg.version) }
```

Change: `__GOODPLAN_VERSION__` → `__GP_VERSION__`

### `biome.json`

```json
"ignore": ["node_modules", "dist", "bun.lockb", ".project", ...]
```

Change: `".project"` → `".goodplan"`

### `.gitignore`

```
.project/state.md
.project/epics/goodplan-cli/prototypes/jqjs-spike/jqjs-spike
.project/epics/goodplan-cli/prototypes/jqjs-spike/node_modules/
goodplan
```

Changes needed:
- `.project/` prefix on 3 lines → `.goodplan/`
- `goodplan` (binary ignore entry) → `gp`

---

## 6. Architecture Docs (`.project/architecture/`)

**7 files affected** (6 with `.project/` refs, 5 with `goodplan` CLI refs):

- `.project/architecture/_overview.md` — `.project/` path refs, `goodplan` CLI command examples
- `.project/architecture/commands-api.md` — `goodplan <cmd>` invocation format, `.project/` path examples
- `.project/architecture/data-layer-api.md` — `.project/` path parameters
- `.project/architecture/data-model.md` — `.project/` directory structure diagrams (18 occurrences)
- `.project/architecture/flows.md` — `.project/` path refs, `goodplan` CLI refs
- `.project/architecture/rpc-layer-api.md` — `.project/` path ref
- `.project/architecture/invariants.md` — `goodplan` CLI refs

Note: These files are managed by the installed CLI (they live in `.project/`). They cannot be directly edited via the build process. Updating them requires either `goodplan` CLI commands or the migration process.

---

## 7. CLAUDE.md and Root Docs

### `CLAUDE.md` (project root, checked into repo)

Multiple `.project/` path references throughout (23 occurrences) and `goodplan` CLI references (13 occurrences):
- Section headings like "This repo's `.project/` directory"
- File path references: `.project/idea.md`, `.project/architecture/...`, etc.
- CLI invocation examples: `goodplan status --json`, `goodplan quest:complete ...`
- Table entries comparing `goodplan status --json` vs `./goodplan status --json`

This file is the developer-facing project guide — all refs need updating.

---

## Key Decision Points for Implementation

1. **`project.json` rename**: The audit shows 29 src files and 32 test files use `"project.json"` as a state tree key. If renaming to `goodplan.json` or `gp.json`, this is a **data migration** concern — existing `.project/` directories in the wild will have `project.json` and the CLI must handle both during migration. Consider: keep `project.json` as the filename and only rename the directory, to reduce the migration surface.

2. **`GOODPLAN_DIR` env var**: Used in tests and in `src/core/data/project.ts`. If renamed to `GP_DIR`, existing users with `GOODPLAN_DIR` set in their shell will break. A transition period with both supported may be warranted.

3. **`.project-old-<timestamp>/` rollback dirs**: The migrate RPC creates `.project-old-<timestamp>/` backup dirs. If the directory is renamed to `.goodplan/`, the backup should become `.goodplan-old-<timestamp>/`. This is in `src/core/rpc/migrate.ts`.

4. **Binary name in `src/commands/main.ts`**: The `name: "goodplan"` is used by citty for help text generation. Change to `"gp"`.

5. **Fixture directories**: The 4 `.project/` subdirectories in `tests/fixtures/` must be renamed on disk and the path strings in `tests/integration/helpers.ts` updated.

6. **Skills install script**: The binary is copied to `~/.local/bin/goodplan` — users with this on PATH will need to update their shell.
