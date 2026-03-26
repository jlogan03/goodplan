# Merged Architecture Review — Round 2

## CRITICAL Issues

None.

## IMPORTANT Issues

### I1. `startContext` call path ownership is ambiguous across three docs
**Raised by:** software-architecture (issue 1), holistic (issue 1), api-contract (issue 1)
**Files:** `rpc-layer-api.md`, `context-api.md`, `conventions.md`
**Conflict resolution:** Software Architecture reviewer owns boundary/depth — trust their resolution.

`startContext()` appears in both `rpc-layer-api.md` (Workflow Operations) and `context-api.md` (public API). Two documented call paths exist: Commands -> RPC -> Context vs Commands -> Context directly. `conventions.md` routing table doesn't mention Context at all. Three reviewers independently flagged this.

**Resolution (DIRECTLY_ACTIONABLE):**
1. Remove `startContext` from `rpc-layer-api.md` Workflow Operations (it's read-only, no state machine involvement).
2. Update `conventions.md` routing table to add: "Read-only workflow commands (`start-*`): Commands -> Context -> Data Layer."
3. Add note in `rpc-layer-api.md` that `startContext` is re-exported from the Context peer module for `--inline` use.
4. Update `context-api.md` to clarify it is the sole owner of `startContext`.

---

### I2. `submit-*` command disambiguation not documented consistently
**Raised by:** api-contract (issue 2)
**Files:** `commands-api.md`

`submit-refinement` documents `--slice`/`--quest` disambiguation but `submit-plan` and `submit-implementation` do not, even though they also map to both slice and quest events.

**Resolution (DIRECTLY_ACTIONABLE):** Add `--slice`/`--quest` disambiguation note to all `submit-*` entries in the command-to-event mapping table, matching the sub-agent command signatures section.

---

### I3. `BeginPhase` vs `SubmitPhase` naming asymmetry (`'refine-plan'` vs `'refinement'`)
**Raised by:** api-contract (issue 3)
**Files:** `rpc-layer-api.md`

`BeginPhase` uses `'refine-plan'` while `SubmitPhase` uses `'refinement'` for the same conceptual phase. The Commands layer must maintain an undocumented mapping.

**Resolution (DIRECTLY_ACTIONABLE):** Add a brief note in `rpc-layer-api.md` explaining the naming convention: `BeginPhase` names match CLI command verbs (`refine-plan`), `SubmitPhase` names match phase nouns (`refinement`).

---

### I4. `stdin: ""` pipe syntax is not valid shell
**Raised by:** agent-skill (issue 1), tui-cli (issue 3), api-contract (issue 7)
**Files:** `cli-interaction-conventions.md`

`stdin: "" | goodplan ...` is not valid bash/zsh. Three reviewers flagged this. LLM agents following examples verbatim will produce shell errors.

**Resolution (DIRECTLY_ACTIONABLE):** Either (a) add a prominent note that `stdin: ""` is Claude Code Bash tool API syntax (not shell), or (b) replace with valid shell (`echo '' | goodplan ...`). Since skills invoke via Claude Code's Bash tool where `stdin` is a parameter, option (a) is likely correct -- but needs explicit callout.

---

### I5. `activity:list` still in `commands-api.md` despite being replaced by `state --query`
**Raised by:** agent-skill (issue 2)
**Files:** `commands-api.md`, `cli-changes.md`

`activity:list` is listed in `commands-api.md` as `# not yet implemented` while `cli-changes.md` says it's replaced by `state --query`. Conflicting guidance.

**Resolution (DIRECTLY_ACTIONABLE):** Remove `activity:list` from `commands-api.md` or mark it as "Superseded by `goodplan state --json --query`" with a cross-reference.

---

### I6. Convention doc doesn't address `goodplan init` as a skill command
**Raised by:** agent-skill (issue 3)
**Files:** `cli-interaction-conventions.md`

`init` is never mentioned in the convention doc, even though `create-epic` Mode A uses it. The convention doc is the primary skill-author reference.

**Resolution (DIRECTLY_ACTIONABLE):** Add `init` to the orchestrator command examples or migration example in `cli-interaction-conventions.md`.

---

### I7. `complete` orchestrator pattern not exemplified in convention doc
**Raised by:** agent-skill (issue 4)
**Files:** `cli-interaction-conventions.md`, `rpc-layer-api.md`

The orchestrator section shows `slice:complete` alongside `slice:plan` without distinguishing that `complete` requires stdin. Since `/complete` is a core validation skill, its full CLI interaction should be exemplified.

**Resolution (DIRECTLY_ACTIONABLE):** Add a worked `complete` example to the orchestrator pattern section showing stdin payload construction.

## MINOR Issues

### M1. Per-phase content priority table duplicated between `rpc-layer-api.md` and `context-api.md`
**Raised by:** software-architecture (issue 5), holistic (issue 4), api-contract (issue 4), agent-skill (issue 6)
**Files:** `rpc-layer-api.md`, `context-api.md`

Four reviewers flagged this. Identical table in both files creates drift risk.

**Resolution (DIRECTLY_ACTIONABLE):** Remove the priority table from `rpc-layer-api.md`, replace with reference to `context-api.md`.

---

### M2. `ContextBundle` type duplicated between `context-api.md` and `rpc-layer-api.md`
**Raised by:** api-contract (issue 5)
**Files:** `context-api.md`, `rpc-layer-api.md`

**Resolution (DIRECTLY_ACTIONABLE):** Cross-reference from `rpc-layer-api.md` to `context-api.md`. Keep `ContextBundle` in RPC return types but note the source.

---

### M3. `SubmitPhase` not listed in `context-api.md` Dependencies section
**Raised by:** software-architecture (issue 2)
**Files:** `context-api.md`

**Resolution (DIRECTLY_ACTIONABLE):** Add `SubmitPhase` to `context-api.md` Dependencies, noting it comes from shared types.

---

### M4. Context module fitness functions are placeholders
**Raised by:** software-architecture (issue 3)
**Files:** `context-api.md`

Both fitness functions marked "candidate -- not yet written." The dependency-direction check is architecturally important.

**Resolution (DIRECTLY_ACTIONABLE):** Prioritize implementing these fitness functions early in the epic, especially the "no State Machine imports" check.

---

### M5. `conventions.md` routing table doesn't include Context as a target
**Raised by:** software-architecture (issue 4)
**Files:** `conventions.md`

Merged with I1 -- the routing table fix in I1 addresses this.

**Resolution:** Covered by I1.

---

### M6. `StatusResult.artifacts` mixed shapes (objects vs numbers)
**Raised by:** software-architecture (issue 6), api-contract (issue 8)
**Files:** `rpc-layer-api.md`

Mixed shapes driven by underlying data (directories have file listings, JSONL has counts). Two reviewers flagged independently but both agreed it's acceptable.

**Resolution (DIRECTLY_ACTIONABLE):** Add a brief comment in `rpc-layer-api.md` explaining the rationale for the split.

---

### M7. Epic-level `_overview.md` missing maturity table referenced by API docs
**Raised by:** software-architecture (issue 7)
**Files:** epic-level `_overview.md`

API docs reference "per _overview.md subsystem maturity" but point to the epic-level file which has no maturity table.

**Resolution (DIRECTLY_ACTIONABLE):** Update cross-references to point to project-level `architecture/_overview.md`, or add a brief maturity reference to the epic-level file.

---

### M8. `Target.project` variant has no command mapping
**Raised by:** holistic (issue 2)
**Files:** `rpc-layer-api.md`

No command produces `{ type: 'project' }`. Used for `status()` or future use.

**Resolution (DIRECTLY_ACTIONABLE):** Add a brief comment in `rpc-layer-api.md` explaining `Target.project`'s purpose.

---

### M9. `plan-created` to `COMPLETE_REFINEMENT_ROUND` skip path lacks documentation
**Raised by:** holistic (issue 3), api-contract (issue 6)
**Files:** `transition-tables.md`

Skip path is valid but undocumented in convention doc. `plan-created` implies `plan.md` exists but this isn't stated.

**Resolution (DIRECTLY_ACTIONABLE):** Add a note in `transition-tables.md` confirming the skip path safety (plan-created guarantees plan.md exists).

---

### M10. `schema` command recovery pattern never shown concretely
**Raised by:** agent-skill (issue 5)
**Files:** `cli-interaction-conventions.md`

`goodplan schema --command <cmd> --json` mentioned as recovery tool but never exemplified.

**Resolution (DIRECTLY_ACTIONABLE):** Add a brief worked example in the error handling section.

---

### M11. `--quiet` flag documented but unused in skill patterns
**Raised by:** agent-skill (issue 7)
**Files:** `commands-api.md`, `cli-interaction-conventions.md`

**Resolution (DIRECTLY_ACTIONABLE):** Add a note that `--quiet` is for human operators; skills should use `--json`.

---

### M12. No guidance on concurrent skill CLI invocations
**Raised by:** agent-skill (issue 8)
**Files:** `cli-interaction-conventions.md`

**Resolution (DIRECTLY_ACTIONABLE):** Add brief guidance: "Read-only commands are always safe; mutations serialized by file locking; retry once on `DATA_CONCURRENT_MODIFICATION`."

---

### M13. `--offset`/`--limit` semantics ambiguous with `applyQuery` result-collapsing
**Raised by:** tui-cli (issue 1)
**Files:** `commands-api.md`, `src/util/query.ts`

Pagination applies to "the result is an Array" vs "the query yielded multiple jq outputs" — different cases.

**Resolution (RESEARCH_NEEDED):** Design decision needed during `state` command implementation. Document the choice in `commands-api.md`.

---

### M14. `schema` registry missing `state` command entry
**Raised by:** tui-cli (issue 2)
**Files:** `src/commands/global/schema.ts`

Expected since `state` doesn't exist yet. Must be added atomically with command implementation (INV-006).

**Resolution (DIRECTLY_ACTIONABLE):** Track as implementation task — add `state` to schema registry when implementing the command.

---

### M15. `parseInlineBudget` silent fallback on invalid values
**Raised by:** tui-cli (issue 5)
**Files:** `src/commands/global-args.ts`

`--inline=abc` silently falls back to `true` instead of producing a validation error.

**Resolution (DIRECTLY_ACTIONABLE):** Fix during implementation to return a validation error on invalid budget values.

---

### M16. `applyQuery` exit code 2 for runtime errors may be imprecise
**Raised by:** tui-cli (issue 4)
**Files:** `src/util/query.ts`, `commands-api.md`

Runtime query failures (e.g., `.foo` on an integer) map to exit 2 (validation) which may be misleading.

**Resolution:** Acceptable as-is. Consider `QUERY_RUNTIME_ERROR` -> exit 1 in a future iteration.

## DIRECTLY_ACTIONABLE (Loop Exit)

**Count: 20** (7 IMPORTANT + 13 MINOR)

All issues above are directly actionable except M13 (RESEARCH_NEEDED) and M16 (deferred).

## RESEARCH_NEEDED

**Count: 1**

1. **M13:** `--offset`/`--limit` pagination semantics with `applyQuery` result-collapsing behavior. Needs a design decision during `state` command implementation.

## Contradictions Resolved

**Count: 1**

1. **`stdin: ""` severity:** agent-skill rated it IMPORTANT, tui-cli and api-contract rated it MINOR. Since this directly affects skill execution (agent-skill's domain), trusting the domain specialist: rated **IMPORTANT** (I4).

## Unresolved (USER_INPUT Required)

**Count: 0**

No cross-domain contradictions requiring user input. All reviewer disagreements resolved by conflict resolution rules.
