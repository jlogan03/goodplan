# TUI-CLI Review — Round 1

## Issues

**[IMPORTANT] Pagination between query and output needs explicit implementation strategy chosen in the plan**
The plan acknowledges the `output()` coupling problem (query + serialization are fused) and mentions two options, but the task list says "apply pagination manually before calling `output()`" without specifying that this means calling `applyQuery()` directly, then slicing, then writing to stdout with `deterministicStringify()` -- bypassing `output()` entirely. The research file (`_codebase-context.md` section 3.1) confirms this is the right approach, but the plan's task description still says "After `output()` applies `--query`" in the Expected Behavior preamble and in the task description for creating `state.ts`. The implementer may be confused by the contradiction: the plan says to use `output()` in the `run()` description, then immediately says pagination must happen between query and output, which requires NOT using `output()` when both `--query` and `--offset`/`--limit` are present.

The `state.ts` task should clearly state: when `--query` is present alongside `--offset` or `--limit`, call `applyQuery()` directly, apply `Array.slice()`, then write the result with `deterministicStringify()` to stdout. When `--query` is absent or no pagination flags are set, delegate to `output()` normally.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] The `inline` flag type in citty needs clarification for state command**
The plan says: "Define command with `globalArgs` + state-specific flags: `inline` (string type for citty, parsed with `parseInlineBudget`)". But `parseInlineBudget` returns `boolean | number | undefined`, and the plan says "boolean toggle only for this slice." The state command should treat `inline` as a simple boolean toggle: `--inline` means include markdown content, absence means exclude. Using `parseInlineBudget` adds unnecessary complexity -- a byte budget makes no sense for `serializeStateTree()` which either includes all markdown or none. The plan should specify: parse `inline` as a boolean (citty delivers `"true"` for bare `--inline`; check `value === "true" || value === ""`). Reserve `parseInlineBudget` for `start-*` commands where byte budgets apply.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT] Missing `--json` requirement for `state` command**
The plan's Expected Behavior shows `goodplan state --json` for all examples, but the plan does not specify what `goodplan state` (without `--json`) should do. The `status` command has a human-readable formatter (`formatStatusHuman`); the `state` command has no equivalent planned. If a user runs `goodplan state` without `--json`, the current plan would fall through to `output(serialized, args)` which writes a pre-formatted string -- but `serialized` is a plain object, so it would write `[object Object]`. The plan should explicitly state: `state` requires `--json` (or `--query`, which implies `--json`). Without either flag, output `deterministicStringify(serialized)` as indented JSON (similar to `schema` command's fallback) or show a helpful message. This is a CLI usability issue -- users who forget `--json` should not get garbage output.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Verification step 2 uses a jq path that may not work with the serialized tree**
Verification step 2: `goodplan state --json --query '.slices | keys'`. This assumes the serialized tree has a top-level `slices` key, which is correct only if `.project/slices/` exists. If there are no slices, `assembleState()` may not include the key at all (depends on whether `DirectoryEntry` always includes empty directories). The verification should note this dependency or use a path known to exist (e.g., `.["project.json"] | keys`).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] `--version --json` output format not specified precisely enough**
The plan says `deterministicStringify({ version: "0.0.1" })` but `deterministicStringify` uses tab indentation and alphabetical key sorting. For a single-key object this is fine, but the Expected Behavior says `{ "version": "0.0.1" }` (compact). This is cosmetic but the verification step should match the actual output format (indented with tab). Not a real problem, just a spec precision nit.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 3 Step 4 jq expression may need adjustment for jqjs behavior**
Phase 3, Step 4 replaces `tail -5 .project/activity-log.jsonl` with `goodplan state --json --query '.["activity-log.jsonl"] | .[-5:]'`. The jqjs library's array slicing behavior should be verified -- the research file notes jqjs supports "slicing" but does not confirm negative indexing works correctly. If `.[-5:]` is not supported, the skill would need `goodplan state --json --query '.["activity-log.jsonl"]' --offset <N> --limit 5` where N is computed from the total count. The plan should note this as a risk or include a fallback.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Integration test file naming inconsistency**
The plan proposes `tests/integration/state.test.ts`. Existing integration tests use descriptive prefixes: `smoke.test.ts`, `runner-modes.test.ts`, `workflow-init.test.ts`, `workflow-epic.test.ts`, etc. A bare `state.test.ts` breaks the naming pattern. Consider `command-state.test.ts` or `state-command.test.ts` to follow the convention of descriptive test file names. Similarly for the unit test.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR] Phase 2 convention doc section 6 references state.md mapping table but state.md is eliminated**
The plan's Phase 2, Task item 6 says "State Orientation -- `goodplan status --json` replaces state.md. Mapping table: state.md field -> CLI equivalent." This is good content, but the convention doc is written for NEW skills going forward. Including a migration mapping table is helpful for Phase 3 (rewriting project-status), but may confuse future skill authors who never knew about state.md. Consider labeling this section explicitly as "Migration Reference" or moving it to an appendix.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan is solid on the happy path but has several CLI usability gaps: the pagination/output coupling is acknowledged but not cleanly resolved in the task list, the bare `goodplan state` (no `--json`) behavior is unspecified, and the `inline` flag handling overcomplicates a simple boolean toggle. These are all fixable without structural changes. What would bring it to 9+: (1) resolve the pagination implementation strategy explicitly in the state.ts task, (2) specify behavior for `state` without `--json`, (3) simplify `inline` to a boolean for this command.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
