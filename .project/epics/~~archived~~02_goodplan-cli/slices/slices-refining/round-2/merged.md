# Merged Feedback — Round 2 Review

Reviewers: Software Architecture (SA), Tracer Bullet Quality (TBQ), Architecture Alignment (AA), Risk/Dependency Analysis (RDA)
Scores: SA 8/10, TBQ 8/10, AA 9/10, RDA 8/10

---

## Round 1 Fixes — Confirmed

All round-1 criticals and importants are resolved. No re-verification needed.

- **submit-* gap (C1/C3):** `submit-plan`, `submit-refinement`, `submit-implementation` pulled into slice 03. Slice 04 verification is now executable.
- **Slice 02 scope (I1):** Cache and concurrent modification detection deferred to slice 03.
- **Slice 06 dependency (I2/I3):** 06→05, 08→"06 (transitively 05)". Confirmed.
- **Stdin JSON for entity creation (I4):** All creation commands now use `echo '...' | goodplan entity:create` pattern.
- **Learnings-at-completion vs. learning:rollup (I5):** Distinction now explicit in both slice 03 and slice 06 scope boundaries.
- **Context bundling decisions/learnings (I6):** Slice 05 verification step 2 explicitly creates `decisions.jsonl` and `learnings.jsonl` entries.
- **Schema command ownership (I7):** Slice 06 explicitly claims `schema` command.
- **Fitness function mechanism (I11):** Now uses const array of event type strings validated exhaustively against `StateEvent` union at compile time.

---

## Important Issues

### IMP-1 — Slice 03: Unit-test vs. CLI verification boundary is ambiguous in the epic phase chain

**Raised by:** SA, TBQ, AA (three independent observations, same root cause)

Verification step 3 tells the implementer to "walk the full phase chain using skip paths" and "verify via unit tests calling `reduce()` directly, and via a test helper or CLI test harness." The problem:

- `epic:explore` → `BEGIN_EXPLORE` is a CLI command (in scope).
- `COMPLETE_EXPLORE` (skip path) requires `submit-explore`, which is deferred to slice 05. It can only be triggered via `reduce()` in a unit test.
- The terms "CLI test harness" and "via reduce() in tests" are used interchangeably without specifying which transitions fall into which category.
- The success criterion "Full phase chain: explore → architecture → refine-architecture → slicing → refine-slices, each command advancing status" implies CLI-level exercise for the full chain, which is not achievable in slice 03.

**Fix:** Split step 3 into two explicit tracks:
- **(a) CLI track:** `epic:explore`, `epic:define-architecture`, `epic:refine-architecture`, `epic:define-slices`, `epic:refine-slices` — these trigger `BEGIN_*` events and advance status to the `*ing` states. Show concrete commands with expected output.
- **(b) Unit test track:** `COMPLETE_*` events (skip paths) exercised by calling `reduce()` directly: e.g., `reduce(epicWithStatus("created"), { type: "COMPLETE_EXPLORE" })`. These are not CLI-testable until slice 05.

Also update the success criterion to clarify "each command advancing status" refers only to `BEGIN_*` commands at the CLI level; `COMPLETE_*` skip paths are unit-test-only.

---

### IMP-2 — Slice 03: `COMPLETE_SLICING` verification requires slice entities that don't exist until slice 04

**Raised by:** SA

The `COMPLETE_SLICING` event returns `sliceCount`, derived by counting slice entities linked to the epic. But `slice:create` (`CREATE_SLICE`) is slice 04's responsibility — there are zero slices at slice 03 verification time.

**Fix:** Clarify in slice 03 that `COMPLETE_SLICING` CLI-level verification (i.e., the full `epic:define-slices → COMPLETE_SLICING` path producing a real `sliceCount`) is only fully exercisable after slice 04. In slice 03, `COMPLETE_SLICING` is verified via unit test with a fixture state pre-populated with slice entries. Mark this criterion explicitly as "(unit test)" in the success criteria.

---

### IMP-3 — Slice 03: Concurrent modification detection has no CLI-level verification path

**Raised by:** SA

`commitState()` concurrent modification detection is now in slice 03. The success criterion is valid ("externally modify a file between assembleState and commitState — returns DATA_CONCURRENT_MODIFICATION"), but verification steps 1–10 have no step for how to trigger this in a CLI binary run. Concurrent modification is timing-sensitive and can't be naturally triggered in a single-threaded synchronous CLI call.

**Fix:** Either (a) add a verification step specifying how to trigger the condition during CLI testing (e.g., instrumented test binary), or (b) mark this criterion as "(unit test)" and note that the integration-level check lives in slice 08's fitness functions. Option (b) is preferred since slice 08 already covers this.

---

### IMP-4 — Slice 03: `epic:complete` command is unassigned

**Raised by:** AA

`commands-api.md` defines `epic:complete --epic <name>` → `COMPLETE_EPIC`. The transition tables include this row. Slice 06 explicitly says "Epic completion command (handled within epic lifecycle transitions in slice 03)" — delegating it to slice 03. But slice 03's "In scope" list, Behavior section, success criteria, and verification steps all omit `epic:complete`.

The `COMPLETE_EPIC` state machine handler may be included in the reducer, but the CLI command is ungated.

**Fix:** Add `epic:complete` to slice 03's "In scope" list. Add a behavior item showing the stdin JSON (same pattern as `epic:activate`). Add a success criterion and verification step. The stdin shape is already in `commands-api.md`.

---

### IMP-5 — Slice 04: Missing CLI command for triggering `BEGIN_REFINEMENT`

**Raised by:** TBQ

Verification step 3 walks the plan→refine→implement path but says "begin refinement" without specifying the CLI command. The Behavior section shows the lifecycle `plan-created → refining → plan-refined → implementing` but no command name is given for the `BEGIN_REFINEMENT` transition.

**Fix:** Confirm the command name (likely `goodplan slice:refine --slice 01-auth` or `goodplan slice:begin-refinement --slice 01-auth`) and add it explicitly to the Behavior section, success criteria, and verification step 3.

---

### IMP-6 — Slice 04: Verification step 6 (`slice:complete` for second slice) lacks stdin JSON

**Raised by:** TBQ

Verification step 3 correctly shows the full `echo '{"verificationPassed":true,...}' | goodplan slice:complete --slice 01-auth --json` command. But verification step 6 ("Complete 01-auth, then plan 02-api — succeeds") omits the stdin JSON, making it not literally executable.

**Fix:** Add the full stdin JSON command to step 6, or explicitly reference step 3's command form.

---

### IMP-7 — Slice 04: `submit-refinement` verification missing concrete stdin JSON

**Raised by:** SA

Verification step 3 references `submit-refinement --slice 01-auth` "with scores stdin" but doesn't show the JSON shape. The success criterion about the circuit breaker ("submit maxRounds refinement rounds without passing scores") doesn't clarify what passing vs. non-passing scores look like.

**Fix:** Add concrete stdin JSON examples:
- Below threshold: `echo '{"scores":{"clarity":7,"depth":6}}' | goodplan submit-refinement --slice 01-auth --json`
- Above threshold: `echo '{"scores":{"clarity":9,"depth":9}}' | goodplan submit-refinement --slice 01-auth --json`

---

### IMP-8 — Slice 05: Submit-* intra-slice contract not documented in scope boundaries

**Raised by:** RDA

Slice 05 depends on `submit-plan`, `submit-refinement`, and `submit-implementation` from slice 03 (transitively via slice 04). This is consistent in the sequencing table. However, the intra-slice placement contract (submit-* live in 03, not 05) is not stated in slice 05's scope boundaries. If slice 03 scope is trimmed during implementation and submit-* migrate back to slice 05, slice 04's verification becomes unexecutable — the original C3 critical issue resurfaces.

**Fix:** Add a one-line note to slice 05's scope boundaries: "Depends on submit-plan, submit-refinement, submit-implementation being available from slice 03." Add a matching note to sequencing row 05's rationale.

---

### IMP-9 — Slice 02: Scope remains large; blocking risk is real

**Raised by:** RDA (USER_INPUT required)

After deferring cache and concurrent modification to slice 03, slice 02 still bundles: 4 recursive tree types, 6 tree navigation helpers, schema registry, `assembleState` (filesystem scanning), `commitState` (recursive diff, atomic writes), debug logging, reduce scaffold + INIT_PROJECT handler, 9+ Zod entity schemas, and the refactored init command.

Every subsequent slice is blocked if slice 02 stalls. No further deferral is possible without creating an unverifiable scaffolding slice.

**Resolution requires user input.** Options:
- **(a)** Accept as-is (deferral of cache/concurrent-modification is sufficient).
- **(b)** Also defer debug logging to slice 03 to marginally reduce scope.
- **(c)** Accept and add a "fallback plan" note to the sequencing rationale specifying what to do if `assembleState()` or `commitState()` implementation stalls.

---

## Minor Issues

### MIN-1 — Slice 03: `BEGIN_REFINE_SLICES` not mentioned in skip-path chain description

**Raised by:** AA

Verification step 3's skip-path chain is correct for the skip path (directly `slices-defined → COMPLETE_REFINE_SLICES`), but an implementer may not realize `epic:refine-slices` → `BEGIN_REFINE_SLICES → refining-slices` also exists and must be implemented.

**Fix:** Add a parenthetical in step 3 noting that `BEGIN_REFINE_SLICES → refining-slices` also requires a CLI command (`epic:refine-slices`) listed in "In scope."

---

### MIN-2 — Slice 05: `quest:complete` stdin JSON not shown in verification

**Raised by:** SA, AA (same gap)

Slice 04 verification was upgraded to show concrete stdin for `slice:complete`. The equivalent for `quest:complete` in slice 05 was not added. The command takes the same shape as `slice:complete` but without `deferred`.

**Fix:** Add a verification step:
```
echo '{"verificationPassed":true,"learnings":[{"category":"worked","summary":"Test","detail":"...","tags":[],"rollupTo":["project"]}],"architectureDelta":[]}' | goodplan quest:complete --quest fix-logging --json
```

---

### MIN-3 — Slice 05: `start-refinement` verification missing `--inline` flag and expected output shape

**Raised by:** TBQ

Verification step 7 shows `start-refinement` without the `--slice` flag or `--inline` option, and specifies no expected output fields.

**Fix:** Show full command: `goodplan start-refinement --slice 01-auth --inline --json` and note expected response shape: ContextBundle with `inline` map and `references` array.

---

### MIN-4 — Slice 05: `--inline` budget logic risk not acknowledged

**Raised by:** RDA

The `--inline` budget logic is a novel feature with no tracer bullet precedent. If it stalls, the quest lifecycle verification (also in slice 05) is blocked even though the two features are independently implementable.

**Fix:** Add a scope note: "Risk: --inline budget logic is novel (no tracer bullet precedent). If budget implementation takes significantly longer, quest lifecycle commands can be verified independently without --inline — the two features are independent in implementation."

---

### MIN-5 — `--query`/`--json` consistency is an untracked open item

**Raised by:** SA, TBQ, AA (same gap)

`sequencing-refining.md` notes an open item: "`--query` auto-implying `--json` — resolve before slice 06 implementation." But slice 06's success criteria don't include a step testing `--query` without `--json`, and the open item is not tracked as a criterion anywhere.

**Fix:** Add to slice 06's success criteria: "`goodplan status --query '.project.name'` (without `--json`) returns `"test-project"` — `--query` auto-implies `--json` for the intermediate representation." Mark the open item in `sequencing-refining.md` as resolved when slice 06 is implemented.

---

### MIN-6 — Slice 08: `Transition[]` arrays must be exported for fitness function access

**Raised by:** SA

Verification step 5 says the fitness function "derives expected transition count from `Transition[]` runtime data structures." If transition tables are private closures in the state machine modules, the fitness function can't access them.

**Fix:** State explicitly in slice 03 (where state machine is implemented) and slice 08 (where fitness functions are tested): "Transition tables are exported from their respective state machine modules (e.g., `export const epicTransitions: Transition[]`) to enable fitness function enumeration."

---

### MIN-7 — Slice 08: Fitness function "completeness" verification is circular as stated

**Raised by:** TBQ

Verification step 5 says "derive expected transition count from `Transition[]` runtime data structures" — but if the const array is the truth source, its count *is* the expected count. The check is effectively circular.

**Fix:** Restate the verification as: "every element of the compile-time-validated `EVENT_TYPES` const array has at least one corresponding test in the state machine completeness suite." The goal is exhaustiveness coverage, not a count match.

---

### MIN-8 — Slice 04: Partial dependency on slice 03 is undocumented

**Raised by:** RDA

Slice 04 verification (step 1) requires only `epic:create` and `epic:activate` — not the full phase chain. An implementer reading the sequencing would wait for all of slice 03, when in practice the minimal dependency is much smaller.

**Fix:** Add a note to slice 04's scope or sequencing row: "Minimal dependency on slice 03: requires only epic:create and epic:activate. Full phase chain not needed for slice 04 verification. Slice 04 can begin once epic:create + epic:activate are working."

---

### MIN-9 — Slice 02: `--name` default behavior untested

**Raised by:** SA

Scope boundaries mention "`--name` default behavior (basename of cwd)" but no success criterion tests it.

**Fix:** Add: `cd /tmp/my-project && goodplan init` (no `--name`) — `project.json` has `"name": "my-project"`.

---

### MIN-10 — Slice 02: `conventions.md` update task is in scope but absent from verification

**Raised by:** AA

Success criterion says "update `.project/conventions.md` to reflect the actual `src/` directory structure after this slice" but no verification step confirms it.

**Fix:** Add a verification step: "Update `.project/conventions.md` to reflect the src/ directory structure established in this slice. No automated test — completed as part of the slice."

---

### MIN-11 — Sequencing: Escape valve note for slice 07 is misplaced

**Raised by:** RDA

The "slice 07 is the escape valve" note appears in both the rationale section (correct) and inside slice 08's table row (confusing, since it describes slice 07's role, not slice 08's scope). Slice 07's own table row doesn't mention this role.

**Fix:** Remove the escape valve sentence from slice 08's table row. Add a brief note to slice 07's table row: "Also serves as escape valve for parallel work if the main 02→06 chain stalls."

---

## Issue Index

| ID | Severity | File | Description |
|---|---|---|---|
| IMP-1 | Important | 03-epic-lifecycle | Unit-test vs. CLI boundary ambiguous in phase chain verification |
| IMP-2 | Important | 03-epic-lifecycle | COMPLETE_SLICING needs fixture state (slice 04 not yet built) |
| IMP-3 | Important | 03-epic-lifecycle | Concurrent modification has no CLI-level verification path |
| IMP-4 | Important | 03-epic-lifecycle | epic:complete command unassigned |
| IMP-5 | Important | 04-slice-lifecycle | BEGIN_REFINEMENT CLI command name missing |
| IMP-6 | Important | 04-slice-lifecycle | slice:complete stdin JSON absent from verification step 6 |
| IMP-7 | Important | 04-slice-lifecycle | submit-refinement stdin JSON not shown |
| IMP-8 | Important | 05-sub-agent-commands / sequencing | submit-* intra-slice contract undocumented in slice 05 scope |
| IMP-9 | Important | 02-project-init / sequencing | Slice 02 blocking risk — USER_INPUT required |
| MIN-1 | Minor | 03-epic-lifecycle | BEGIN_REFINE_SLICES omitted from skip-path chain description |
| MIN-2 | Minor | 05-sub-agent-commands | quest:complete concrete stdin JSON missing |
| MIN-3 | Minor | 05-sub-agent-commands | start-refinement missing --inline flag and output shape |
| MIN-4 | Minor | 05-sub-agent-commands | --inline budget risk not acknowledged in scope |
| MIN-5 | Minor | 06 / sequencing | --query/--json consistency is untracked open item |
| MIN-6 | Minor | 03-epic-lifecycle / 08-integration-test | Transition[] arrays must be exported for fitness function |
| MIN-7 | Minor | 08-integration-test | Fitness function completeness check stated as count match (circular) |
| MIN-8 | Minor | 04-slice-lifecycle / sequencing | Partial dependency on slice 03 undocumented |
| MIN-9 | Minor | 02-project-init | --name default behavior untested |
| MIN-10 | Minor | 02-project-init | conventions.md update absent from verification |
| MIN-11 | Minor | sequencing | Escape valve note for slice 07 misplaced in slice 08 row |

---

## Scores

| Reviewer | Score |
|---|---|
| Software Architecture | 8/10 |
| Tracer Bullet Quality | 8/10 |
| Architecture Alignment | 9/10 |
| Risk/Dependency Analysis | 8/10 |
| **Composite** | **8.25/10** |

---

## Path to 9+

1. Explicitly partition unit-test vs. CLI verification in slice 03 (IMP-1, IMP-2, IMP-3).
2. Add `epic:complete` to slice 03 scope (IMP-4).
3. Name the `BEGIN_REFINEMENT` CLI command in slice 04 (IMP-5).
4. Add concrete stdin JSON to slice 04 step 6 and `submit-refinement` (IMP-6, IMP-7).
5. Document submit-* intra-slice contract in slice 05 (IMP-8).
6. Resolve user input on slice 02 scope risk (IMP-9).

The minor items are all directly actionable and should be batched into the same pass.
