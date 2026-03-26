## Issues

**[CRITICAL]** start-epic: fundamental concept mismatch with epic:activate not addressed in plan

The plan says `start-epic` uses a single mutation (`epic:activate`), but the current `start-epic` skill does far more than just activate: it resolves epics by scanning directories for specific states (proposal-pending, needs-architecture-proposal), checks for an already-active epic, handles architecture proposal review with multi-step user approval, writes `approved.md`, creates the epic's `architecture/` directory by merging proposal files with top-level architecture, and THEN renames to `__active__`. The CLI's `epic:activate` requires `slices-refined` status per the important codebase context. This is a fundamental mismatch -- the plan's Phase 1 tasks say "Replace state.md/activity-log.jsonl writes -- CLI handles via `epic:activate`" but `epic:activate` likely cannot handle the full start-epic workflow (proposal review, approval gate, architecture directory creation, rename). The plan needs to either: (a) identify which CLI commands map to each sub-step of start-epic (e.g., `epic:show` for prerequisite checks, a separate command for approval, etc.), or (b) explicitly acknowledge that start-epic's approval/architecture-merge workflow remains skill-owned and only the final state transition uses `epic:activate`, or (c) note that new CLI commands may be needed.

Resolution: CODEBASE_EXPLORATION
Research: Check `goodplan schema --command epic:activate --json` output and the state machine transition tables to understand what `epic:activate` actually requires and returns. Determine if the current start-epic workflow (proposal-pending -> approved -> active) maps to `epic:activate` or requires intermediate CLI commands.

---

**[CRITICAL]** start-epic: plan eliminates architecture directory creation but doesn't specify replacement

The current start-epic (Step 5c) creates the epic's `architecture/` directory by merging architecture-proposal files with top-level architecture. The plan says "Replace `mkdir -p .project/epics/<name>/architecture/` with paths from `epic:activate` response" but this is a complex multi-step merge operation (copy `_overview.md`, merge `<subsystem>-changes.md` with top-level files, rename `new-<subsystem>.md` files, copy unmodified top-level files). This is LLM-owned markdown content -- it should stay as direct skill work. The plan conflates directory creation (which the CLI handles) with content assembly (which the skill handles). The task needs to clarify: the `mkdir -p` is eliminated because the CLI creates the directory, but the content merging/copying logic stays in the skill.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** explore: plan references `decision:create --json` but this command doesn't exist in cli-interaction.md

Phase 2 task for explore says "Replace `mkdir -p .project/decisions/` with `decision:create --json` (established in slice 03)." The cli-interaction.md convention doc does not mention a `decision:create` command. Decisions are LLM-owned markdown files written directly by the skill. The current explore skill creates decisions via `mkdir -p .project/decisions/` and then writes markdown with the Write tool. Unless `decision:create` was added in slice 03, this task item is incorrect. Either verify the command exists via schema, or keep decision writing as direct skill behavior (mkdir + Write tool) which is consistent with the "LLM-owned markdown" data ownership model.

Resolution: CODEBASE_EXPLORATION
Research: Check `goodplan schema --json` for a `decision:create` command. If it doesn't exist, the plan task should be corrected to keep `mkdir -p .project/decisions/` as skill-owned directory creation.

---

**[IMPORTANT]** Reference files with eliminated patterns are not inventoried

The plan mentions "Update reference files if they contain eliminated patterns" for Phase 2 and Phase 3, but doesn't specify WHICH patterns to look for in WHICH files. My codebase exploration found:

1. `explore/references/explore-logic.md` line 1: references `state-and-activity-formats.md` (eliminated reference)
2. `explore/references/explore-logic.md` lines 9-14: uses `__active__` prefix paths in Scope Path Mapping table (should use CLI-provided paths or at least note that paths come from CLI responses)
3. `create-architecture/references/guidance.md` lines 56-63: contains 6 references to `state.md` updates and `activity-log.jsonl` appends in the Early Stop section (all eliminated patterns)

The plan should enumerate these specific hits so the implementer doesn't miss them. The create-architecture guidance.md Early Stop section is particularly important because it's 8 lines of detailed state.md/activity-log.jsonl instructions that all need rewriting.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** audit-architecture: plan says "read-only, no CLI mutation needed" but skill currently writes to state.md and activity-log.jsonl

The plan says "audit is read-only, so just eliminate these (no CLI mutation needed)" for state.md/activity-log.jsonl writes. But the current audit-architecture SKILL.md Step 7 explicitly appends to activity-log.jsonl and updates state.md on completion. These writes track that an audit was performed -- they're useful provenance. The plan should decide: (a) truly eliminate all state tracking for audits (losing the audit provenance trail), or (b) use a CLI mutation command that records audit completion. The cli-interaction.md says "CLI appends automatically on every mutation" -- if audit doesn't trigger a CLI mutation, there's no activity log entry. This is a workflow design decision that should be explicit in the plan.

Resolution: USER_INPUT

---

**[IMPORTANT]** explore: skip flow (Step 3) needs CLI mapping

The explore skill's Step 3 (Handle Skip) writes `explore-skipped.md`, updates `state.md`, and appends to `activity-log.jsonl`. The plan says to use `submit-explore` to complete, but skip is a different path -- is there a `skip-explore` command, or does `submit-explore` handle the skip case? The plan doesn't address this distinct path. The cli-interaction.md section on skip paths (mentioned in codebase context) notes "skip paths exist in state machine" but the plan doesn't map them to specific CLI commands.

Resolution: CODEBASE_EXPLORATION
Research: Check `goodplan schema --json` for skip-related commands for explore (e.g., does `submit-explore` accept a skip payload, or is there a separate skip command?). Also check the state machine transition tables for the skip transition.

---

**[IMPORTANT]** create-architecture: graceful stop handling needs complete redesign for CLI

The current create-architecture has an elaborate graceful stop system (Step 8e) with 6 different stop cases, each writing different state.md and activity-log.jsonl content. The plan says "Replace graceful stop state.md writes -- CLI handles state, stops just leave artifacts in place." But this is an oversimplification. The current graceful stop behavior serves two purposes: (1) state tracking (which CLI handles) and (2) resumability guidance (which the skill needs to preserve). The plan should specify: after migration, how does a resumed session know where the previous run stopped? The answer is likely "check CLI status + check which files exist" but the plan should say this explicitly, especially since the guidance.md reference file contains detailed stop-case logic (lines 54-63) that all needs rewriting.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Verification approach is too indirect -- uses grep checks instead of invocation tests

All four phases use `grep` commands as the primary verification (checking for presence/absence of string patterns in skill files). This verifies the text was rewritten correctly but not that the skill would actually work. Phase 4 partially addresses this with "manual validation traces" and "end-to-end smoke test," but the smoke test only exercises CLI commands in isolation -- it doesn't test that the skills correctly assemble those commands. A more direct verification would be: for at least one skill, do a dry-run walkthrough (invoke the skill on a test project and verify it uses CLI commands correctly). The Phase 4 smoke test is good but should be Phase 4's Expected Behavior section, not buried in tasks.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** explore-logic.md Scope Path Mapping table uses hardcoded `__active__` paths

The `explore/references/explore-logic.md` file's Scope Path Mapping table hardcodes paths like `.project/epics/__active__<name>/research/`. After migration, the explore skill should get paths from CLI command responses (e.g., `start-explore --inline` returns `paths`). The plan should explicitly call out updating this table to note that paths come from CLI responses, or at minimum add a note that the `__active__` prefix is an implementation detail managed by the CLI.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Plan doesn't specify how sub-agent context bundling interacts with existing sub-agent patterns

The plan correctly notes that explore and refine-architecture use `start-*` commands with `--inline` for sub-agent context bundling. But for audit-architecture, the current skill spawns gap exploration sub-agents with their own self-contained prompts (from `references/sub-agent-prompts.md`). The plan says audit is "read-only (no state transitions)" -- so should audit's sub-agents use `start-*` commands for context, or do they remain pure codebase-exploration agents that don't need CLI context? The answer is probably "they stay as-is since they only read codebase files, not state," but the plan should be explicit.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** create-architecture: plan doesn't address Step 0 `ls -d` for active epic detection

The current create-architecture uses `ls -d .project/epics/__active__*/` in Step 0 for architecture output path resolution. The plan's task list says to use `goodplan status --json` and `epic:define-architecture` but doesn't explicitly mention replacing this Step 0 detection pattern. The implementer should use `goodplan status --json` -> `.activeEpic` for this, but it should be stated.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** refine-architecture: plan mentions `mkdir -p .project/architecture-refining/` replacement but this is a skill-owned working directory

The plan says "Replace `mkdir -p .project/architecture-refining/` with paths from CLI `epic:refine-architecture` response." But `architecture-refining/` is a working directory for the iteration loop (stores round directories, merged feedback, activity-log). If the CLI response provides this path, fine. But if not, this directory creation should remain skill-owned (like `completion/` in slice 03, or `audits/` in audit-architecture). The plan should verify via `goodplan schema --command epic:refine-architecture --json` whether the response includes an `architecture-refining` path.

Resolution: CODEBASE_EXPLORATION
Research: Check `goodplan schema --command epic:refine-architecture --json` to see if the response includes working directory paths.

---

**[MINOR]** Phase 4 smoke test is brittle -- requires specific state transitions in sequence

The Phase 4 smoke test steps 1-9 assume all transitions succeed in sequence. If any step fails (e.g., `submit-explore` requires a payload the test doesn't provide), subsequent steps are blocked. The test should note expected payloads for submission commands (e.g., `submit-refine-architecture` requires scores).

Resolution: DIRECTLY_ACTIONABLE

## Score: 5/10

The plan has the right overall structure (phased by complexity, following slice 03 patterns) and correctly identifies the core migration pattern. However, it has two critical gaps: the `start-epic` / `epic:activate` concept mismatch and the architecture directory creation confusion. It also has several important gaps around reference file inventories, skip flow handling, graceful stop redesign, and audit state tracking decisions. The plan reads as a high-level migration checklist rather than a detailed implementation guide -- the tasks say "replace X with Y" without verifying that Y actually handles what X does. To reach 9+: resolve the start-epic/epic:activate mismatch, inventory all reference file patterns to update, address skip flows explicitly, clarify graceful stop behavior post-migration, and decide on audit state tracking.

## Summary
- Critical: 2
- Important: 7
- Minor: 4
