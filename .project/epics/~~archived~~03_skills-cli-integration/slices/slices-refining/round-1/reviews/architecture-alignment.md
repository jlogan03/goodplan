# Architecture Alignment Review

## Overall Assessment

Score: 8/10

The slice sequencing maps well to the project's 4-layer architecture (Commands -> RPC -> State Machine -> Data Layer) and respects subsystem boundaries. The "convention-doc-first, tracer bullet, then mechanical rollout" approach is sound. Several issues around scope definition and architectural consistency need attention.

## Critical Issues

### 1. goal-refining.md [02-show-status-enrichment]: `begin()` RPC factoring contradicts the architecture

Slice 02 proposes factoring `rollup`, `add-verification`, `update-verification`, `create-decision`, `update-decision` out of the `begin()` RPC function into "dedicated RPC functions." However, the architecture's `rpc-layer-api.md` explicitly defines `begin()` as a generic phase-initiated function where these operations are legitimate `BeginPhase` variants (lines 25-41 of RPC API). The `BeginPhase` type includes `'add-verification'`, `'update-verification'`, `'create-decision'`, `'update-decision'`, and `'rollup'`. The existing `begin.ts` already implements this mapping.

Factoring them out would break the architecture's intentional design: a uniform `begin(phase, target, payload)` -> `reduce()` -> `commitState()` pipeline. The Commands API (`commands-api.md`) already has dedicated command surface (`decision:create`, `learning:rollup`, `epic:add-verification`) -- those are thin routing to the same `begin()` RPC call.

**Recommendation:** Remove the `begin()` factoring from slice 02. If there is a real ergonomic problem (e.g., return type confusion), address it by refining the `BeginResult` union type, not by splitting the function.

### 2. goal-refining.md [02-show-status-enrichment]: `context?`/`paths?` result type fields already exist in the architecture

Slice 02 lists adding `context?` and `paths?` fields to `BeginResult`, `SubmitResult`, and `CompleteResult` as work to do. But `rpc-layer-api.md` already specifies these fields on all three result types (BeginResult has `context?` and `paths?`, SubmitResult has `context?` and `paths?`, CompleteResult has `context?`, `paths?`, and `architecturePaths?`). If these are already in the architecture spec but not yet implemented, this is implementation work, not design work -- the goal should say "implement" not "add."

**Recommendation:** Clarify whether these fields are already implemented in the codebase. If yes, remove from scope. If no, reframe as "implement the `context?`/`paths?` fields already specified in the RPC API."

## Important Issues

### 3. goal-refining.md [01-state-command-convention-doc-tracer]: Three deliverables listed in text, four enumerated

The "What We're Building" section says "Three deliverables" then lists four: (1) `state --json --query`, (2) `--version --json`, (3) convention doc, (4) project-status migration. This is a minor text error but indicates the scope description was edited without updating the count.

**Recommendation:** Fix the count to "Four deliverables."

### 4. goal-refining.md [01-state-command-convention-doc-tracer]: `state` command subsystem placement unclear

The `state` command is fundamentally a read-only command that calls `assembleState()` from the Data Layer, applies jqjs filtering, and adds pagination. Per the architecture's command routing conventions, read-only commands bypass the RPC Layer. The slice goal says "commands layer + data layer routing" in scope, which is correct, but should explicitly state this is a read-only command that does NOT touch the RPC layer or state machine, to prevent scope creep.

**Recommendation:** Add to scope boundaries: "The `state` command is read-only. It routes directly to the Data Layer via `assembleState()`, consistent with the architecture's read-only command routing pattern."

### 5. goal-refining.md [04-exploration-architecture-skills] and [05-planning-execution-skills]: No dependency between 04 and 05

Slices 04 and 05 both depend only on slice 03. The sequencing table correctly shows this, but the narrative in `sequencing-refining.md` implies sequential ordering ("splits by skill domain: architecture/exploration skills (04), then planning/execution skills (05)"). Since they have identical dependency sets, they could run in parallel.

**Recommendation:** Either explicitly mark 04 and 05 as parallelizable (which is already implied by the dependency table), or if sequential execution is intended for a reason (e.g., convention doc updates from 04 feed into 05), add 04 as a dependency of 05 and document why.

### 6. goal-refining.md [03-core-skill-validation]: "CLI code changes should be complete from slices 01-02" is a risky assumption

Slice 03's scope boundaries state "CLI code changes (should be complete from slices 01-02)." However, the core skills (`create-epic` and `complete`) exercise the broadest interaction range -- the stated purpose is to "validate the convention doc against the most complex workflows." If the convention doc or CLI has gaps, this slice must fix them. The "out of scope" declaration for CLI changes contradicts the slice's purpose as a validation pass.

**Recommendation:** Reframe: "CLI code changes are not expected but are in scope if validation reveals gaps. Track any CLI changes as convention doc updates."

### 7. goal-refining.md [02-show-status-enrichment]: Semver compatibility checking crosses multiple layers

The semver check ("runs before any command" per `cli-changes.md`) is a cross-cutting concern that touches the Commands layer dispatcher. The slice also includes RPC factoring and Data Layer result type changes. This makes slice 02 the highest-risk slice because it touches three architectural layers simultaneously. Compare to slice 01, which cleanly stays in Commands + Data Layer.

**Recommendation:** Consider whether semver checking should be a separate, smaller deliverable. If kept in slice 02, explicitly list which layers are touched and confirm no state machine changes are needed.

## Minor Issues

### 8. goal-refining.md [04-exploration-architecture-skills]: Command name inconsistency

The skill behavior section references `goodplan start-explore --epic <name> --inline --json` for sub-agent context. But the architecture's Commands API lists this as `goodplan start-explore --epic <name> [--inline[=<bytes>]]`. The `--json` flag is not listed on `start-*` commands in the Commands API since they already return structured output. Verify whether `--json` is needed on `start-*` commands.

**Recommendation:** Align `start-*` command invocations with the Commands API spec. If `start-*` commands always return JSON (as context bundles), `--json` may be redundant or incorrect.

### 9. goal-refining.md [05-planning-execution-skills]: `migrate` skill described as "stub" but counted in the 6-skill total

The `migrate` skill is described as "Stub skill -- minimal CLI interaction, primarily a placeholder for future `goodplan migrate` command." Including it inflates the skill count and makes the slice appear larger than it is. The `migrate` skill directory also only has 3 files vs 4 for all other skills, suggesting it's already minimal.

**Recommendation:** Either exclude `migrate` from this slice (it's a stub that doesn't need migration) or note it as zero-effort to set accurate expectations.

### 10. goal-refining.md [06-dogfooding]: Scope boundary allows "CLI bug fixes and gap filling" which is unbounded

Slice 06 has an open-ended scope: "CLI bug fixes and gap filling discovered during dogfooding." This could expand indefinitely. The architecture's "CLI conforms to skills" constraint (from `_overview.md`) means any skill friction could trigger CLI changes.

**Recommendation:** Add a time-box or issue-count cap: "Fix up to N issues discovered during dogfooding. Larger gaps become side quests." This prevents the dogfooding slice from becoming a catch-all.

### 11. goal-refining.md [01-state-command-convention-doc-tracer]: Convention doc location

The slice places the convention doc at `skills/_shared/references/cli-interaction.md`. The architecture overview (`_overview.md`) describes `cli-interaction-conventions.md` in the epic's architecture directory. Verify the convention doc isn't being duplicated -- the epic architecture file is the design spec, and the skills reference file is the runtime consumable. The relationship should be explicit.

**Recommendation:** Add a note: "The convention doc adapts the epic architecture's `cli-interaction-conventions.md` (design spec) into a skill-consumable reference. It is not a copy -- it uses skill-facing language and concrete command examples."
