# Architecture Alignment Review — Round 2

## Overall Assessment

Score: 9/10

Round 1 raised 2 critical, 5 important, and 4 minor issues. The editor addressed all critical and most important issues effectively. The `begin()` factoring was removed from slice 02. The `context?`/`paths?` fields were reframed as partial implementation work. The `state` command routing is now explicit. Slices 04->05 are now sequential with documented rationale. Slice 03 scope was corrected to allow CLI changes if validation reveals gaps. Test state setup instructions were added to slices 04 and 05 verification sections. Remaining issues are minor.

## Critical Issues

None.

## Important Issues

### 1. sequencing-refining.md: Slice 05 `create-slices` uses `epic:define-slices` on `activated` status — wrong precondition

Slice 05 verification step 1 says: "On a test epic in `activated` status, run `/create-slices`." But `epic:define-slices` maps to `BEGIN_SLICING`, which requires the epic to be in `architecture-refined` status (per transition-tables.md). An `activated` epic has already passed through slicing and activation. The `create-slices` and `refine-slices` skills exercise epic-level phase transitions (defining-slices, refining-slices) that occur *before* activation, not after.

This is architecturally significant because it means the verification step would always fail with `STATE_INVALID_TRANSITION`. The test state setup needs to advance the epic only to `architecture-refined`, not `activated`.

**Recommendation:** Fix slice 05 verification step 1 to: "On a test epic in `architecture-refined` status (setup: advance through explore and architecture phases), run `/create-slices`." Similarly, step 2 for `refine-slices` should use `slices-defined` status, not an activated epic.

### 2. goal-refining.md [02-show-status-enrichment]: Semver checking layer placement could be more precise

Round 1 flagged that semver checking crosses multiple layers (issue #7). The current text says "Semver compatibility checking is a Commands-layer concern in the main dispatch path (e.g., `src/commands/main.ts` or `global-args.ts`). It reads `project.json.version` via `assembleState()`/`loadState()`." This is improved from round 1, but the mention of `assembleState()`/`loadState()` implies the check loads the full state tree just for a version number. The architecture specifies `loadState()` for this (cached, cheap), not `assembleState()` (full scan). Specifying `loadState()` only would be more precise and avoids implying a full assembly on every command.

**Recommendation:** Change to: "reads `project.json.version` via `loadState()` — a legitimate Commands-to-Data-Layer read path."

## Minor Issues

### 3. goal-refining.md [04-exploration-architecture-skills]: `start-*` commands noted as "always JSON" but `--json` still appears on `submit-*` commands

Round 1 issue #8 flagged `--json` on `start-*` commands. The editor added the note "(start-* commands always output JSON; --json flag is not needed)" which is correct. However, the goal still shows `goodplan submit-explore --epic <name> --json` and similar `submit-*` invocations with `--json`. Per the Commands API, `submit-*` commands are mutations that support `--json` for structured output, so `--json` is correct on `submit-*`. The inconsistency is only cosmetic — the parenthetical note clarifies the distinction. No action needed, but the note could be generalized: "`start-*` commands always return JSON; `submit-*` and entity mutation commands require `--json` for structured output."

### 4. goal-refining.md [06-dogfooding]: Unbounded scope still present

Round 1 issue #10 recommended a time-box or issue-count cap for dogfooding. The current text adds "Focus on cross-skill transitions and emergent issues" and "Exit criteria: One full workflow cycle end-to-end; critical issues fixed; non-critical issues logged as deferred work." This is a meaningful improvement — the exit criteria provide a natural bound. The scope boundary still says "CLI bug fixes and gap filling discovered during dogfooding" without a cap, but the exit criteria effectively constrain it. Acceptable as-is.

### 5. goal-refining.md [01-state-command-convention-doc-tracer]: `state --json` output is a public API contract — not noted as such

The `state` command exposes the `assembleState()` tree as JSON. The epic architecture's `cli-changes.md` documents the unwrapped serialization format (DirectoryEntry -> plain object, JsonEntry -> unwrapped T, etc.). This format constitutes a public API contract — changes to the internal `StateEntry` type structure would break jq queries in all 15 skills. The slice goal should note this contract explicitly so the implementer treats the serialization format as a stable interface, not an implementation detail.

**Recommendation:** Add to slice 01 behavior or scope: "The `state` command's JSON output is a public API contract — internal state tree type changes must maintain backward compatibility with the unwrapped serialization format defined in `cli-changes.md`."

## Round 1 Issue Resolution Summary

| Round 1 Issue | Status | Notes |
|---|---|---|
| #1 `begin()` factoring (CRITICAL) | Resolved | Removed from slice 02 |
| #2 `context?`/`paths?` already exist (CRITICAL) | Resolved | Reframed as "implement `paths?` field on BeginResult and SubmitResult (per architecture spec)" |
| #3 "Three deliverables" count | Resolved | Fixed to "Four deliverables" |
| #4 `state` command subsystem placement | Resolved | Added explicit routing description |
| #5 04/05 parallelism | Resolved | Made sequential with rationale: "Sequential after 04 so convention doc updates from 04 inform 05" |
| #6 CLI changes out of scope in 03 | Resolved | Reframed: "CLI code changes are not expected but are in scope if validation reveals gaps" |
| #7 Semver layer crossing | Partially resolved | Layer specified but `assembleState()` reference still imprecise (see issue #2 above) |
| #8 `--json` on `start-*` commands | Resolved | Parenthetical note added clarifying `start-*` always returns JSON |
| #9 `migrate` stub counted | Resolved | Noted as "Stub skill — zero-effort migration" and excluded from verification |
| #10 Unbounded dogfooding scope | Resolved | Exit criteria added |
| #11 Convention doc location | Resolved | Relationship to architecture spec clarified |
