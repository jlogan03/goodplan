# Merged Review Feedback — Round 2

Reviewers: Holistic (9/10), Software Architecture (9/10), TypeScript (8/10), TUI and CLI (8/10)

---

### CRITICAL Issues

None.

---

### IMPORTANT Issues

**IMP-1: `StateError.detail` type mismatch between plan and architecture**
Sources: Software Architecture, TypeScript

Phase 2 (or 4 per TypeScript) defines `StateError` with `detail?: string`, but `state-machine-api.md` defines it as `detail?: Record<string, unknown>`. The existing `GoodplanError` accepts `detail?: string | Record<string, unknown>`. Using `string` loses structured detail (e.g., `{ currentStatus: "activated", attemptedEvent: "INIT_PROJECT" }`) and forces unnecessary conversion in the Phase 5 RPC mapping. Fix: change `detail?: string` to `detail?: Record<string, unknown>` to match architecture spec.

**IMP-2: `assembleState` error handling — unregistered .json files and throw-vs-collect strategy**
Sources: Software Architecture (unregistered files), TypeScript (throw vs collect)

Two sub-issues:
- (a) The plan does not specify what happens when a `.json` file has no matching schema in the registry. Per `data-layer-api.md`, unregistered `.json` files should be **ignored** (not included in the state tree). State this explicitly.
- (b) The plan does not specify whether `assembleState` throws on the first validation error or collects all errors. For CLI UX, collecting all errors and throwing a single `GoodplanError` with `DATA_VALIDATION_ERROR` code (listing all failing file paths + Zod errors) is better. Use `safeParse()` per the Zod research doc.

**IMP-3: Phase 5 expected behavior omits `decisions.jsonl` and `learnings.jsonl` from verification**
Source: Holistic

Phase 4 says INIT_PROJECT produces `decisions.jsonl` and `learnings.jsonl`, but Phase 5's `goodplan init` verification only checks `project.json`, `epics/overview.json`, `slices/overview.json`, `quests/overview.json`, `activity-log.jsonl`, plus collection directories. Add `decisions.jsonl` and `learnings.jsonl` to the expected output verification.

**IMP-4: Phase 5 binary regression test creates uncleanable `.project/` in repo root**
Source: Holistic

`bun run build && ./goodplan init --name binary-test && ./goodplan status --json` creates a `.project/` in the repo root with no cleanup step. This interferes with `resolveProjectDir()`. Fix: run in a temp directory (`cd $(mktemp -d) && /abs/path/to/goodplan init ...`) or add `rm -rf .project/` cleanup.

**IMP-5: Phase 5 refactored init must preserve `--quiet` behavior through `output()` routing**
Source: TUI and CLI

The plan adds `--quiet` verification to Expected Behavior but doesn't note in the Phase 5 refactor task that all output must route through `output()`. If the refactored init prints directly, `--quiet` breaks. Add a note to the refactor task.

**IMP-6: Phase 5 `--verbose` debug output verification is fragile**
Source: TUI and CLI

Current verification just checks that *something* appears in stderr. Strengthen to check for a specific file path, e.g.: `goodplan init --name debug-test --verbose 2>&1 1>/dev/null | grep -q 'project.json'`.

**IMP-7: `commitState` JSON write ordering — rationale and feasibility**
Sources: Software Architecture (rationale), TypeScript (feasibility)

Phase 3 says "Write ordering: JSON first, JSONL second" but: (a) the recursive tree diff implementation doesn't naturally separate JSON from JSONL writes, and (b) the rationale isn't stated. Options: collect writes into two arrays and flush in order (preserving crash-recovery semantics where entity state survives even if audit entries are lost), or drop the ordering requirement if not architecturally motivated. The plan should pick one and document the rationale.

---

### MINOR Issues

**MIN-1: Phase 2 `Learning` input type vs stored type distinction**
Source: Holistic

The `learningEntrySchema` defines the stored type (with `source`). Add a one-line note: "Input variant (omitting `source`) deferred to the slice implementing COMPLETE_SLICE."

**MIN-2: Phase 3 `assembleState` should specify that unknown file types are silently skipped**
Source: Holistic

The architecture says non-JSON/JSONL/MD files are ignored, but the plan doesn't state this. Add: "Other file types are silently skipped (not added to the tree)."

**MIN-3: Phase 5 conventions.md update task is vague**
Source: Holistic

List the new directories to document: `src/schemas/records/`, `src/core/state/`, `src/core/state/transitions/`, `src/core/rpc/`.

**MIN-4: Phase 2 learnings.jsonl schema registry pattern overlap**
Source: Software Architecture

`^learnings\.jsonl$` (project-level) and `.*\/learnings\.jsonl$` (per-slice/quest) overlap — the second pattern matches root-level too. Not blocking (both use same schema), but note that registry ordering matters or refine the second pattern.

**MIN-5: Phase 2 `overviewSchema` item status field needs `z.string()` note**
Source: TypeScript

Overview items aggregate heterogeneous entity statuses. Note that `status` uses `z.string()` (not a specific enum) since it spans entity types.

**MIN-6: Phase 2 `learningEntrySchema` — `rollup` and `rollupTo` required vs optional**
Source: TypeScript

With `exactOptionalPropertyTypes: true`, the schema must distinguish absent vs empty. Data model examples always show both fields present, so make `rollup: z.boolean()` and `rollupTo: z.array(z.string())` required (not optional).

**MIN-7: Phase 1 `ZERO_STATE` should use `as const satisfies ProjectState`**
Source: TypeScript

Prevents accidental mutation of shared constant in tests or careless code. Use `as const satisfies ProjectState` for type-level immutability.

**MIN-8: Phase 2 missing `verificationSchema` for epic's `verifications` array**
Source: TypeScript

`epicSchema` includes a `verifications` array but no Zod schema for the `Verification` object shape. Define inline or as standalone export.

**MIN-9: Phase 5 `NO_COLOR`/`FORCE_COLOR` verification**
Source: TUI and CLI

Low-risk (picocolors handles it), but add one verification line: `NO_COLOR=1 goodplan status` produces uncolored output.

**MIN-10: Phase 5 `init --json` verification should check output structure**
Source: TUI and CLI

Specify expected shape, e.g.: `goodplan init --json | jq .name` returns `"test-project"`.

**MIN-11: Phase 5 binary regression test missing error-path and exit code check**
Source: TUI and CLI

Add one compiled-binary error-path test: running `init` twice in same dir should exit 3. Current binary test only checks the happy path.

---

### DIRECTLY_ACTIONABLE (for loop exit)

All issues above are DIRECTLY_ACTIONABLE. Total: 18 (7 IMPORTANT + 11 MINOR).

---

### RESEARCH_NEEDED

None.

---

### Contradictions Resolved

**commitState write ordering (Software Architecture vs TypeScript):** Software Architecture says to document the rationale for JSON-before-JSONL ordering. TypeScript questions whether the ordering is feasible given the recursive diff implementation and suggests dropping it if not architecturally motivated. Resolution: merged as IMP-7 — the plan should either commit to the ordering (with a two-array collect-then-flush implementation and documented rationale) or explicitly drop it. Trusting TypeScript's implementation concern as the domain specialist on feasibility, while preserving Software Architecture's point that if kept, the rationale must be documented.

---

### Unresolved (USER_INPUT required)

None.
