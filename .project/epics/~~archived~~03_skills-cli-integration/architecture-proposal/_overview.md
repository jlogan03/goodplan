# Architecture Proposal: skills-cli-integration

## Summary

Update all ~15 goodplan workflow skills to use the `goodplan` CLI binary for all `.project/` state operations. Skills currently read/write JSON/JSONL files directly; after this epic, all structured state access goes through CLI commands while free-form markdown content continues to be written directly by the LLM into CLI-created directories.

## Motivation

The goodplan CLI was built to be the single interface to `.project/` state for both humans and LLMs (decision: `cli-as-workflow-engine`). However, the skills that orchestrate workflows still bypass it — reading entity JSON directly, appending to activity-log.jsonl manually, and maintaining their own state.md file. This means:
- The CLI's validation, transition enforcement, and deterministic serialization are bypassed
- State can drift between what the CLI sees and what skills wrote
- The CLI hasn't been dogfooded on a real project, so ergonomic gaps are undiscovered

## What Changes

### CLI Enhancements (gaps to fill)
See `cli-changes.md` for details:
1. **`goodplan state --json --query`** — expose the full `assembleState()` tree as JSON. Agents use `--query` (jq) to select exactly what they need. This is the keystone change — it gives agents access to every piece of data in `.project/` through a single command, replacing the need for many specialized list/filter commands.
2. Enrich `show` commands with scope-level artifact existence data (ergonomic shortcut for workflow phase detection)
3. Enrich `status --json` with file path arrays alongside counts (ergonomic shortcut for orientation)
4. Add `--archive` flag to complete commands for directory renaming
5. Semantic versioning with three-way compatibility checking (CLI ↔ project data ↔ skills)

### Skill Convention Doc (new shared reference)
See `cli-interaction-conventions.md` for the full spec:
- How skills detect and require the CLI binary
- Orchestrator vs sub-agent interaction patterns (per decision: `orchestrator-subagent-split`)
- Concrete CLI command strings embedded in skill prompts (per decision: `skill-cli-integration`)
- Entity-namespaced commands (per decision: `entity-namespaced-commands`)
- Error handling (exit codes, structured error JSON)
- What skills must NOT do (direct JSON/JSONL access, state.md, activity-log appending)

### Skill Updates (~15 files)
Each skill file updated to:
- Replace direct `.project/` file reads with CLI query commands (`status --json`, `show --json`, `list --json`)
- Replace direct JSON/JSONL writes with CLI mutation commands (entity-namespaced)
- Remove state.md reads/writes (eliminated — `status --json` replaces)
- Remove activity-log.jsonl appending (CLI handles automatically on mutations)
- Remove file-existence state machine checks (CLI's enriched `show --json` replaces)
- Write markdown content only into directories provided by CLI command responses (`paths` in results)
- Embed concrete `goodplan` command invocations in prompt text (not generic instructions)

### state.md Elimination

`state.md` is eliminated entirely. Skills currently use it as a 4-section file (Current Phase, Active Slice, Work Stack, Next Step). The CLI's `project.json` replaces this:
- **Active Slice** → `project.json.activeSlice` via `status --json`
- **Active Quest** → `project.json.activeQuest` via `status --json`
- **Active Epic** → `project.json.activeEpic` via `status --json`
- **Work Stack** → eliminated (one active slice + one active quest at a time, enforced by CLI guards)
- **Current Phase** → derived from entity status fields in `show --json`
- **Next Step** → derived from `status --json` recommendations array

## What Doesn't Change

- The CLI's 4-layer architecture (Commands → RPC → State Machine → Data Layer)
- The data ownership model (conventions.md § Data Ownership)
- Free-form markdown content writing (LLM writes architecture, research, brainstorm, plans)
- Skill interaction patterns (skills are prompts that tell Claude what to do)
- Dual representation (goal.md + entity.json coexist — CLI stores structured metadata, LLM writes human-readable markdown alongside)

## Key Constraints

1. **CLI conforms to skills, not the reverse**: If the CLI can't handle a workflow encoded in a skill, the CLI changes — not the workflow. Exception: skills attempting something invalid per the documented workflow.
2. **CLI required**: Skills fail fast if `goodplan` binary is not found. No graceful fallback.
3. **Concrete commands in prompts**: Skill prompts must contain actual `goodplan` command invocations, not generic "call the CLI" instructions. LLMs follow system-level instructions faithfully (decision: `skill-cli-integration`).
4. **Convention doc first**: Write `_shared/references/cli-interaction.md` before updating any skills. Validate on 2-3 core skills, then mechanical rollout.

## Approach

1. **CLI gap filling** — Implement missing commands and enrichments
2. **Convention doc** — Write `_shared/references/cli-interaction.md` defining all interaction patterns
3. **Core skill validation** — Update `create-epic`, `project-status`, and `complete` to use CLI. These exercise the broadest range of interactions.
4. **Mechanical rollout** — Update remaining ~12 skills against the established patterns
5. **Dogfood** — Use the updated skills on a real project to surface remaining gaps
