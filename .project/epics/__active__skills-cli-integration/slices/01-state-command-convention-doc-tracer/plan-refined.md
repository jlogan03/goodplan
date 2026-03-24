# Plan: State Command, Convention Doc & Tracer Bullet

## Overview

Implements the foundational pieces for the skills-cli-integration epic in three phases. Phase 1 delivers the `goodplan state --json --query` command (the keystone read-only command that gives agents access to the entire `.project/` state tree) and `--version --json`. Phase 2 writes the convention doc (`skills/_shared/references/cli-interaction.md`) that defines how all skills interact with the CLI. Phase 3 rewrites the `project-status` skill as the tracer bullet, proving the end-to-end integration pattern works.

**Slug:** `state-cmd-tracer`

**Key decisions:**
- Markdown entries serialize as `true` by default; `--inline` flag includes full content (decision: `state-command-markdown-exclusion`)
- `state` command is read-only, routing Commands → Data Layer (no RPC/state machine)
- State tree JSON output is a public API contract — unwrapped serialization format per `cli-changes.md`

## Phase 1: State Command & Version

Implement `goodplan state --json --query --offset --limit` and `--version --json`. This is the CLI code phase — all new TypeScript.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `goodplan state --json` — exits with `VALIDATION_UNKNOWN_COMMAND` (exit code 2) (command doesn't exist)
- [ ] `goodplan --version --json` — prints `goodplan <version>` followed by a newline (plain text, ignores `--json`)
- [ ] `tests/unit/commands/state.test.ts` — file doesn't exist
- [ ] `tests/integration/state.test.ts` — file doesn't exist

**After implementation** (should pass / show presence):
- [ ] `goodplan state --json` — returns complete state tree as JSON with `project.json` unwrapped, JSONL entries as arrays, markdown entries as `true`
- [ ] `goodplan state --json --query '.["project.json"].name'` — returns just the project name string
- [ ] `goodplan state --json --query '.["activity-log.jsonl"]' --limit 3` — returns exactly 3 entries
- [ ] `goodplan state --json --query 'broken['` — exits 2 with `VALIDATION_INVALID_QUERY` error
- [ ] `goodplan state --json --inline` — returns state tree with markdown content as strings
- [ ] `goodplan --version --json` — returns `{ "version": "<current version>" }` (JSON)
- [ ] `goodplan --version` — still prints plain text `goodplan <version>`
- [ ] `goodplan state` (no `--json`) — returns complete state tree as JSON (same as `--json`; `state` always outputs JSON)
- [ ] `bun test tests/unit/commands/state.test.ts` — all pass
- [ ] `bun test tests/integration/state.test.ts` — all pass

### Tasks

- [x] **Create `src/core/data/serialize.ts`** (alternative: `src/core/serialize.ts` — the function is a pure transformation with no I/O, so placing it outside the Data Layer keeps that layer focused on entity CRUD and filesystem I/O; either location works without circular dependencies) — `serializeStateTree(state: ProjectState, options: { inline: boolean }): Record<string, unknown>` function. Return type is `Record<string, unknown>` (not `unknown`) since the top-level is always an object. Add a code comment noting this return type is a public API contract. Recursively transforms the typed `StateEntry` tree into a plain JSON-serializable object:
  - `DirectoryEntry` → plain object (keys = child names, values = serialized children)
  - `JsonEntry<T>` → `T` directly (unwrapped — strip `type` discriminator)
  - `JsonlEntry<T>` → `T[]` directly (unwrapped)
  - `MarkdownEntry` → `true` when `options.inline` is false, raw string when `options.inline` is true
  - Use `switch` on `entry.type` with exhaustive `default` case: `const _exhaustive: never = entry; throw new Error(...)` — ensures compile-time errors if new `StateEntry` variants are added
  - Internal recursive helper returns `unknown`; the outer function casts the top-level result to `Record<string, unknown>`
  - Do not add key-sorting logic — key ordering is handled by `deterministicStringify` in the output layer
  - Use `import type` for all type-only imports (`ProjectState`, `DirectoryEntry`, etc.) per `verbatimModuleSyntax`
- [x] **Create `src/commands/global/state.ts`** — new command following `status.ts` pattern:
  - Import `assembleState` from data layer, `serializeStateTree` from serialize module
  - Define command with `globalArgs` + state-specific flags: `inline` (string type for citty, parsed with `parseInlineBudget` — coerced to simple boolean for this slice: `const inline = parseInlineBudget(args.inline) !== undefined`. Add code comment: `// Budget form deferred — parseInlineBudget returns true|number|undefined, collapsed to boolean here`. Budget support deferred to later slice), `offset` (string, optional), `limit` (string, optional)
  - `run()`: call `resolveProjectDir()`, `assembleState(dir)`, `serializeStateTree(state, { inline })`
  - **Pagination approach (consolidated):** When `--query` is present: call `applyQuery()` directly, then if result is an array and `--offset`/`--limit` are set, apply `Array.slice(offset, offset + limit)`. Write final result via `deterministicStringify()` + `process.stdout.write()`. When `--query` is absent: serialize full state tree via `deterministicStringify()` + `process.stdout.write()` — offset/limit are silently ignored. Add a comment noting that `applyQuery()` returns the raw value for single results vs. array for multiple, and pagination applies to any array result regardless of origin
  - **Bare `state` (no `--json`):** Always output JSON (use `deterministicStringify` with indentation). The `state` command is LLM-facing; there is no human-readable format. The state command does not use the shared `output()` function — all code paths write directly via `deterministicStringify()` + `process.stdout.write()`. Add a code comment explaining why `output()` is bypassed. This is an explicit exception to the "no `--json` = human-readable" convention
  - **`--quiet` handling:** Check `args.quiet` before writing output; if true, return without emitting anything. Since the state command bypasses `output()`, it does not inherit `--quiet` suppression automatically
  - **Error handling:** Catch errors from `assembleState` and `serializeStateTree` within the command handler and format as JSON (using `deterministicStringify`). Do not let errors fall through to the top-level handler, which would produce human-readable stderr since `args.json` is not set for bare `state` invocations
  - Register in command registry (`src/commands/global/schema.ts`) per INV-006, with explicit `ArgDefinition` entries: `{ ...globalArgDefs, inline: { type: "string", description: "Include markdown content in state tree" }, offset: { type: "string", description: "Skip N entries when result is an array (requires --query)" }, limit: { type: "string", description: "Return at most N entries when result is an array (requires --query)" } }`. Parse offset/limit via `parseInt(value, 10)` (not `Number()` — `Number("")` returns 0 instead of NaN), validate non-negative finite integer, throw `GoodplanError('VALIDATION_INVALID_INPUT')` if invalid
  - Export as `stateCommand`
- [x] **Register state command in `src/commands/main.ts`** — import `stateCommand`, add to `subCommands` map
- [x] **Modify `src/index.ts` for `--version --json`** — in the `--version` handler (lines 60-63), check if `rawArgs.includes("--json")`. If true, output `deterministicStringify({ version })`. If false, keep existing plain text output. Version must come from a single source of truth: import from `package.json` or define a `const VERSION` that both plain-text and JSON paths use — never hardcode `"0.0.1"` in two places. Add a comment noting that `--version` is handled pre-dispatch and will not appear in `goodplan schema --json` output — this is a known limitation; the convention doc documents it manually
- [x] **Unit tests `tests/unit/commands/state.test.ts`** — follow `status.test.ts` pattern:
  - Create minimal `.project/` fixture with project.json, a slice with slice.json, activity-log.jsonl with at least 5 entries (required for offset/limit test coverage), and a markdown file
  - Test `serializeStateTree()` directly: verify JSON entries unwrapped, JSONL entries as arrays, markdown as `true` (no inline), markdown as string (with inline)
  - Test state command output: `--json` returns valid JSON matching fixture, `--query` filters correctly, `--offset`/`--limit` paginates arrays, invalid query returns error, offset/limit is a no-op without `--query`
- [x] **Integration tests `tests/integration/state.test.ts`** — follow existing integration pattern (spawn compiled binary):
  - `state --json` on a real `.project/` returns valid JSON with `project.json` content
  - `state --json --query '.["project.json"].name'` returns project name
  - `state --json --query '.["activity-log.jsonl"]' --limit 2` returns exactly 2 entries
  - `state --json --query '.["activity-log.jsonl"]' --offset 2 --limit 2` returns different entries
  - `state --json --query 'bad syntax'` exits 2 with VALIDATION_INVALID_QUERY
  - `state --json --inline` includes markdown content as strings
  - `--version --json` returns `{ "version": "..." }` (JSON)
  - `--version` (no `--json`) returns plain text
- [x] **Update `.project/architecture/commands-api.md`** — add the `state` command to the CLI command surface documentation
- [x] **Rebuild binary** — `bun run build` to compile with new command
- [x] **Run full test suite and fitness functions** — `bun test` to verify no regressions. Verify `state` command passes existing fitness functions (`stateless-commands.test.ts`, `schema-output-accuracy.test.ts`) or update them if needed

### Verification

Manual verification run against the goodplan repo's own `.project/` (distinct from the automated fixture-based unit/integration tests above):

1. `goodplan state --json --query '.["project.json"]'` — returns JSON with name, version, activeEpic
2. `goodplan state --json --query '.epics["__active__skills-cli-integration"].slices | keys'` — returns slice directory names (verify actual state tree shape during implementation — query path may need adjustment)
3. `goodplan state --json --query '.["activity-log.jsonl"]' --limit 3` — returns exactly 3 entries
4. `goodplan state --json --query '.["activity-log.jsonl"]' --offset 3 --limit 3` — different entries
5. `goodplan state --json --query 'broken['` — exit 2, VALIDATION_INVALID_QUERY
6. `goodplan state --json --inline --query '.architecture["_overview.md"]'` — returns markdown content string
7. `goodplan state --json --query '.architecture["_overview.md"]'` — returns `true` (no inline)
8. `goodplan --version --json` — returns `{ "version": "<current version>" }`
9. jqjs performance: manual spot-check that queries above complete in < 1s on the goodplan repo state tree (not an automated test; unlikely to be a problem for the small state tree)
10. `bun test` — all tests pass

## Phase 2: Convention Doc

Write `skills/_shared/references/cli-interaction.md` — the shared reference that defines how all goodplan skills interact with the CLI. Adapts the architecture's `cli-interaction-conventions.md` into a skill-consumable format.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [x] `ls skills/_shared/references/cli-interaction.md` — file now exists

**After implementation** (should pass / show presence):
- [x] `skills/_shared/references/cli-interaction.md` exists with all required sections
- [x] Covers at minimum: binary detection, invocation patterns, state orientation, error handling, completion payload shapes
- [x] All CLI command examples use correct flag names (entity-specific `--slice`/`--epic`/`--quest`, not `--name`)
- [x] Documents `stdin: ""` as Bash tool syntax with explicit callout
- [x] Documents `start-*` always-JSON behavior and `--inline[=<bytes>]`
- [x] Includes migration example (before/after for a real skill section)
- [x] Includes error recovery patterns

### Tasks

- [x] **Read architecture's `cli-interaction-conventions.md`** from `.project/epics/__active__skills-cli-integration/architecture/cli-interaction-conventions.md` — this is the source material
- [x] **Write `skills/_shared/references/cli-interaction.md`** adapting the architecture spec. Structure:
  1. **Binary Detection & Version** — `goodplan --version --json`, fail-fast if missing. Note: version enforcement is convention-doc-only in this slice; CLI-side enforcement comes in slice 02
  2. **Data Ownership** — JSON/JSONL through CLI only, free-form markdown via Read tool directly. Table format matching architecture doc
  3. **What Skills Must NOT Do** — direct JSON/JSONL reads, state.md, activity-log appending, mkdir for .project/ subdirs
  4. **Invocation Patterns** — always use `--json`, parse stdout, check exit codes. Document `stdin: ""` fully: copy the complete explanation from the architecture spec including equivalent shell syntax and Claude Code named parameter distinction. `start-*` commands always return JSON — the `--json` flag is not required and has no effect. `submit-*` and mutation commands require `--json`
  - **Important:** `start-complete` does not exist as a command — do not include it in examples. Explicitly note its absence or mark as "not yet available" in the convention doc
  5. **Interaction Patterns by Role** — orchestrator, sub-agent, interactive orchestrator (3 patterns). Include worked examples. Before including any `start-*` or `submit-*` commands as examples, verify they actually exist (check against `goodplan schema --json` or `src/commands/main.ts`). For commands planned but not yet implemented, list in a separate "Coming in future slices" subsection
  6. **State Orientation** — `goodplan status --json` replaces state.md. Mapping table: state.md field → CLI equivalent. Label the mapping table as "Migration Reference" (new skill authors never knew about state.md). Add a deprecation note for `skills/_shared/references/state-and-activity-formats.md` — the state.md section is now obsolete; 12 skills reference this file
  7. **Deriving Workflow Phase** — use `show --json` artifacts field. Mark this section with "Available after slice 02" — the artifacts field does not exist until then. Skills should not depend on this field yet
  8. **Deep Dives** — `goodplan state --json --query`. Include concrete jq examples. Document that `state` always returns JSON regardless of whether `--json` is passed — it is an explicit exception to the "no `--json` = human-readable" convention. Document `--inline` explicitly: it changes the state command's output contract (markdown entries change from `true` to their full string content). Skills must not cache or compare state tree outputs across calls with different `--inline` settings. Include a concrete example showing the same query path with and without `--inline` to illustrate the type change. Note `--inline` currently accepts bare form only; `--inline=<bytes>` budget support is coming in a future slice. Document that `--offset`/`--limit` apply to any array-valued result regardless of origin (data-originated array vs jq multiple outputs)
  9. **Completion Command Payloads** — document the stdin payload shapes for `slice:complete` and `quest:complete`, since skills need to construct these. Derive payload shapes from `goodplan schema --json --command slice:complete` and `goodplan schema --json --command quest:complete`. **Important:** `start-complete` does not exist as a command — do not include it in examples (see also section 4)
  10. **Error Handling** — exit codes (0/1/2/3) and specific error codes (e.g., `DATA_NO_PROJECT`, `VALIDATION_INVALID_QUERY`, `VALIDATION_UNKNOWN_COMMAND`). Enumerate error codes that skills need for pattern-matching, not just exit codes. Include error recovery patterns with worked examples
  11. **Self-Discovery** — `goodplan schema --json`
  12. **Migration Example** — before/after for a real skill section (e.g., create-epic state writes)
- [x] **Add deprecation note to `skills/_shared/references/state-and-activity-formats.md`** — add a note at the top of the file that the state.md format is now obsolete, with a pointer to `cli-interaction.md`. 12 skills reference this file directly
- [x] **Verify convention doc completeness** — compare against architecture's cli-interaction-conventions.md checklist to ensure no sections are missed. Note topics that are "drafted but validated by subsequent slices"

### Verification

1. Read the convention doc end-to-end. Verify all sections present and CLI command examples are correct
2. Spot-check 3 CLI commands from the doc against the actual CLI: run them and confirm the described behavior matches
3. Verify migration example's "after" commands work when run against the goodplan repo

## Phase 3: Project-Status Tracer Bullet

Rewrite the `project-status` skill to use CLI commands per the convention doc. This proves the integration pattern works end-to-end.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c 'Read .project/state\.md\|Write .project/state\.md\|Read .project/.*\.json\|Read .project/.*\.jsonl' skills/project-status/SKILL.md` — returns a non-zero count (direct file references exist)
- [ ] `grep -c 'goodplan status\|goodplan state' skills/project-status/SKILL.md` — returns 0 (no CLI commands)
- [ ] `grep -c 'ls.*\.project\|ls -d.*\.project' skills/project-status/SKILL.md` — returns non-zero (directory-existence checks exist)

**After implementation** (should pass / show presence):
- [ ] `grep -c 'Read .project/state\.md\|Write .project/state\.md' skills/project-status/SKILL.md` — returns 0
- [ ] `grep -c 'Read .project/activity-log\.jsonl\|tail.*activity-log' skills/project-status/SKILL.md` — returns 0 (no direct reads)
- [ ] `grep -c 'ls.*\.project\|ls -d.*\.project' skills/project-status/SKILL.md` — returns 0 (no directory-existence checks)
- [ ] `grep -c 'goodplan status\|goodplan state' skills/project-status/SKILL.md` — returns non-zero (CLI commands present)
- [ ] `project-status` skill references `cli-interaction.md` convention doc
- [ ] Running `/project-status` on the goodplan repo produces correct status output

### Tasks

- [ ] **Read current `project-status` skill** — `skills/project-status/SKILL.md` and its references (especially `references/status-logic.md`). Identify every direct `.project/` file read
- [ ] **Update `project-status` SKILL.md frontmatter** — add `requires: goodplan >= 0.0.1` field. Note: `requires` is agent-behavioral, not machine-enforced — there is no runtime validation. Enforcement relies on the agent loading `cli-interaction.md` and following the check procedure. Update description from "Read .project/ state" to "Query project state via the goodplan CLI"
- [ ] **Add convention doc reference** — insert a Read step in the skill for `~/.claude/skills/_shared/references/cli-interaction.md` so agents understand CLI interaction rules
- [ ] **Rewrite `skills/project-status/SKILL.md`** replacing direct file access:
  - Step 1 (check for .project/): two-stage detection: (a) `goodplan --version --json` to confirm binary exists, (b) `goodplan status --json` to confirm a project exists (check for `DATA_NO_PROJECT`). These are distinct checks — `--version --json` only proves the binary is installed, not that a project exists
  - Step 2 (load status logic): still load `references/status-logic.md` for display formatting. BUT: the file-existence state machine is now replaced by `status --json` which derives state from the CLI
  - Step 3 (read state.md): **eliminate entirely** — use `goodplan status --json` for active entities, phase, recommendations
  - Step 4 (read activity-log): replace `tail -5 .project/activity-log.jsonl` with `goodplan state --json --query '.["activity-log.jsonl"] | .[-5:]'` (jqjs supports negative array indexing per research doc). If `.[-5:]` fails at runtime, fall back to querying the full array and taking the tail. Note: `--offset`/`--limit` is the general-purpose pagination mechanism for other cases but cannot express "last N" without knowing total length
  - Step 5 (determine active scope): derive from `status --json` response fields (`activeEpic`, `activeSlice`, `activeQuest`). For Format B (all slices/epics/quests with states), use `slice:list --json`, `quest:list --json`, `epic:list --json` if available (note: `epic:list --json` has no `--status` filter — filtering is client-side); otherwise note which Format B sections are deferred until those commands exist. Confirm `slice:list --json` returns status per slice (not just names) for Format B Use `state --json --query` for interrupted.md detection and sequencing.md reads
  - Step 6 (file-existence state machine): replace with `status --json` phase derivation + current `show --json` for entity details — skills can rely on `status`, `name`, `goal` fields from entity JSON (without artifacts — artifacts field is deferred to slice 02). Use `state --json --query` for deeper lookups where needed
  - Steps 7-8 (reporting): use CLI data, format with existing display logic
  - **Remove Step 9 entirely** — `project-status` is a pure read-only skill with no state mutations per convention doc. The state.md writeback and activity-log.jsonl append are both prohibited
  - Step 10 (offer detail): keep this step but rewrite to use CLI-based retrieval. "Show full activity-log" uses `goodplan state --json --query '.["activity-log.jsonl"]'`. "Show all slice statuses" uses `slice:list --json` if available, otherwise `goodplan state --json --query` for slice directories
  - Keep markdown reads (architecture, idea.md) via Read tool — convention doc says this is correct
- [ ] **Update `skills/project-status/references/status-logic.md`** — simplify now that CLI handles state derivation. Remove the "state.md Write-Back Format" section (no longer applicable). Keep display formatting rules
- [ ] **Install updated skill** — `bun run install:skills`
- [ ] **Test end-to-end** — run `/project-status` on the goodplan repo and verify correct output

### Verification

1. Run `/project-status` on the goodplan repo. Verify it reports correct status: active epic, completed slices, recent activity, recommended next step
2. Run `/project-status` from a directory without `.project/` — verify it handles the "no project" path gracefully (detects `DATA_NO_PROJECT` from `goodplan status --json`)
3. `grep -rn 'Read .project/state\.md\|Write .project/state\.md\|Read .project/.*\.json\|Read .project/.*\.jsonl\|ls.*\.project' skills/project-status/` — returns no hits for direct structured state reads or directory checks
4. `grep -rn 'goodplan' skills/project-status/SKILL.md` — returns hits showing CLI command usage
5. Verify the skill references `~/.claude/skills/_shared/references/cli-interaction.md`
