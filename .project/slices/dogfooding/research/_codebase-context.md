# Codebase Context: Dogfooding Slice

## Fresh Documentation (reliable references)

### Epic Architecture (two-layer model)
- **`.project/epics/__active__skills-cli-integration/architecture/_overview.md`** — Epic-level architecture proposal. Describes the full plan: CLI gap filling, convention doc, core skill validation, mechanical rollout, dogfood. Updated 2026-03-20, unchanged since. Reliable as the strategic frame.
- **`.project/epics/__active__skills-cli-integration/architecture/cli-interaction-conventions.md`** — Detailed spec for CLI interaction patterns. Updated 2026-03-24 (today's date range). This is the **epic target architecture** that skills are being migrated to.

### Shared References (installed in skills)
- **`skills/_shared/references/cli-interaction.md`** — The **installed** convention doc that skills actually load. Last updated 2026-03-24 in `[core-skill-val] Phase 3` and then `[plan-exec-skills] Integration review: fix stdin convention consistency`. This is the most critical reference for dogfooding — it defines every CLI interaction pattern skills must follow. **Fresh and authoritative.**
- **`skills/_shared/references/state-and-activity-formats.md`** — Updated 2026-03-23. Describes legacy state.md/activity-log formats that skills should no longer use. Relevant for the Phase 5 grep verification.

### Project-Level Architecture
- **`.project/architecture/_overview.md`** — System architecture (4-layer stack). Last updated 2026-03-24 in `[show-status-enrich] Integration review fixes`. Reflects all subsystems at "Developing" maturity with fitness functions in place. **Fresh.**
- **`.project/conventions.md`** — Tech stack, repo structure, code style. Updated 2026-03-24 in `[plan-exec-skills] Complete slice`. Lists all 15 skills (including migrate stub) and the install script convention. **Fresh.**
- **`.project/learnings.md`** — 40+ learnings accumulated across all slices. Updated 2026-03-24. Contains critical dogfooding-relevant learnings:
  - "CLI command syntax in skills must be concrete" (from slice 05)
  - "`__active__` prefix is a pre-CLI skill convention — CLI paths don't use it" (from slice 03)
  - "Entity paths are flat, not nested under parent entities" (from slice 03)
  - "Skills use slash commands, not CLI commands" (from slice 07)

## Potentially Stale Documentation

### Project-Level API Docs
- **`.project/architecture/state-machine-api.md`**, **`rpc-layer-api.md`**, **`commands-api.md`**, **`data-layer-api.md`** — Last updated 2026-03-23 (`[state-cmd-tracer] Phase 1`). Code in `src/commands/` was updated 2026-03-24 (`[show-status-enrich] Phase 2`), and `src/core/state/` last changed 2026-03-23 (`[integration-test] Phase 3`). These are **approximately current** but may lag behind the latest show/status enrichments. The epic-level architecture docs in `architecture/` are more authoritative for skills-cli-integration work.

### Epic Architecture Detail Docs
- **`cli-changes.md`** (2026-03-23), **`commands-api.md`** (2026-03-23), **`context-api.md`** (2026-03-23), **`data-layer-api.md`** (2026-03-23) — All from the epic architecture directory. Written during epic setup, not updated since. The convention doc (`cli-interaction.md`) evolved past these in slices 03-05. **Use cli-interaction.md as ground truth; these are background context only.**

## Recent Development Activity

### Skills (high churn, recently stabilized)
All 15 skills were migrated in slices 03-05, completing on 2026-03-24:
- **Slice 03** (core-skill-val): create-epic, complete, project-status migrated. Convention doc written.
- **Slice 04** (explore-arch-skills): explore, create-architecture, refine-architecture, audit-architecture, start-epic migrated.
- **Slice 05** (plan-exec-skills): create-plan, refine-plan, implement-plan, create-slices, refine-slices, migrate migrated. **Final stdin convention consistency fix** applied in integration review.

The most recent skill changes (all on 2026-03-24) fixed stdin convention consistency — `stdin: "" |` vs `echo '{}' |` patterns. This is exactly the kind of issue dogfooding should catch more of.

### CLI Source (stable)
- `src/commands/` last changed: 2026-03-24 (show-status enrichment)
- `src/core/state/` last changed: 2026-03-23 (fitness functions)
- No CLI code changes during skill migration slices 03-05 — skills adapted to the existing CLI surface.

### Install Infrastructure
- `scripts/install-skills.sh` last changed: 2026-03-23 (skills-migrate slice). Maps old and new skill names to correct install locations.
- Test suite: **941 tests, all passing** as of current HEAD.

## Key Decisions and Constraints

### From PR/Commit History
1. **Skills installed in-project for dogfooding** (plan decision): `.claude/skills/` in the target repo, not user-level, so goodplan's own old-format skills remain usable in its own repo.
2. **stdin convention settled**: After integration review in slice 05, the canonical form is `echo '{"key":"value"}' | goodplan command --json` for mutations. Skills must not use `stdin: "" |` prefix notation.
3. **`__active__` prefix**: The CLI does NOT create `__active__`-prefixed directories. However, the plan references `__active__` paths in Phase 4 (second epic). This is a known pre-CLI convention that skills manage. The plan's Phase 4 task "Rename `epics/llm-judge/` to `epics/__active__llm-judge/`" may be inconsistent with CLI behavior — **flag during refinement**.
4. **Flat entity paths**: Slices at `.project/slices/<name>/`, not nested under epics. Quests at `.project/quests/<name>/` (plan references `.project/side-quests/` which may be incorrect — **flag during refinement**).

### From Decisions Directory (18 active decisions)
Key decisions relevant to dogfooding:
- `cli-as-workflow-engine` — CLI is the single interface to .project/ state
- `orchestrator-subagent-split` — Skills split into orchestrator (user-facing) and sub-agent (CLI-driven) roles
- `skill-cli-integration` — Concrete CLI commands in skill prompts
- `entity-namespaced-commands` — `epic:show`, `slice:plan`, etc.
- `state-command-markdown-exclusion` — `goodplan state` excludes markdown content (2026-03-23, most recent decision)

## Areas of Stability vs Churn

| Area | Status | Notes |
|------|--------|-------|
| CLI src/commands/ | Stable | No changes during skill migration. Last change: show-status enrichment. |
| CLI src/core/state/ | Stable | Last change: fitness functions (2026-03-23). Pure reducer, 37 handlers. |
| CLI src/core/data/ | Stable | Fitness functions all passing. |
| CLI src/core/rpc/ | Stable | Tested indirectly via integration tests. |
| CLI src/core/context/ | Stable | Budget-based inlining. Peer module. |
| skills/ | Recently stabilized | All 15 migrated as of 2026-03-24. stdin consistency fix was the last change. |
| skills/_shared/references/cli-interaction.md | Recently stabilized | Evolved across slices 01-05. Now authoritative. |
| .project/conventions.md | Fresh | Updated with each slice completion. |
| .project/learnings.md | Fresh | 40+ learnings, updated with each slice. |
| scripts/install-skills.sh | Stable | Handles old-to-new skill name mapping. |
| Test suite | Green | 941 tests, 84 files, all passing. |

## Dogfooding-Specific Risks

1. **Path conventions**: Plan references `__active__` prefixes and `.project/side-quests/` — these may not match CLI behavior. Cross-reference with `resolveEntityDir` in data layer.
2. **First real external project**: The CLI has only been tested on its own `.project/`. Different project structures may surface edge cases in `assembleState()`, path resolution, or context bundling.
3. **Skill interaction sequences**: Individual skills were migrated and smoke-tested, but full multi-skill workflow sequences (explore -> architecture -> slices -> plan -> implement -> complete) have not been exercised end-to-end with the CLI-integrated versions.
4. **Convention doc completeness**: The convention doc evolved iteratively. Dogfooding may reveal patterns that are used in practice but not documented, or documented patterns that don't work as specified.
5. **Install script for in-project skills**: The plan copies skills to `.claude/skills/` in the target repo. The install script targets `~/.claude/skills/`. Manual copy may miss skills or get structure wrong.
