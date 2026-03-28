# Merged Feedback — Round 3

## Important

**I1. State command error path must output JSON, not human-readable text**
The state command bypasses `output()` and is always-JSON, but error handling falls through to the top-level handler which checks `args.json`. Running `goodplan state` (no `--json` flag) that hits an error would produce human-readable stderr instead of structured JSON. Fix: either force `args.json = true` before code that might throw, catch errors within the command and format as JSON, or document the inconsistency.
Sources: Holistic, TypeScript (error handling for `assembleState`)

**I2. State command must handle `--quiet` flag explicitly**
Since the state command bypasses `output()`, it does not inherit `--quiet` suppression. `goodplan state --quiet` would still emit the full state tree. Fix: check `args.quiet` before writing; if true, return without output.
Source: TypeScript

**I3. `serializeStateTree` should use exhaustive switch with `never` default**
The plan describes four branches for entry types but does not specify an exhaustive switch. With `strict: true`, a `default: never` case ensures compile-time errors if new `StateEntry` variants are added. Add to the task: "Use `switch` on `entry.type` with `default` case (`const _exhaustive: never = entry; throw new Error(...)`)."
Source: TypeScript

**I4. Convention doc section 9 needs source guidance for completion payload shapes**
The plan says to document stdin payload shapes for `slice:complete` and `quest:complete` but does not tell the implementer where to find them. Specify: "Derive payload shapes from `goodplan schema --json --command slice:complete` and `goodplan schema --json --command quest:complete`."
Source: Holistic

**I5. `serializeStateTree` placement — consider `src/core/serialize.ts` over `src/core/data/serialize.ts`**
The function is a pure transformation with no I/O. The Data Layer's role is entity CRUD and filesystem I/O. Placing the serializer in `src/core/serialize.ts` keeps the Data Layer focused on I/O. Either location works (no circular dependency), but note the trade-off.
Source: Software-Architecture

**I6. Convention doc should enumerate specific error codes (e.g., `DATA_NO_PROJECT`) for skill pattern-matching**
Phase 3 uses `DATA_NO_PROJECT` detection, but the convention doc's error handling section only lists exit codes (0/1/2/3), not specific error codes. Skills need to distinguish `DATA_NO_PROJECT` from other exit-1 errors. Add error code enumeration to convention doc section 10.
Source: Software-Architecture

**I7. Reinforce `start-complete` exclusion in convention doc task item 9**
The exclusion note appears under task item 5 but the architecture source's `complete` orchestrator worked example sits under a different section. The implementer may copy it despite the note. Duplicate the exclusion note to task item 9, or add a cross-reference.
Source: Agent-Skill

**I8. Document that `requires` frontmatter is agent-behavioral, not machine-enforced**
No existing skill uses `requires:` and there is no runtime validation. The convention doc should explicitly state that enforcement relies on the agent loading `cli-interaction.md` and following the check procedure, preventing future authors from assuming automated enforcement.
Source: Agent-Skill

## Minor

**M1. Phase 3 `epic:list --json` has no `--status` filter — note that filtering is client-side**
Source: Holistic

**M2. Integration test Expected Behavior for offset/limit needs fixture precondition (at least 5 activity log entries)**
Source: Holistic

**M3. Deprecation note task should specify "at the top of the file" rather than "at the top of its state.md section"**
Source: Holistic

**M4. `serializeStateTree` return type note — internal recursive helper returns `unknown`, outer casts to `Record<string, unknown>`**
Source: TypeScript

**M5. `Number()` vs `parseInt()` for offset/limit — `Number("")` returns 0 instead of NaN; use `parseInt(value, 10)` or add empty-string guard**
Source: TypeScript

**M6. Convention doc should note that `--inline` type change means skills must not cache/compare state tree outputs across calls with different `--inline` settings**
Source: API-Contract

**M7. `serializeStateTree` return type is a public API contract — add code comment noting this**
Source: API-Contract

**M8. Phase 3 verification step 2 query path may not match actual state tree shape — verify during implementation**
Source: API-Contract

**M9. Add `output()` bypass comment in state command explaining why it does not use `output()`**
Source: Software-Architecture

**M10. Phase 3 `show --json` fields not specified — note that skills can rely on `status`, `name`, `goal` from entity JSON**
Source: Software-Architecture

**M11. Confirm `slice:list --json` returns status per slice (not just names) for Format B**
Source: Agent-Skill

**M12. Phase 3 verification should test the "no project" path from a directory without `.project/`**
Source: Agent-Skill
