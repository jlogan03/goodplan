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
- [ ] `goodplan state --json` — exits with `E_UNKNOWN_COMMAND` or equivalent (command doesn't exist)
- [ ] `goodplan --version --json` — prints `goodplan 0.0.1\n` (plain text, ignores `--json`)
- [ ] `tests/unit/commands/state.test.ts` — file doesn't exist
- [ ] `tests/integration/state.test.ts` — file doesn't exist

**After implementation** (should pass / show presence):
- [ ] `goodplan state --json` — returns complete state tree as JSON with `project.json` unwrapped, JSONL entries as arrays, markdown entries as `true`
- [ ] `goodplan state --json --query '.["project.json"].name'` — returns just the project name string
- [ ] `goodplan state --json --query '.["activity-log.jsonl"]' --limit 3` — returns exactly 3 entries
- [ ] `goodplan state --json --query 'broken['` — exits 2 with `VALIDATION_INVALID_QUERY` error
- [ ] `goodplan state --json --inline` — returns state tree with markdown content as strings
- [ ] `goodplan --version --json` — returns `{ "version": "0.0.1" }` (or current version)
- [ ] `goodplan --version` — still prints plain text `goodplan 0.0.1`
- [ ] `bun test tests/unit/commands/state.test.ts` — all pass
- [ ] `bun test tests/integration/state.test.ts` — all pass

### Tasks

- [ ] **Create `src/core/data/serialize.ts`** — `serializeStateTree(state: ProjectState, options: { inline: boolean }): unknown` function. Recursively transforms the typed `StateEntry` tree into a plain JSON-serializable object:
  - `DirectoryEntry` → plain object (keys = child names, values = serialized children)
  - `JsonEntry<T>` → `T` directly (unwrapped — strip `type` discriminator)
  - `JsonlEntry<T>` → `T[]` directly (unwrapped)
  - `MarkdownEntry` → `true` when `options.inline` is false, raw string when `options.inline` is true
- [ ] **Create `src/commands/global/state.ts`** — new command following `status.ts` pattern:
  - Import `assembleState` from data layer, `serializeStateTree` from serialize module
  - Define command with `globalArgs` + state-specific flags: `inline` (string type for citty, parsed with `parseInlineBudget` — boolean toggle only for this slice), `offset` (string, optional), `limit` (string, optional)
  - `run()`: call `resolveProjectDir()`, `assembleState(dir)`, `serializeStateTree(state, { inline })`, then `output(serialized, args)` — the existing `output()` function handles `--json`, `--query`, and `--quiet`
  - After `output()` applies `--query`, apply `--offset`/`--limit` if the result is an array: slice `result.slice(offset, offset + limit)`. Note: this requires applying pagination BETWEEN query and final output. Either extend `output()` or apply pagination manually before calling `output()`
  - Register in command registry (`src/commands/global/schema.ts`) per INV-006
  - Export as `stateCommand`
- [ ] **Register state command in `src/commands/main.ts`** — import `stateCommand`, add to `subCommands` map
- [ ] **Handle `--offset`/`--limit` pagination** — implement in the `state` command's `run()` function. Parse `offset` and `limit` as integers from string args. After `applyQuery()` (if present), check if result is an array. If so, apply `Array.slice(offset, offset + limit)`. Pass the paginated result to the final output call. If not an array, ignore offset/limit silently
- [ ] **Modify `src/index.ts` for `--version --json`** — in the `--version` handler (lines 60-63), check if `rawArgs.includes("--json")`. If true, output `deterministicStringify({ version: "0.0.1" })`. If false, keep existing plain text output. Read version from `package.json` at build time or hardcode (match existing pattern)
- [ ] **Unit tests `tests/unit/commands/state.test.ts`** — follow `status.test.ts` pattern:
  - Create minimal `.project/` fixture with project.json, a slice with slice.json, activity-log.jsonl with a few entries, and a markdown file
  - Test `serializeStateTree()` directly: verify JSON entries unwrapped, JSONL entries as arrays, markdown as `true` (no inline), markdown as string (with inline)
  - Test state command output: `--json` returns valid JSON matching fixture, `--query` filters correctly, `--offset`/`--limit` paginates arrays, invalid query returns error
- [ ] **Integration tests `tests/integration/state.test.ts`** — follow existing integration pattern (spawn compiled binary):
  - `state --json` on a real `.project/` returns valid JSON with `project.json` content
  - `state --json --query '.["project.json"].name'` returns project name
  - `state --json --query '.["activity-log.jsonl"]' --limit 2` returns exactly 2 entries
  - `state --json --query '.["activity-log.jsonl"]' --offset 2 --limit 2` returns different entries
  - `state --json --query 'bad syntax'` exits 2 with VALIDATION_INVALID_QUERY
  - `state --json --inline` includes markdown content as strings
  - `--version --json` returns `{ "version": "..." }` (JSON)
  - `--version` (no `--json`) returns plain text
- [ ] **Rebuild binary** — `bun run build` to compile with new command
- [ ] **Run full test suite** — `bun test` to verify no regressions

### Verification

Run against the goodplan repo's own `.project/`:

1. `goodplan state --json --query '.["project.json"]'` — returns JSON with name, version, activeEpic
2. `goodplan state --json --query '.slices | keys'` — returns slice directory names
3. `goodplan state --json --query '.["activity-log.jsonl"]' --limit 3` — returns exactly 3 entries
4. `goodplan state --json --query '.["activity-log.jsonl"]' --offset 3 --limit 3` — different entries
5. `goodplan state --json --query 'broken['` — exit 2, VALIDATION_INVALID_QUERY
6. `goodplan state --json --inline --query '.architecture["_overview.md"]'` — returns markdown content string
7. `goodplan state --json --query '.architecture["_overview.md"]'` — returns `true` (no inline)
8. `goodplan --version --json` — returns `{ "version": "0.0.1" }`
9. jqjs performance: all queries above complete in < 1s on the goodplan repo state tree
10. `bun test` — all tests pass

## Phase 2: Convention Doc

Write `skills/_shared/references/cli-interaction.md` — the shared reference that defines how all goodplan skills interact with the CLI. Adapts the architecture's `cli-interaction-conventions.md` into a skill-consumable format.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `ls skills/_shared/references/cli-interaction.md` — file doesn't exist

**After implementation** (should pass / show presence):
- [ ] `skills/_shared/references/cli-interaction.md` exists with all required sections
- [ ] Covers at minimum: binary detection, invocation patterns, state orientation, error handling
- [ ] All CLI command examples use correct flag names (entity-specific `--slice`/`--epic`/`--quest`, not `--name`)
- [ ] Documents `stdin: ""` as Bash tool syntax with explicit callout
- [ ] Documents `start-*` always-JSON behavior and `--inline[=<bytes>]`
- [ ] Includes migration example (before/after for a real skill section)
- [ ] Includes error recovery patterns

### Tasks

- [ ] **Read architecture's `cli-interaction-conventions.md`** from `.project/epics/__active__skills-cli-integration/architecture/cli-interaction-conventions.md` — this is the source material
- [ ] **Write `skills/_shared/references/cli-interaction.md`** adapting the architecture spec. Structure:
  1. **Binary Detection & Version** — `goodplan --version --json`, fail-fast if missing. Note: version enforcement is convention-doc-only in this slice; CLI-side enforcement comes in slice 02
  2. **Data Ownership** — JSON/JSONL through CLI only, free-form markdown via Read tool directly. Table format matching architecture doc
  3. **What Skills Must NOT Do** — direct JSON/JSONL reads, state.md, activity-log appending, mkdir for .project/ subdirs
  4. **Invocation Patterns** — always use `--json`, parse stdout, check exit codes. Note `stdin: ""` is Claude Code Bash tool API syntax (not shell). `start-*` commands always return JSON (`--json` not needed). `submit-*` and mutation commands require `--json`
  5. **Interaction Patterns by Role** — orchestrator, sub-agent, interactive orchestrator (3 patterns). Include worked examples
  6. **State Orientation** — `goodplan status --json` replaces state.md. Mapping table: state.md field → CLI equivalent
  7. **Deriving Workflow Phase** — use `show --json` artifacts field (planned for slice 02, note as upcoming)
  8. **Deep Dives** — `goodplan state --json --query`. Include concrete jq examples. Note `--inline` for markdown content
  9. **Error Handling** — exit codes (0/1/2/3), error recovery patterns with worked examples
  10. **Self-Discovery** — `goodplan schema --json`
  11. **Migration Example** — before/after for a real skill section (e.g., create-epic state writes)
- [ ] **Verify convention doc completeness** — compare against architecture's cli-interaction-conventions.md checklist to ensure no sections are missed. Note topics that are "drafted but validated by subsequent slices"

### Verification

1. Read the convention doc end-to-end. Verify all sections present and CLI command examples are correct
2. Spot-check 3 CLI commands from the doc against the actual CLI: run them and confirm the described behavior matches
3. Verify migration example's "after" commands work when run against the goodplan repo

## Phase 3: Project-Status Tracer Bullet

Rewrite the `project-status` skill to use CLI commands per the convention doc. This proves the integration pattern works end-to-end.

### Expected Behavior

**Before implementation** (should fail / show absence):
- [ ] `grep -c 'state\.md\|activity-log\.jsonl\|\.project/.*\.json' skills/project-status/SKILL.md` — returns a non-zero count (direct file references exist)
- [ ] `grep -c 'goodplan status\|goodplan state' skills/project-status/SKILL.md` — returns 0 (no CLI commands)

**After implementation** (should pass / show presence):
- [ ] `grep -c 'state\.md' skills/project-status/SKILL.md` — returns 0
- [ ] `grep -c 'activity-log\.jsonl' skills/project-status/SKILL.md` — returns 0 (no direct reads; references in comments/rationale OK)
- [ ] `grep -c 'goodplan status\|goodplan state' skills/project-status/SKILL.md` — returns non-zero (CLI commands present)
- [ ] `project-status` skill references `cli-interaction.md` convention doc
- [ ] Running `/project-status` on the goodplan repo produces correct status output

### Tasks

- [ ] **Read current `project-status` skill** — `skills/project-status/SKILL.md` and its references (especially `references/status-logic.md`). Identify every direct `.project/` file read
- [ ] **Rewrite `skills/project-status/SKILL.md`** replacing direct file access:
  - Step 1 (check for .project/): replace `ls .project/` with `goodplan --version --json` (if it fails, no CLI means no project, or `goodplan status --json` which returns DATA_NO_PROJECT)
  - Step 2 (load status logic): still load `references/status-logic.md` for display formatting. BUT: the file-existence state machine is now replaced by `status --json` which derives state from the CLI
  - Step 3 (read state.md): **eliminate entirely** — use `goodplan status --json` for active entities, phase, recommendations
  - Step 4 (read activity-log): replace `tail -5 .project/activity-log.jsonl` with `goodplan state --json --query '.["activity-log.jsonl"] | .[-5:]'`
  - Step 5 (determine active scope): derive from `status --json` response fields (`activeEpic`, `activeSlice`, `activeQuest`)
  - Step 6 (file-existence state machine): replace with `status --json` phase derivation + `show --json` for entity details
  - Steps 7-9 (reporting): use CLI data, format with existing display logic
  - Keep markdown reads (architecture, idea.md) via Read tool — convention doc says this is correct
- [ ] **Update `skills/project-status/references/status-logic.md`** if needed — may need to simplify now that CLI handles state derivation. The skill still needs display formatting rules
- [ ] **Install updated skill** — `bun run install:skills`
- [ ] **Test end-to-end** — run `/project-status` on the goodplan repo and verify correct output

### Verification

1. Run `/project-status` on the goodplan repo. Verify it reports correct status: active epic, completed slices, recent activity, recommended next step
2. `grep -rn 'state\.md\|\.project/.*\.json\|\.project/.*\.jsonl' skills/project-status/` — returns no hits for direct structured state reads
3. `grep -rn 'goodplan' skills/project-status/SKILL.md` — returns hits showing CLI command usage
4. Verify the skill references `~/.claude/skills/_shared/references/cli-interaction.md`
