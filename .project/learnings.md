# Learnings

Accumulated across all completed slices. Each entry traces back to the slice that surfaced it.

## Old lifecycle concepts that don't survive state machine redesigns should be retired, not force-migrated
_Source: 04-exploration-architecture-skills_

The old start-epic skill's "activation" mapped to a completely different lifecycle point than `epic:activate`. Retirement and responsibility redistribution was cleaner than forced mapping. Apply this when migrating any skill whose core concept doesn't exist in the new model.

## Graceful stop scenarios are hidden complexity in skill migration — inventory all scenarios upfront
_Source: 04-exploration-architecture-skills_

create-architecture had 6 graceful stop scenarios with ~15 state.md/activity-log references. Plans should inventory every stop scenario and map re-entry detection (CLI status + file existence) for each, not just say "leave artifacts in place."

## Skill-only slices don't need formal review cycles — grep + smoke test is sufficient
_Source: 04-exploration-architecture-skills_

All 4 skill SKILL.md migrations passed first iteration. Skill files are LLM prompts, not code — changes are structural pattern replacements with no runtime behavior. Future skill-only slices should skip formal review cycles and use grep checks + CLI smoke tests as verification.

## `__active__` prefix is a pre-CLI skill convention — CLI paths don't use it
_Source: 03-core-skill-validation_

The CLI creates entity directories at `epics/<name>/` without any prefix. The `__active__` convention was managed by old skills manually. Migrated skills must use unprefixed paths. Reviewers flagged this as CRITICAL when the actual filesystem (old-style) didn't match CLI behavior — significant confusion source.

## Entity paths are flat, not nested under parent entities
_Source: 03-core-skill-validation_

`resolveEntityDir` places slices at `.project/slices/<name>/`, not `.project/epics/<epic>/slices/<name>/`. Quests similarly at `.project/quests/<name>/`. This flat structure is non-obvious when epics "own" slices conceptually. Would have caused runtime bugs writing to non-existent nested paths.

## Migrated skills need a project migration path for pre-CLI adoption
_Source: 03-core-skill-validation_

Skills rewritten to use CLI commands can't run on projects without `project.json` (predating the CLI). The CLI returns `DATA_NO_PROJECT`. A `migrate` command or init-from-existing feature is needed before these tools can be used on the project that created them.

## Build-time defines must be mirrored in test compilation
_Source: 02-show-status-enrichment_

`--define __GOODPLAN_VERSION__` was missing from `tests/global-setup.ts`, breaking all integration tests that touch version parsing. Any build-time define in `package.json` scripts must also appear in the test binary compilation path.

## Breaking schema changes require version boundary ordering in plans
_Source: 02-show-status-enrichment_

Phase ordering must ensure semver infrastructure is in place before breaking changes ship. The 1.0.0 bump (Phase 4) had to precede the `status --json` breaking schema change (Phase 2). Plans with breaking changes should encode this ordering explicitly.

## Use z.infer as the single source of truth for function return types
_Source: 02-show-status-enrichment_

Hand-writing interfaces alongside Zod schemas creates drift risk. Using `z.infer<typeof schema>` as function return types eliminates this class of bug. Caught in Phase 1 review.

## Commands bypassing output() need explicit error, quiet, and exit code handling
_Source: 01-state-command-convention-doc-tracer_

The always-JSON `state` command bypasses `output()` and initially missed error formatting, `--quiet` suppression, and exit code handling — all three are normally inherited from `output()`. Any future always-JSON command should verify these three concerns explicitly.

## Convention docs must verify CLI commands exist before inclusion
_Source: 01-state-command-convention-doc-tracer_

The architecture source included `start-complete` (non-existent command). Convention docs referencing CLI commands must verify each command against `goodplan schema --json` or `src/commands/main.ts` before inclusion.

## citty string-type flags consume the next token — prefer boolean when value isn't needed
_Source: 01-state-command-convention-doc-tracer_

`--inline --query X` causes citty to parse `--query` as inline's string value. Prefer boolean-type flags when the value isn't needed, or document the ordering constraint in convention docs.

## Strict layered architecture with a pure reducer is the highest-leverage early investment
_Source: goodplan-cli_

The 4-layer stack (Commands → RPC → State Machine → Data Layer) held up across all 8 slices without boundary changes. Reducer purity (INV-003) made all 37 event handlers trivially testable and deterministic. Invest in the layer model and purity constraint early — it pays dividends for the entire epic.

## Novel modules need 3-5x more review budget than pattern-following code
_Source: goodplan-cli_

Context bundling (no precedent) had 8 review issues; quest state machine (following slice patterns) had 0. Budget extra iterations for phases introducing new subsystems. Pattern-following code often passes on the first iteration.

## Plans referencing CLI commands must verify names and error codes against source
_Source: 08-integration-test_

Plan-invented error codes and imprecise command sequences were caught in refinement but would have cost implementation cycles. Grep `src/commands/main.ts` and `src/util/errors.ts` during `/create-plan` when the plan references CLI commands.

## Binary-spawning integration tests require explicit stdin and GOODPLAN_DIR
_Source: 08-integration-test_

Without `stdin: ""` the compiled binary blocks forever. Without `GOODPLAN_DIR` env var, the binary finds the repo's own `.project/` via cwd walking. Both are required for every integration test spawning the binary.

## Data Layer invariants need direct imports; CLI invariants use binary spawning
_Source: 08-integration-test_

Concurrent modification, deterministic serialization, and schema validation are internal to `commitState`/`assembleState` — not observable through the CLI binary. Fitness function plans should explicitly classify each invariant as binary-testable or import-testable.

## Skills use slash commands, not CLI commands — consolidation must bridge both
_Source: 07-skills-migrate_

Command audit found zero `goodplan` CLI invocations in skill files. Skills orchestrate via slash commands (`/create-plan`). The `start-*`/`submit-*` subagent commands are the likely bridge when skills are consolidated to call the CLI.

## Shell scripts need robustness specs in plans
_Source: 07-skills-migrate_

Review caught existence guards, clean-install semantics (rm+rsync vs cp), POSIX newlines, and path resolution that the plan omitted. Future plans with shell scripts should specify error handling, idempotency, and path resolution upfront.

## Cross-reference conventions.md against plans during create-plan
_Source: 07-skills-migrate_

Plan listed 14 skill dirs; conventions.md and goal required 15 (including `migrate` stub). Caught as CRITICAL in refinement. Checking conventions alignment during planning prevents this class of error.

## Global flag additions require auditing all existing command files
_Source: 06-decisions-learnings_

Adding `--query` to shared `output()` left ~40 commands broken because they gated on `args.json` only. Plans adding global behaviors must include an explicit grep-and-update task for every command file.

## Non-entity RPC operations need dedicated return types
_Source: 06-decisions-learnings_

Forcing `learning:rollup` into the entity-shaped `begin()` Target/BeginResult contract was flagged as critical by all 4 reviewers. Design dedicated types for operations that don't fit the entity pattern.

## Architecture doc updates should be per-phase tasks, not consolidated
_Source: 06-decisions-learnings_

Both `rpc-layer-api.md` and `state-machine-api.md` drifted because doc updates were deferred to a later phase. Include doc updates as tasks within each phase that changes behavior.

## Greenfield modules need extra review budget vs pattern-following code
_Source: 05-sub-agent-commands_

Context bundling (novel, no precedent) had 8 review issues; quest state machine (following slice patterns) had 0. Plan extra iterations for phases without codebase precedent.

## Parameterized command families need a factory pattern
_Source: 05-sub-agent-commands_

8 start-* commands share ~400 lines of identical logic differing only by phase string. Use a factory returning command definitions; keep individual files as thin wrappers.

## Overview completed timestamps need setting on terminal transitions
_Source: 05-sub-agent-commands_

`updateOverviewStatus` helpers only update `status`, leaving `completed` permanently `null`. Set `completed` when entities transition to terminal states (completed/abandoned).

## Peer modules needing each other's types should share a common types file
_Source: 05-sub-agent-commands_

Bidirectional `import type` between context and RPC works but violates independent-modules. Extract shared types (`Target`, `SubmitPhase`, `ContextBundle`) to a common location.

## Bundling helpers prevent overview sync invariant violations
_Source: 04-slice-lifecycle_

`setSliceStatus` bundles status + overview sync + timestamp in one call, making it impossible to skip overview sync. Review caught `slice-submit.ts` bypassing this via direct `setSliceJson`. Apply this bundling pattern to all future entities.

## State machine writes data, RPC derives counts — clean separation for complex handlers
_Source: 04-slice-lifecycle_

COMPLETE_SLICE is the system's most complex handler but stays clean because the state machine only writes data. The RPC layer's `buildCompleteResult` derives all computed values (deferredRouted, epicComplete, learningsRolledUp) by diffing old vs new state. Keeps `ProjectState | StateError` as the only return type.

## Input schemas with strict enums, storage schemas with flexible strings
_Source: 04-slice-lifecycle_

`learningInputSchema` validates category with `z.enum()` at input boundary; `learningEntrySchema` uses `z.string()` for forward-compatibility in storage. This pattern prevents invalid data entry while allowing schema evolution.

## Universal `ts` on all StateEvent variants beats selective per-event `ts`
_Source: 03-epic-lifecycle_

Selective `ts` (only on events that set timestamp fields) creates stale timestamps on most transitions. Universal `ts` (RPC injects on all events) simplifies every handler and eliminates timestamp staleness bugs. All future event types should include `ts: string`.

## `satisfies Record<K, V>` before Map conversion provides compile-time exhaustiveness
_Source: 03-epic-lifecycle_

With `noUncheckedIndexedAccess`, `Map.get()` loses compile-time coverage. The `satisfies` pattern on the plain handler object catches missing handlers at compile time before converting to Map. Standard pattern for typed handler maps.

## Overview.json must be synced by every status-changing handler
_Source: 03-epic-lifecycle_

Setting overview status only at creation time leaves it permanently stale. Use a shared `updateOverviewStatus` helper called by every handler that changes entity status. Apply this pattern to future entities (slice, quest) from the start.

## Guard helpers should return `Entity | StateError` for type narrowing
_Source: 03-epic-lifecycle_

Guard functions returning `StateError | null` force non-null assertions (`!`) on every subsequent entity access. Returning `Entity | StateError` lets `isStateError()` narrow the type cleanly, eliminating dozens of `!` assertions across handler files.

## Validation divergence between code paths serving the same data is a design bug
_Source: 03-epic-lifecycle_

When cache and full-assembly paths validate differently (one throws, one skips), the same filesystem produces different state trees depending on cache state. Incremental paths must throw to trigger fallback to the authoritative path.

## Pure types that cross layer boundaries belong in a shared module
_Source: 02-project-init_

Tree types (`ProjectState`, `StateEntry`, navigation helpers) were placed in the data layer but needed by the state machine. Integration review caught this as a layer boundary violation. Extract cross-layer pure types to shared locations (e.g., `src/core/tree.ts`) from the start.

## Reducer purity requires externalizing non-determinism via event payloads
_Source: 02-project-init_

`new Date()` inside a reducer breaks INV-003 purity. Timestamps must be injected via the event payload by the RPC layer. All future `StateEvent` variants needing timestamps must include a `ts` field.

## Write Zod safeParse().data, not the original input
_Source: 02-project-init_

Zod 4 may strip unknown keys or coerce values during `safeParse()`. Writing the original object instead of `result.data` causes in-memory/on-disk divergence. Always persist `result.data`.

## Match architecture schema shapes from the start, even for unexercised fields
_Source: 02-project-init_

The slice `deferred` field was `string[]` but architecture specified `DeferredItem` objects. Fixing is cheap now, expensive after data is persisted. Match the documented shape even when the current slice doesn't exercise the field.

## citty requires runCommand + manual pre-dispatch for exit code control
_Source: 01-tracer-bullet_

`runMain` forces exit 1 for all errors. `runCommand` allows custom exit codes but doesn't throw `E_UNKNOWN_COMMAND` when `subCommands` is `{}` — requires manual pre-dispatch detection. Future commands must stay in sync with the pre-dispatch check.

## exactOptionalPropertyTypes conflicts with citty's generics — cast required
_Source: 01-tracer-bullet_

citty's `CommandDef<ArgsDef>` + `exactOptionalPropertyTypes: true` causes contravariance errors in `runCommand`/`showUsage` calls. Requires `as unknown as CommandDef` casts. Re-check on citty upgrades.

## Cross-layer utilities belong in src/util/, not in the layer that first needed them
_Source: 01-tracer-bullet_

`deterministicStringify` was placed in `src/core/data/` but needed by `src/util/output.ts` — a cross-layer import violation. Start shared utilities in `src/util/` from the beginning.

## Main runner regressions are invisible without integration tests
_Source: 01-tracer-bullet_

Removing the pre-dispatch check caused `badcommand` to silently exit 0. Only caught by code review, not the test suite. Process-spawning integration tests for `src/index.ts` are needed — scoped for slice 08.

## Flow-log is not a universal audit trail — verify which skills write to it
_Source: refactor-intelligence_

`implement-plan` and `refine-plan` do not write flow-log entries. Protocols that reference flow-log for cross-skill state (e.g., finding pre-implementation commits) should verify the referenced skill actually writes the expected entries during plan creation, not during implementation.

## Verify assumptions about cross-skill contracts during planning
_Source: refactor-intelligence_

When a plan references another skill's output format or behavior (flow-log entries, commit message patterns, state files), verify the assumption by reading the source skill's code during `/create-plan` or `/refine-plan`. Catching mismatches during planning is cheaper than pivoting during implementation.

## Re-entry paths must be checked before guardrails that reject the same state
_Source: complete-rename_

When a condition (e.g., "completion/learnings.md exists") is both a rejection criterion for first-time runs and a resume indicator for re-entry, the resume check must run first. Otherwise, graceful-stop recovery paths are blocked by the very guardrail they need to bypass.

## Archive naming conventions with embedded counters need explicit stripping rules
_Source: complete-rename_

Simple prefix stripping (`~~archived~~` → name) breaks for archives that embed structured metadata like numbering (`~~archived~~NN_<name>`). When adding counters or other metadata to prefix conventions, document the full stripping algorithm alongside the naming convention.

## Convention-first ordering enables consistent cross-skill infrastructure
_Source: initiatives-infrastructure_

When updating many skills to share a new concept (like initiatives), create the shared convention file first. Every subsequent skill update codes against the same reference, and reviewers catch inconsistencies by comparing against it. Without this, each skill invents its own conventions requiring reconciliation later.

## Integration review catches cross-cutting gaps per-phase reviews miss
_Source: initiatives-infrastructure_

Per-phase reviews validated each skill in isolation but missed system-level gaps (e.g., implement-plan and create-plan not reading initiative architecture). A final integration review across all phases caught 5 IMPORTANT issues. Budget for integration review when plans span many files.

## Scope resolution preambles (Step 0) should be a standard skill pattern
_Source: initiatives-infrastructure_

Skills that branch behavior based on context (initiative vs top-level vs side quest) benefit from resolving scope variables in a Step 0 preamble, then referencing those variables throughout. This pattern emerged through reviewer feedback and should be prescribed in future skill infrastructure work.

## Archive prefix sort order depends on the tool, not just ASCII
_Source: archived-prefix-migration_

The `~~archived~~` prefix sorts after active items in terminal `ls` (tilde > lowercase in ASCII) but may sort before them in file explorers (VS Code, Finder) that use locale-aware collation. When choosing prefix conventions for filesystem sorting, test in the actual tools users will see — not just the terminal.

## Simple mechanical quests don't need /implement-plan
_Source: archived-prefix-migration_

Find-and-replace quests with <60-line plans and all mechanical tasks work fine with direct implementation and a single commit. The `/implement-plan` review cycle adds value for complex implementations but is overhead for straightforward migrations.

## Sharing files across skills requires long-term alignment, not just current similarity
_Source: maturity-invariants-fitness_

Shared reviewer files forced context-agnostic language and conditional criteria. The deeper question is whether consumers will stay aligned long-term — if their needs diverge, the shared file becomes a constraint. Prefer independent copies with occasional manual sync over forced generalization when alignment is uncertain.

## Convention files must be loaded by all consumers, not just producers
_Source: maturity-invariants-fitness_

Consumers that read artifacts need the convention definitions to correctly interpret format and semantics, even if they don't produce the artifacts. Verify consumer lists end-to-end during planning, not just implementation.

## Report/output templates and analysis steps are a coupled pair
_Source: maturity-invariants-fitness_

Adding analysis steps without updating the output template creates a gap where agents improvise. Any plan that adds analysis steps should include a corresponding template update task.

## Blast radius analysis should be standard for shared reference file changes
_Source: maturity-invariants-fitness_

Before modifying shared reference files, map all consumers with a codebase exploration agent. This prevents both over-reach (changing files that should stay independent) and under-reach (missing consumers that need updates).

## Pointer stubs preserve navigability when extracting shared content
_Source: refine-plan-shared-loop_

When refactoring a skill to reference shared infrastructure, keep removed sub-steps as 1-sentence pointer stubs rather than deleting them entirely. This preserves lettering continuity (a-m) and top-to-bottom scannability. Fully removing steps creates confusing gaps that break the reader's mental model.

## Multi-file review skills need explicit file-matching protocols
_Source: slice-quality-and-health_

When a review skill operates on scattered files across directories (not a single file/directory), define a file-matching protocol: filename prefixes on reviewer issues, editor inference fallback for missing prefixes, and a manifest listing all working copy paths. The iteration loop's single-file/directory convention doesn't cover this natively.

## Signal tracking algorithms need precise trigger conditions
_Source: slice-quality-and-health_

Trend detection language like "trending upward" is ambiguous for agents. Specify exact conditions (e.g., "strictly increasing across all 3 data points: a < b < c") with explicit non-triggers. Without precision, different agent runs will interpret the same instruction differently.

## Skill-file-only quests need manual scope for complete-slice
_Source: slice-quality-and-health_

Quests that modify only skill files (outside the repo, in ~/.claude/skills/) don't produce standard implementation/ artifacts. The auto-detect heuristic won't find them. Pass the scope explicitly when running /complete-slice for such quests.

## Shared reference files with placeholders enable partial consolidation
_Source: architecture-quality_

When files differ only in framing (e.g., "reviewing a plan" vs "reviewing code"), use a shared file with a `{placeholder}` that each consumer fills in. This keeps the substantive content (evaluation criteria, protocols) in one place while preserving context-specific framing. Better than full duplication or forced uniformity.

## Shared orchestration skeletons need explicit parameter interfaces
_Source: architecture-quality_

When extracting a shared pattern (like an iteration loop), define how consumers plug in their specifics: a "Loop Parameters" section listing reviewer list, exit criteria, editor prompt path, etc. Without a concrete interface contract, "use the shared loop" is too vague for implementing agents.

## In-place editing with backup beats working copies for referenced files
_Source: architecture-quality_

Files referenced by other artifacts (CLAUDE.md, decisions, plans) should be edited in-place with a timestamped backup, not copied to a working directory. Working copies create ambiguity about which version is canonical. Plans are different — nothing references them mid-refinement, so `-refining` copies are safe.

## Shared references need a consolidation criterion and extension policies
_Source: decisions-and-expertise_

When moving duplicated files to a shared location, use "will these stay unified long-term?" as the criterion — not just current similarity. Each shared reference consumed by multiple skills needs an extension policy (additive fields safe, format changes require updating all consumers). This prevents breaking downstream consumers when conventions evolve.

## Loading protocols belong in the convention file, not in each consumer
_Source: decisions-and-expertise_

When multiple skills need to load the same data (e.g., decisions/), define the loading algorithm once in the convention file and have each skill reference it. The original plan duplicated the algorithm across 9 skills; reviewers caught this and proposed the Loading Protocol abstraction.

## Downstream consumer goals should inform upstream planning
_Source: decisions-and-expertise_

When work has known downstream consumers, read their goal files during planning and refinement. This caught missing decision readers, absent extension policies, and unclear dependency terms that would have required rework later.

## Auto-detect conditions must account for optional workflow files
_Source: 07-complete-slice_

Don't require optional files (like after-implementation-fixes-and-polish.md) in auto-detect logic. Use the minimal definitive set (plan-refined + implementation/ content). Clean implementations won't produce every optional artifact.

## Cross-project tool learnings should persist in user memory
_Source: 07-complete-slice_

When learnings are about general-purpose tools (not project-specific), save them to the user's auto memory system. The agent gets smarter across projects over time.

## Research and review artifacts belong in the slice directory, not /tmp/
_Source: 06-create-plan_

Moving research from /tmp/plan-research/ to the slice's research/ directory and review iterations to refinement/ and implementation/ means artifacts persist across sessions. The check-before-research pattern (project + scope level) prevents duplicate work. Required updating 10 files across refine-plan and implement-plan.

## Interactive Q&A produces better plans than draft-then-present
_Source: 06-create-plan_

Conversation-driven planning (restate goal → propose phases → per-phase deep dive → readiness gate) with AskUserQuestion gates between stages prevents the agent from charging ahead with assumptions.

## Plan format convention should be documented explicitly
_Source: 06-create-plan_

Having plan-format.md as a shared reference means the format is explicit. Both the author (create-plan) and consumers (refine-plan, implement-plan) reference the same convention.

## End-to-end verification is the defining trait of a vertical slice
_Source: 05-define-slices_

Each slice must deliver a complete flow verifiable by actually running the code. The goal.md template includes a Verification section for live end-to-end testing — what a human would do to convince themselves it works. Slices that can't be verified this way should be merged or redefined.

## Cross-skill reference file dependencies work but are fragile
_Source: 05-define-slices_

Referencing another skill's reference files (e.g., define-architecture's guidance.md for CLAUDE.md format) saves size but requires SKILL.md to explicitly instruct reading both files. Consider a shared reference file for formats used by multiple skills.

## Skills that propose tools/libraries need a research step
_Source: 04-define-architecture_

When a skill drafts content with specific tool names, library versions, or framework recommendations, the model defaults to training data which may be stale. Spawn a sub-agent to WebSearch current versions and alternatives before drafting. Applies to any skill that proposes a tech stack or version-pinned configuration.

## Reference file splitting keeps skills maintainable
_Source: 04-define-architecture_

Split reference material into focused, purpose-specific files rather than one large reference. SKILL.md loads only what it needs at each step. This also enables lazy loading (e.g., formats.md deferred to the state write-back step).

## Re-load reference files before point of use in long sessions
_Source: 04-define-architecture_

After a long interactive session, reference files loaded early may have been pushed out of effective context. Re-load key references at the step that uses them (e.g., guidance.md before CLAUDE.md update).

## Graceful stop needs case-by-case state handling
_Source: 04-define-architecture_

Each graceful stop scenario needs its own state.md string and flow-log behavior. "No files written" should not touch state at all; partial work should list exactly what was written.
