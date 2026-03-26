# Merged Slice Review — Round 1

## CRITICAL Issues

### C1. [Slice 02] `begin()` RPC factoring is architecturally wrong and unverified
**Sources:** architecture-alignment #1, software-architecture #1, tracer-bullet #critical, risk-dependency #1

Slice 02 proposes factoring `rollup`, `add-verification`, `update-verification`, `create-decision`, `update-decision` out of `begin()` into dedicated RPC functions. Multiple reviewers flag this:
- **Architecture Alignment** (trusted on boundary issues): `rpc-layer-api.md` explicitly defines `begin()` as a generic phase-initiated function; factoring out breaks the uniform `begin(phase, target, payload) -> reduce() -> commitState()` pipeline. The Commands API already has dedicated command surface routing to the same `begin()` call.
- **Tracer Bullet**: The RPC refactoring ships with no consumer exercising it. The only regression check is `bun test` which validates existing behavior, not new behavior.
- **Risk/Dependency**: RPC factoring has different risk profile than enrichments; failure blocks the enrichments that slices 03-05 actually depend on.

**Resolution:** Remove `begin()` factoring from slice 02. If there is an ergonomic problem with `BeginResult` union types, address by refining the result type, not splitting the function. This reduces slice 02's scope and risk significantly.

### C2. [Slice 02] Five unrelated deliverables with no unifying end-to-end verification
**Sources:** tracer-bullet #critical, software-architecture #1, risk-dependency #1

Even after removing C1, slice 02 still bundles: `show --json` artifacts, `status --json` file arrays, semver compatibility checking, and `context?`/`paths?` result type fields. These touch different layers (Commands, RPC types, dispatcher) and have no shared consumer to exercise them together. No skill is migrated in this slice.

**Resolution:** After removing `begin()` factoring (C1), the remaining deliverables are more cohesive (all are enrichments to existing commands). Sequence within the slice: enrichments first, semver checking second. Add verification that exercises enrichments as a skill would (e.g., run the exact command sequences the convention doc prescribes).

### C3. [Slice 02] `context?`/`paths?` result type fields may already exist
**Source:** architecture-alignment #2

`rpc-layer-api.md` already specifies `context?` and `paths?` on `BeginResult`, `SubmitResult`, and `CompleteResult`. If already implemented, this is duplicate work. If not yet implemented, the goal should say "implement" not "add."

**Resolution:** Verify whether these fields exist in the codebase. Reframe goal accordingly.

---

## IMPORTANT Issues

### I1. [Slices 03-05] "CLI code changes should be complete" assumption is fragile
**Sources:** software-architecture #3, architecture-alignment #6, tracer-bullet #important-3, risk-dependency #2

All three reviewers independently flag this. Slice 03's purpose is to validate the convention doc against complex workflows — validation means discovering gaps. The constraint "CLI conforms to skills, not the reverse" means gaps require CLI changes. Declaring CLI changes out-of-scope contradicts the slice's purpose.

**Resolution:** Reframe scope boundary in slices 03, 04, and 05: "CLI code changes are not expected but are in scope if validation reveals gaps. Track any CLI changes as convention doc updates."

### I2. [Slice 02] Semver compatibility checking layer placement unclear
**Sources:** software-architecture #2, architecture-alignment #7

Semver check "runs before any command" but no layer is specified. It's a cross-cutting concern touching the Commands dispatcher. Combined with the other slice 02 deliverables, this makes slice 02 touch three architectural layers simultaneously.

**Resolution:** Specify semver checking as a Commands-layer concern in the main dispatch path (e.g., `src/commands/main.ts` or `global-args.ts`). It reads `project.json.version` via `assembleState()`/`loadState()` — a legitimate Commands-to-Data-Layer read path.

### I3. [Slice 01] No automated tests for the `state` command
**Source:** tracer-bullet #important-1

The codebase has thorough test coverage (unit tests for every command, integration workflow tests, fitness tests). Shipping a new command without tests breaks the established pattern. The `--query` + `--offset`/`--limit` interaction has edge cases manual verification will miss.

**Resolution:** Add to success criteria: integration test for `state --json`, `state --json --query`, pagination, and error cases. Align with existing test infrastructure in `tests/integration/` and `tests/unit/commands/`.

### I4. [Slices 04-05] Verification requires test state with no setup instructions
**Source:** tracer-bullet #important-2

Verification says "On a test epic in `created` status, run `/explore`" but never specifies how to create that state. Non-reproducible verification.

**Resolution:** Each verification step should specify setup commands (e.g., `goodplan init`, `goodplan epic:create`) or reference a shared test fixture.

### I5. [Slice 05] Verification step 1 has contradictory setup
**Source:** tracer-bullet #important-3

"Begin planning with `goodplan slice:plan`, then run `/create-plan`" — but `slice:plan` IS the begin-planning transition. Running `/create-plan` afterward would fail or be redundant.

**Resolution:** Clarify: setup puts slice in `created` status, then `/create-plan` invokes `slice:plan` internally. Verification checks that the skill made the correct CLI calls.

### I6. [Slice 01] jqjs library risk on large state trees is unacknowledged
**Source:** risk-dependency #3

`state --json --query` applies jq to the full `assembleState()` tree. Performance and correctness of complex jq expressions on large trees are unknowns. Learnings say "tools/libraries need a research step."

**Resolution:** Slice 01 verification should include running the specific jq expressions against a realistic state tree (the goodplan repo itself) and confirming acceptable performance.

### I7. [Slices 04-05] Parallel execution risks convention doc conflicts
**Source:** risk-dependency #4 (minor there, elevated here due to practical impact)

Both slices may discover convention doc gaps and list "convention doc updates" in scope. Concurrent execution could produce conflicting updates.

**Resolution:** Add coordination note: if 04 and 05 run concurrently, one owns the convention doc, the other submits changes as suggestions. Or run sequentially.

---

## MINOR Issues

### M1. [Slice 01] "Three deliverables" text lists four items
**Sources:** architecture-alignment #3, tracer-bullet #minor-1
**Resolution:** Fix count to "Four deliverables."

### M2. [Slice 01] `state` command's JSON output is a new public API contract
**Source:** software-architecture #minor-1
**Resolution:** Add note that the `state` command's JSON schema is the public API contract — internal tree type changes must maintain backward compatibility.

### M3. [Slice 01] `state` command read-only routing should be explicit
**Source:** architecture-alignment #4
**Resolution:** Add to scope: "The `state` command is read-only, routing directly to Data Layer via `assembleState()`, consistent with read-only command routing pattern."

### M4. [Slices 04-05] "Mechanical rollout" underestimates sub-agent command complexity
**Source:** software-architecture #minor-2
**Resolution:** Add verification criterion: "Sub-agent context bundles (`start-*` with `--inline`) return relevant content for each phase."

### M5. [Slices 04-05] Missing verification for some skills
**Source:** tracer-bullet #minor-4
Slice 04 skips `refine-architecture` and `audit-architecture`. Slice 05 omits `create-slices` and `refine-slices`.
**Resolution:** Add verification steps or explicitly note which skills are grep-only verified.

### M6. [Slice 04] `--json` flag on `start-*` commands may be redundant
**Source:** architecture-alignment #8
**Resolution:** Align with Commands API spec — `start-*` commands may already return JSON by default.

### M7. [Slice 05] `migrate` skill is a stub inflating skill count
**Source:** architecture-alignment #9
**Resolution:** Note as zero-effort or exclude from slice scope.

### M8. [Slice 06] Dogfooding scope is unbounded
**Sources:** architecture-alignment #10, risk-dependency #5
**Resolution:** Add exit criteria: one full workflow cycle end-to-end; critical issues fixed; non-critical logged as deferred work.

### M9. [Slice 06] Success criteria overlap with slices 03-05
**Source:** tracer-bullet #minor-3
**Resolution:** Focus dogfooding criteria on cross-skill transitions and emergent issues, not re-verifying grep compliance.

### M10. [Slice 01] Convention doc relationship to architecture spec should be explicit
**Source:** architecture-alignment #11
**Resolution:** Add note: convention doc adapts the architecture's `cli-interaction-conventions.md` into a skill-consumable reference (not a copy).

### M11. [Slice 02] Version compatibility verification is fragile
**Source:** tracer-bullet #minor-2
**Resolution:** Use integration test with temp directory instead of manual `project.json` editing.

---

## DIRECTLY_ACTIONABLE

These can be applied without further research:

1. **Remove `begin()` RPC factoring from slice 02** (C1)
2. **Clarify `context?`/`paths?` as "implement" vs "add"** — check codebase first (C3)
3. **Reframe CLI-changes scope in slices 03-05** — allow gap-filling CLI fixes (I1)
4. **Specify semver checking layer placement** in slice 02 goal (I2)
5. **Add automated test requirement** for `state` command in slice 01 (I3)
6. **Add test state setup instructions** to slices 04-05 verification (I4)
7. **Fix slice 05 contradictory verification step** (I5)
8. **Fix "three deliverables" count** in slice 01 (M1)
9. **Add explicit read-only routing note** for `state` command (M3)
10. **Add exit criteria bounds** to slice 06 (M8)
11. **Add convention doc coordination protocol** for parallel slices 04-05 (I7)
12. **Add verification for skipped skills** in slices 04-05 (M5)

## RESEARCH_NEEDED

1. **jqjs performance on large state trees** — run jq expressions against the goodplan repo's own state to validate (I6). Needed before finalizing slice 01.
2. **`context?`/`paths?` implementation status** — check whether these fields already exist in `BeginResult`, `SubmitResult`, `CompleteResult` types (C3). Determines slice 02 scope.
3. **`start-*` command `--json` flag** — verify whether `start-*` commands return JSON by default per Commands API (M6). Affects slice 04 goal accuracy.

---

## Contradictions Resolved

| Conflict | Resolution | Authority |
|---|---|---|
| Architecture-alignment says `begin()` factoring "contradicts architecture"; software-architecture says it's "architecturally significant" | Resolved: both agree it's a structural change, but architecture-alignment (trusted on boundaries) clarifies it breaks the intentional uniform pipeline design. **Remove the factoring.** | Architecture Alignment |
| Software-architecture calls sub-agent commands "not mechanical"; tracer-bullet calls verification "underspecified" | Compatible observations. Both recommend adding verification criteria for context bundles. **Add verification.** | Tracer Bullet (verification quality) |
| Risk-dependency rates convention-doc chicken-and-egg as minor; architecture-alignment rates convention doc location as minor | Compatible. Convention doc evolution is mitigated by per-slice updates. **No action beyond noting the risk.** | N/A |

## Unresolved (USER_INPUT Required)

### USER_INPUT Resolved

**U1:** Keep slice 02 as one slice with internal sequencing. After removing `begin()` factoring, the remaining items are all enrichments to existing commands.

**U2:** Slices 04-05 run sequentially. Convention doc updates from slice 04 inform slice 05. No coordination overhead needed.
