# Software Architecture Review

**Reviewer:** Software Architecture
**Score:** 8/10
**Issues:** Critical: 0, Important: 3, Minor: 3

---

## Summary

The slice sequence is architecturally sound. It respects the 4-layer stack, retires risk early with a tracer bullet, and preserves strict unidirectional dependencies. The convention-doc-first approach is the right call — it creates a single source of truth before mechanical rollout. The dependency graph between slices is minimal and explicit. The main concerns are around slice 02 scope creep, a potential layering violation in the `begin()` factoring, and some ambiguity in how the `state` command maps to the existing architecture.

---

## Important Issues

### goal-refining.md [02-show-status-enrichment]: Slice 02 conflates orthogonal concerns — CLI enrichment and RPC refactoring

Slice 02 bundles three distinct architectural changes: (1) `show`/`status` JSON enrichment, (2) `begin()` RPC factoring into dedicated functions, and (3) `context?`/`paths?` result type field additions. These touch different layers (Commands layer for enrichment, RPC layer for factoring, shared types for result fields) and have different risk profiles. The RPC factoring changes `BeginPhase` type narrowing and command-to-RPC routing — this is a structural change to the RPC contract, not an "enrichment." Bundling it with ergonomic JSON changes makes this slice harder to verify atomically and risks one concern blocking the other.

**Recommendation:** Consider splitting RPC factoring (dedicated functions for rollup, verification, decision CRUD) into its own slice or at minimum sequence it as a clearly separable phase within slice 02, with its own verification step. The epic architecture's `rpc-layer-api.md` already shows these as dedicated functions — the factoring is architecturally significant, not cosmetic.

### goal-refining.md [02-show-status-enrichment]: Semver compatibility checking placement is unclear relative to the architecture stack

The slice says compatibility checking runs "on every command" but does not specify which layer implements it. The Commands layer dispatches to RPC/Data — if compatibility checking happens pre-dispatch, it belongs in the Commands layer (or a middleware/hook). If it queries `project.json` to check the version, it touches the Data Layer. The current architecture has no concept of "middleware" or "interceptors" between the CLI entrypoint and command dispatch.

**Recommendation:** Specify that version compatibility checking is a Commands-layer concern implemented in the main dispatch path (`src/commands/main.ts` or the shared `global-args.ts` handler) before routing to individual commands. It should call `assembleState()` or `loadState()` to read `project.json.version`, which is a legitimate Commands-to-Data-Layer read path. Document this in the convention doc or architecture.

### goal-refining.md [03-core-skill-validation]: "Out of scope: CLI code changes (should be complete from slices 01-02)" is optimistic

Slice 03 explicitly states no CLI changes. But it migrates the two most complex skills (`create-epic` and `complete`) which exercise the broadest interaction range. The stated purpose of this slice is to validate the convention doc — validation means discovering gaps. If a gap requires a CLI change (e.g., `complete` needs a `start-complete` context bundle not yet implemented, or `epic:create` stdin handling doesn't match the skill's needs), the slice needs to accommodate that.

**Recommendation:** Change scope boundary from "out of scope: CLI code changes" to "CLI code changes are allowed for gap-filling discovered during validation, but major new commands should be escalated." This aligns with the epic's constraint "CLI conforms to skills, not the reverse."

---

## Minor Issues

### goal-refining.md [01-state-command-convention-doc-tracer]: `state` command's architectural placement needs explicit documentation

The `state` command is a new global read-only command that calls `assembleState()` (Data Layer), applies jq filtering (Commands layer concern via jqjs), and adds `--offset`/`--limit` pagination. This is a Commands-to-Data-Layer direct read, which is consistent with the routing pattern for read-only commands. However, it is the first command that exposes the raw `ProjectState` tree to external consumers. The serialization format (unwrapped `StateEntry` variants per `cli-changes.md`) is a new contract between the Data Layer's internal tree representation and the CLI's public API.

**Recommendation:** The goal already describes the serialization format well. Add a note in the convention doc or architecture that the `state` command's JSON schema is the public API contract for the state tree — internal tree type changes must maintain backward compatibility for this output.

### goal-refining.md [04-exploration-architecture-skills] / [05-planning-execution-skills]: "Mechanical rollout" underestimates sub-agent command complexity

Slices 04 and 05 are described as mechanical rollout, but they exercise `start-*`/`submit-*` sub-agent commands extensively — commands that manage context bundling with `--inline` budgets and coordinate multi-agent workflows. The `start-explore`, `start-architecture`, `start-plan` etc. commands route through the Context peer module, which has its own phase-specific priority tables. If any priority table is wrong or a context bundle is incomplete, the skill migration will surface it here, not in slices 01-03.

**Recommendation:** Add a verification criterion to slices 04-05: "Sub-agent context bundles (`start-*` with `--inline`) return relevant content for each phase." This validates the Context module's per-phase priority tables alongside the skill migration.

### goal-refining.md [06-dogfooding]: No acceptance criteria for convention doc accuracy

The dogfooding slice lists "Convention doc reflects the actual working patterns" as a success criterion, but there is no verification method beyond human review. After 5 slices of iterative convention doc updates, drift between the doc and actual CLI behavior is likely.

**Recommendation:** Add a verification step: for each command pattern in the convention doc, run the exact command shown and verify it works. This is a lightweight conformance check that catches stale examples.

---

## Positive Observations

1. **Tracer bullet in slice 01 is well-chosen.** `project-status` is read-only and exercises `status --json` + `state --json --query` — the two most important new interaction patterns. This retires the riskiest unknown (does CLI-to-skill integration actually work?) with the least complex skill.

2. **Dependency direction is clean.** Skills depend on the CLI's public JSON API. The CLI depends on nothing about skills. This maintains the strict unidirectional dependency graph. No new circular dependencies are introduced.

3. **Convention doc as shared reference is architecturally correct.** Rather than each skill independently interpreting CLI behavior, a single reference file at `skills/_shared/references/cli-interaction.md` acts as a module interface between the CLI subsystem and the skill subsystem. This reduces coupling by making the contract explicit.

4. **Slices 04 and 05 can run in parallel.** The sequencing doc shows both depend only on slice 03. This is good — they touch disjoint skill sets (epic lifecycle vs slice lifecycle) and can be developed concurrently if desired.

5. **The `state` command as keystone is the right architectural choice.** Rather than adding many specialized query commands, a single command exposing the full state tree with jq filtering is a deep module (small interface, large capability). This follows the "module depth" principle well.

6. **Data ownership boundary is preserved.** The plan consistently maintains JSON/JSONL as CLI-owned and free-form markdown as LLM-owned, with CLI providing paths for markdown writes. No slice violates this boundary.
