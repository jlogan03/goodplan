# Merged Review Feedback — Round 1

## CRITICAL Issues

**C1. Phase 3 skill rewrite missing `requires` frontmatter and conflates binary detection with project existence**
(Agent-Skill)

Convention doc mandates every CLI-using skill call `goodplan --version --json` at startup and check a `requires` frontmatter constraint. Phase 3 replaces Step 1 with `--version --json` as a project-existence check, but `--version --json` only confirms the binary exists, not that a project exists. Additionally, no task adds a `requires` field to the SKILL.md frontmatter.

Fix: (a) Add `requires: goodplan >= 0.0.1` to `project-status` SKILL.md frontmatter. (b) Separate binary detection (`--version --json`) from project existence detection (`status --json` checking for `DATA_NO_PROJECT`). (c) Add a task to Phase 3 for updating the frontmatter.

Resolution: DIRECTLY_ACTIONABLE

---

**C2. State command `--offset`/`--limit` not explicitly registered in schema registry with ArgDefinition entries**
(API-Contract)

The plan mentions registering the `state` command in the schema registry but does not specify `ArgDefinition` entries for `offset` and `limit` (type, description, required/default). Without this, `goodplan schema --command state --json` won't reflect pagination flags, violating INV-006.

Fix: Add explicit task to register `state` with `{ ...globalArgDefs, inline: { type: "string", description: "Include markdown content in state tree" }, offset: { type: "string", description: "Skip N entries when result is an array" }, limit: { type: "string", description: "Return at most N entries when result is an array" } }`.

Resolution: DIRECTLY_ACTIONABLE

---

## IMPORTANT Issues

**I1. Pagination implementation strategy not committed to in task list — output() coupling unresolved**
(Holistic, TUI-CLI, TypeScript, Software-Architecture, API-Contract — all 5 reviewers flagged this)

The plan acknowledges `output()` couples query application and stdout writing, lists two options, but the task list contradicts itself: the `state.ts` task says to call `output(serialized, args)` while the pagination task says to apply pagination "after applyQuery()." These are mutually exclusive. Additionally, there are two overlapping tasks (create state.ts + separate pagination task) causing implementer confusion.

Fix: Consolidate into a single unambiguous approach in the state command task. When `--query` is present: call `applyQuery()` directly, apply `Array.slice()` for offset/limit, write via `deterministicStringify()` + `process.stdout.write()`. When `--query` is absent: call `output()` normally (offset/limit silently ignored). Remove the separate pagination task. Add a unit test verifying offset/limit is a no-op without `--query`.

Resolution: DIRECTLY_ACTIONABLE

---

**I2. Phase 3 references `show --json` artifacts field that doesn't exist until slice 02**
(Holistic, Software-Architecture, API-Contract — 3 reviewers)

Phase 3 tasks say "replace with `status --json` phase derivation + `show --json` for entity details" but `show --json` `artifacts` field is planned for slice 02. Phase 3 must only use commands available after Phase 1.

Fix: Phase 3 should explicitly use: `status --json` for active entities/recommendations, `state --json --query` for deeper lookups, current `show --json` (without artifacts) for entity details. Mark artifacts-dependent logic as deferred to post-slice-02. Convention doc (Phase 2) should mark `show --json` artifacts sections with "Available after slice 02."

Resolution: DIRECTLY_ACTIONABLE

---

**I3. Phase 3 Step 9 (state.md writeback + activity-log append) not explicitly eliminated**
(Holistic, Software-Architecture, Agent-Skill — 3 reviewers)

Current `project-status` Step 9 writes `state.md` and appends to `activity-log.jsonl`. The convention doc prohibits both. The plan says "replace direct file access" but doesn't explicitly address removing Step 9's write operations. Since `project-status` is read-only, Step 9 must be entirely removed.

Fix: Add explicit task to Phase 3: "Remove Step 9 entirely — `project-status` is a pure read-only skill with no state mutations per convention doc." Also update `references/status-logic.md` to remove the "state.md Write-Back Format" section.

Resolution: DIRECTLY_ACTIONABLE

---

**I4. `--inline` flag type and parsing need clarification**
(TUI-CLI, TypeScript, API-Contract — 3 reviewers)

Plan says use `type: "string"` with `parseInlineBudget` but "boolean toggle only for this slice." This creates the `"false"` string trap (`--inline false` would be truthy). The byte-budget form adds unnecessary complexity for this slice.

Fix: Keep `type: "string"` and `parseInlineBudget` for forward compatibility, but coerce to simple boolean for `serializeStateTree`: `const inline = parseInlineBudget(args.inline) !== undefined`. Make `serializeStateTree` options type explicit: `{ inline: boolean }` in this slice, expandable to `{ inline: boolean | number }` later. Note in plan that budget support is deferred.

Resolution: DIRECTLY_ACTIONABLE

---

**I5. `goodplan state` without `--json` behavior unspecified**
(TUI-CLI, Software-Architecture — 2 reviewers)

No human-readable format is planned for `state`. Running `goodplan state` without `--json` would produce `[object Object]` or garbage output.

Fix: Specify behavior: either (a) `state` requires `--json` and shows error without it, (b) implicitly enables `--json` since the command is LLM-facing, or (c) outputs `deterministicStringify()` as indented JSON by default. Option (c) is simplest — just always output JSON.

Resolution: DIRECTLY_ACTIONABLE

---

**I6. Convention doc (Phase 2) references `start-complete` which does not exist**
(Software-Architecture)

The source material includes a `goodplan start-complete` example. No such command exists in `src/commands/main.ts`. Including a non-existent command in the convention doc would cause skill failures.

Fix: Either omit the `start-complete` example or mark it as "not yet available." The plan should flag this as a known gap in the source material to avoid transcribing it uncritically.

Resolution: DIRECTLY_ACTIONABLE

---

**I7. Format B data requirements exceed what `status --json` provides**
(Holistic)

The `project-status` skill's Format B output (all slices with states, all epics, all quests) requires data that `status --json` doesn't provide — e.g., it only reports the active slice, not all slices with individual statuses.

Fix: Specify that Phase 3 needs `slice:list --json`, `quest:list --json`, `epic:list --json` for Format B, and `state --json --query` for interrupted.md detection and sequencing.md reads. Alternatively, note which Format B sections are deferred until those commands are available.

Resolution: DIRECTLY_ACTIONABLE

---

**I8. Phase 3 skill rewrite does not add convention doc reference to SKILL.md**
(Agent-Skill)

None of the Phase 3 tasks instruct adding a Read step for `cli-interaction.md`. The rewritten skill should reference it so agents understand CLI interaction rules.

Fix: Add task to insert a line in Step 2 loading `~/.claude/skills/_shared/references/cli-interaction.md`.

Resolution: DIRECTLY_ACTIONABLE

---

**I9. `serializeStateTree` return type should be narrower than `unknown`**
(TypeScript)

The actual return is always a `Record<string, unknown>`. Using `Record<string, unknown>` or `JsonSerializable` provides better type safety for callers that access properties directly.

Resolution: DIRECTLY_ACTIONABLE

---

**I10. Version string hardcoded — should use single source of truth**
(TypeScript, API-Contract — 2 reviewers)

Version `"0.0.1"` is hardcoded. Both plain-text and JSON version outputs should reference a single `const VERSION` or import from `package.json` to prevent drift.

Resolution: DIRECTLY_ACTIONABLE

---

**I11. Phase 3 does not update `project-status` SKILL.md description field**
(Agent-Skill)

Current description "Read .project/ state" implies direct file access. Should reflect CLI-based state reading post-rewrite.

Fix: Update description to reflect CLI-based approach, e.g., "Query project state via the goodplan CLI."

Resolution: DIRECTLY_ACTIONABLE

---

**I12. Convention doc Phase 2 underspecified for `stdin: ""` documentation**
(Agent-Skill)

Task item 4 is too terse. Should instruct copying the full `stdin: ""` explanation from the architecture spec, including equivalent shell syntax and Claude Code named parameter distinction.

Resolution: DIRECTLY_ACTIONABLE

---

## MINOR Issues

**M1. Verification step 2 `.slices | keys` may not match actual state tree shape**
(Holistic, TUI-CLI, TypeScript, Software-Architecture, API-Contract — 5 reviewers)

For epic-scoped projects, slices are nested under `epics/__active__*/slices/`, not at the top level. The goodplan repo uses epics. Additionally, `| keys` would include non-directory children like `overview.json`.

Fix: Use `.epics["__active__skills-cli-integration"].slices | keys` or another path known to exist.

Resolution: DIRECTLY_ACTIONABLE

---

**M2. Phase 3 grep checks are brittle**
(Holistic, Agent-Skill — 2 reviewers)

`grep -c 'state\.md'` matches mentions in comments/rationale context. Also missing checks for `ls .project/` patterns (directory-existence checks the convention doc prohibits).

Fix: Use more targeted patterns (e.g., `Read .project/state.md`, `Write .project/state.md`). Add `grep -c 'ls.*\.project\|ls -d.*\.project'` check.

Resolution: DIRECTLY_ACTIONABLE

---

**M3. Missing documentation update for `commands-api.md`**
(Holistic)

The `state` command needs to be added to the CLI command surface documentation.

Resolution: DIRECTLY_ACTIONABLE

---

**M4. No explicit fitness function verification task**
(Holistic)

The plan should verify the new command passes existing fitness functions (`stateless-commands.test.ts`, `schema-output-accuracy.test.ts`) or update them if needed.

Resolution: DIRECTLY_ACTIONABLE

---

**M5. Convention doc should note `state-and-activity-formats.md` partial obsolescence**
(Holistic)

12 skills reference this file. Phase 2 should add a deprecation note or remove the state.md section.

Resolution: DIRECTLY_ACTIONABLE

---

**M6. Integration test file naming inconsistency**
(TUI-CLI)

`state.test.ts` doesn't follow existing pattern (`smoke.test.ts`, `workflow-init.test.ts`, etc.). Use `command-state.test.ts` or `state-command.test.ts`.

Resolution: DIRECTLY_ACTIONABLE

---

**M7. Convention doc state.md mapping table may confuse future skill authors**
(TUI-CLI)

The migration mapping table is useful for Phase 3 but new skill authors never knew about state.md. Label as "Migration Reference" or move to appendix.

Resolution: DIRECTLY_ACTIONABLE

---

**M8. `applyQuery` result semantics interaction with offset/limit needs clarifying comment**
(TypeScript, API-Contract — 2 reviewers)

`applyQuery()` returns the raw value for 1 result vs. array for multiple. Pagination applies to ANY array result regardless of semantic origin. Add a clarifying comment to implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**M9. Missing `import type` specification for serialize module**
(TypeScript)

With `verbatimModuleSyntax: true`, must use `import type { ProjectState, DirectoryEntry, ... }`. Plan should list required type imports.

Resolution: DIRECTLY_ACTIONABLE

---

**M10. Phase 1 Expected Behavior exit code should use actual error code**
(API-Contract)

Should say `VALIDATION_UNKNOWN_COMMAND` (exit code 2) not `E_UNKNOWN_COMMAND`.

Resolution: DIRECTLY_ACTIONABLE

---

**M11. Phase 3 jqjs negative array indexing (`.[-5:]`) not confirmed to work**
(TUI-CLI)

The plan should note this as a risk or include a fallback using `--offset`/`--limit`.

Resolution: DIRECTLY_ACTIONABLE

---

**M12. Convention doc Phase 2 omits `--inline` documentation for `state` command**
(API-Contract)

Since `--inline` changes the state command's output contract, the convention doc must explicitly document this.

Resolution: DIRECTLY_ACTIONABLE

---

**M13. `start-*` always-JSON behavior needs clarification in convention doc**
(Agent-Skill)

Should clarify whether `start-*` commands _require_ `--json` or return JSON regardless. Needs codebase exploration to verify.

Resolution: CODEBASE_EXPLORATION

---

## DIRECTLY_ACTIONABLE (for loop exit)

All CRITICAL and IMPORTANT issues are DIRECTLY_ACTIONABLE. The following can be resolved without further input:

1. **C1** — Add `requires` frontmatter + separate binary detection from project existence
2. **C2** — Register offset/limit ArgDefinitions in schema registry
3. **I1** — Consolidate pagination into single task with explicit applyQuery() approach
4. **I2** — Restrict Phase 3 to commands available after Phase 1; mark artifacts as deferred
5. **I3** — Add explicit task to remove Step 9 entirely
6. **I4** — Coerce inline to boolean; document deferred budget support
7. **I5** — Specify bare `state` behavior (recommend: always output JSON)
8. **I6** — Remove or mark `start-complete` as unavailable
9. **I7** — List additional commands needed for Format B or defer sections
10. **I8** — Add convention doc reference to SKILL.md
11. **I9** — Narrow serializeStateTree return type
12. **I10** — Single source for version string
13. **I11** — Update SKILL.md description field
14. **I12** — Expand stdin documentation task
15. All MINOR issues (M1-M13) except M13

Total DIRECTLY_ACTIONABLE: 26

## RESEARCH_NEEDED

None.

## Contradictions Resolved

1. **`--inline` type: boolean vs string** — TUI-CLI recommended `type: "boolean"` for simplicity; TypeScript and API-Contract recommended keeping `type: "string"` with `parseInlineBudget` for forward compatibility. **Resolved: keep `type: "string"` per TypeScript/API-Contract (domain specialists)** but coerce to boolean for this slice's `serializeStateTree`.

2. **Pagination task structure** — Holistic and TypeScript suggested merging pagination into the state command task; the plan has it as a separate task. **Resolved: merge into single task** per the majority recommendation and to eliminate contradictory descriptions.

## Unresolved (USER_INPUT required)

None. All issues are directly actionable or need codebase exploration (M13 only).

### Available Research

M13 resolved via codebase exploration: All `start-*` commands always output JSON regardless of `--json` flag. Each has a comment: "Always outputs JSON regardless of --json flag (sub-agent command)." Convention doc should state: "`start-*` commands always return JSON — the `--json` flag is not required and has no effect."
