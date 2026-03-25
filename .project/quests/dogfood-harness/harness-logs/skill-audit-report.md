# Skill Audit Report: Direct .project/ Access Violations

**Date**: 2026-03-25
**Auditor**: Claude (automated)
**Scope**: All skills under `skills/` — SKILL.md files and `references/*.md` files
**Skipped**: `skills/_shared/references/cli-interaction.md` (convention doc itself)

---

## Summary

| Skill | Status |
|---|---|
| audit-architecture | CLEAN |
| complete | CLEAN |
| create-architecture | CLEAN |
| create-epic | CLEAN |
| create-plan | CLEAN |
| create-slices | CLEAN |
| explore | CLEAN |
| implement-plan | CLEAN |
| migrate | CLEAN |
| project-status | 2 violations |
| refine-architecture | CLEAN |
| refine-plan | CLEAN |
| refine-slices | CLEAN |
| start-epic | 9 violations (pre-CLI skill, not yet migrated) |
| _shared/references/state-and-activity-formats.md | Already deprecated (1 note) |
| _shared/references/epic-conventions.md | 1 violation |
| _shared/references/codebase-context-discovery.md | 1 violation |
| _shared/references/iteration-loop.md | 1 violation |

**Total violations**: 14 (9 from start-epic alone)

---

## Per-Skill Reports

### audit-architecture
**CLEAN**

Uses `goodplan state --json --query` for activity-log access (line 74). Reads architecture `.md` files directly (allowed — LLM-owned markdown). Uses `mkdir -p .project/side-quests/<name>` and `mkdir -p .project/audits` (line 189, 198) — these are creating directories for LLM-owned artifacts (side quest goals, audit reports), which is acceptable under "writing LLM-owned markdown into directories."

### complete
**CLEAN**

All structured data access goes through CLI (`goodplan state --json --query`, `goodplan slice:show`, `goodplan slice:list`, `goodplan slice:complete`). Line 401 explicitly states: "No manual state.md writes or activity-log appends needed." Uses `stat` on `completion/learnings.md` (line 82-84) — this is detecting LLM-owned completion artifacts, not inferring entity status from `.project/` structure. Uses `mkdir -p <scope-dir>/completion/` (line 145) — skill-owned LLM artifact directory, explicitly noted as permitted.

### create-architecture
**CLEAN**

Uses CLI for all state transitions (`goodplan status --json`, `goodplan epic:define-architecture`, `submit-architecture`). Uses `ls` on brainstorm/research/prototypes directories (line 85) — checking for LLM-owned exploration artifacts, not inferring entity status. Uses `mkdir -p $ARCH_DIR/` (line 211) and `mkdir -p .project/architecture/` (line 62) — creating directories for LLM-owned architecture files after CLI has set up the entity. Writing scaffold `_overview.md` is writing LLM-owned markdown.

### create-epic
**CLEAN**

All entity creation goes through CLI (`goodplan init`, `goodplan epic:create`, `goodplan epic:show`). Line 86 mentions "This creates `.project/`, `project.json`" — this is documenting what the CLI does, not direct access. Writing `idea.md` and `goal.md` are LLM-owned markdown writes.

### create-plan
**CLEAN**

Uses CLI for scope resolution (`goodplan status --json`), decisions (`goodplan decision:create`), and state transitions (`submit-plan`). All `.project/` reads are LLM-owned markdown (idea.md, conventions.md, architecture/*.md, learnings.md, goal.md, research/). Uses `mkdir -p` only for scope's `research/` (via sub-agents) — LLM-owned artifact directory.

### create-slices
**CLEAN**

Uses CLI for scope resolution, entity creation (`goodplan slice:create`), and state transitions (`submit-slices`). Uses `ls $SLICES_DIR/sequencing.md $SLICES_DIR/*/goal.md` (line 76) — checking for LLM-owned markdown files. Uses `mkdir -p $SLICES_DIR/NN-slice-name/` (line 139) — creating directories for LLM-owned goal.md files. Line 169 documents that `slice:create` creates `slice.json` — this is what the CLI does, not a direct write.

### explore
**CLEAN**

Uses CLI for state transitions (`goodplan epic:explore`, `submit-explore`, `decision:create`). Uses `ls` for scope validation (lines 52, 80-87, 94-95) — checking for LLM-owned exploration artifacts (explore-complete.md, brainstorm/, research/), not inferring entity status from JSON files. Uses `mkdir -p` for research/, brainstorm/, prototypes/ directories — LLM-owned artifact directories.

### implement-plan
**CLEAN**

Uses CLI for state transitions (`submit-implementation`). Uses `mkdir -p` for implementation/ and research/ directories — LLM-owned artifact directories. All `.project/` reads are LLM-owned markdown (architecture/, conventions.md, decisions/). The implementation sub-agent prompt (references/sub-agent-prompts.md line 57-59) correctly instructs reading architecture via `.project/architecture/` `.md` files — this is allowed.

### migrate
**CLEAN** (not yet implemented — stub only)

### project-status
**2 VIOLATIONS**

1. `SKILL.md:127` — `goodplan state --json --query '.epics["__active__<name>"].slices | keys'`
   - **Pattern**: Constructs `.project/` paths using `__active__` prefix convention in state queries
   - **Fix**: The state query itself is fine (uses CLI), but the `__active__` prefix in the query key assumes directory naming convention. The CLI should abstract this — use `goodplan slice:list --json` (already shown at line 96) or query by epic name without prefix.

2. `SKILL.md:137` — `goodplan state --json --query '.epics["__active__<name>"].slices["<slice>"].implementation | keys'`
   - **Pattern**: Same `__active__` prefix assumption in state query path
   - **Fix**: Same as above — the `state --json --query` with `__active__` prefix bakes in directory naming convention. Use entity-based queries instead.

Note: Line 206 mentions `epics/__active__<name>/slices/` in Format B text but this is documentation about where to find `sequencing.md` (LLM-owned markdown) — borderline, but the `__active__` prefix assumption is problematic.

### refine-architecture
**CLEAN**

Uses CLI for all state transitions (`goodplan epic:refine-architecture`, `submit-refine-architecture`). Uses `ls -d $SCOPE_ROOT/architecture-refining/round-*/` (line 120) for resume detection — this is checking skill-owned working directories, not entity status. Uses `mkdir -p` for backup and refining directories — skill-owned working directories.

### refine-plan
**CLEAN**

Uses CLI for state transitions (`submit-refinement`). All file operations are on the working copy (`-refining`/`-refined`) and run directory (`refinement/`). Uses `mkdir -p` for run and research directories — skill-owned working directories.

### refine-slices
**CLEAN**

Uses CLI for state transitions (`submit-refine-slices`). Uses `mkdir -p` for skill-owned working directory. All reads are LLM-owned markdown (goal.md, sequencing.md, architecture/).

### start-epic
**9 VIOLATIONS** — This skill has NOT been migrated to the CLI. It is entirely pre-CLI.

1. `SKILL.md:37` — `ls -d .project/epics/"$NAME"/ 2>/dev/null`
   - **Pattern**: #7 — Using `ls` / file-existence checks on `.project/` to infer entity status
   - **Fix**: Use `goodplan epic:show --epic <name> --json` to check if epic exists

2. `SKILL.md:43` — `ls .project/epics/ 2>/dev/null`
   - **Pattern**: #7 — Using `ls` on `.project/` to list entities
   - **Fix**: Use `goodplan epic:list --json`

3. `SKILL.md:51-76` — Shell `for` loop scanning `.project/epics/*/` directories with file-existence checks (`[ -d "$dir/architecture-proposal" ]`, `[ ! -f "$dir/approved.md" ]`, etc.)
   - **Pattern**: #7 — Using file-existence checks on `.project/` to infer entity status
   - **Fix**: Use `goodplan epic:list --json` and filter by status field

4. `SKILL.md:85` — `ls -d .project/epics/__active__*/ 2>/dev/null`
   - **Pattern**: #7 — Using `ls` to detect active epic via `__active__` directory prefix
   - **Fix**: Use `goodplan status --json` → `.activeEpic`

5. `SKILL.md:99` — `test -f .project/epics/<name>/approved.md && echo "approved"`
   - **Pattern**: #7 — Using file-existence checks to infer entity state
   - **Fix**: Use `goodplan epic:show --epic <name> --json` → check `.status`

6. `SKILL.md:116` — `ls .project/epics/<name>/architecture-proposal/ 2>/dev/null`
   - **Pattern**: #7 — Using `ls` to check for architecture proposal existence
   - **Fix**: Use `goodplan epic:show --epic <name> --json` → check status or artifacts

7. `SKILL.md:289` — `mv .project/epics/<name> .project/epics/__active__<name>`
   - **Pattern**: #9 — Using `mv` to rename `.project/` directories
   - **Fix**: Use a CLI command like `goodplan epic:activate --epic <name> --json`. The entire `__active__` prefix convention should be handled by the CLI, not the skill.

8. `SKILL.md:308-318` — Directly writing to `.project/state.md` and appending to `.project/activity-log.jsonl`
   - **Pattern**: #4 (writing state.md — eliminated) and #5/#11 (writing/appending activity-log.jsonl)
   - **Fix**: Use a CLI command to handle the activation transition. The CLI should manage state.md writes (eliminated) and activity-log appends automatically.

9. `SKILL.md:203` — `Update .project/state.md Next Step to: ...`
   - **Pattern**: #4 — Reading/writing state.md (eliminated)
   - **Fix**: Remove — state.md is eliminated. The CLI's `status --json` provides this information.

### _shared/references/state-and-activity-formats.md
**NOTE** — Already deprecated with clear warning at top. Retained as migration reference. No action needed beyond eventual removal.

### _shared/references/epic-conventions.md
**1 VIOLATION**

1. Lines 76, 103-108, 176, 186 — Documents the `__active__` prefix convention as the mechanism for epic activation, including `mv` rename in the state transition table
   - **Pattern**: #9 — Documents `mv` rename of `.project/` directories as the standard mechanism
   - **Fix**: Update to document that the CLI handles epic activation (once start-epic is migrated). The `__active__` prefix convention documentation should note it's a CLI-internal concern, not something skills manipulate directly. The state transition table (line 176) should reference a CLI command instead of `renames to __active__`.

### _shared/references/codebase-context-discovery.md
**1 VIOLATION**

1. Line 53 — `ls -d .project/epics/__active__*/ 2>/dev/null`
   - **Pattern**: #7 — Using `ls` with `__active__` prefix to detect active epic
   - **Fix**: Use `goodplan status --json` → `.activeEpic.name` to detect the active epic, then construct the path `epics/<name>/architecture/` from the name.

### _shared/references/iteration-loop.md
**1 VIOLATION**

1. Line 30 — `activity-log.jsonl` listed as a file in the run directory structure, and line 43 references checking it for resume detection
   - **Pattern**: #11 — References `activity-log.jsonl` as something to read/write directly (skill-local copy in run directory, not the project-level one)
   - **Fix**: This appears to be a skill-local activity log in the run directory (not `.project/activity-log.jsonl`), which is a different file. However, it's confusingly named — it should be renamed to avoid conflation with the project-level activity-log.jsonl that the CLI manages. If resume detection relies on this file, it should be renamed (e.g., `refinement-log.jsonl` or `iteration-log.jsonl`). NOTE: The refine-architecture SKILL.md (line 122) already notes that "round directory structure provides the same information as the eliminated skill-local activity-log" — this may already be obsolete.

---

## Patterns by Violation Category

| Category | Count | Skills Affected |
|---|---|---|
| #4 — Reading/writing state.md | 2 | start-epic |
| #5/#11 — Writing/appending activity-log.jsonl | 1 | start-epic |
| #7 — Using `ls`/file-existence for entity status | 7 | start-epic (6), codebase-context-discovery (1) |
| #9 — Using `mv` to rename .project/ directories | 1 | start-epic |
| `__active__` prefix in state queries | 2 | project-status |
| Confusing naming of skill-local activity-log | 1 | iteration-loop |
| `__active__` convention documented as skill-manipulated | 1 | epic-conventions |

## Recommendations

1. **start-epic is the critical migration target.** It is the only SKILL.md that has NOT been migrated to the CLI at all. All 9 of its violations stem from being a pre-CLI skill. It needs a corresponding CLI command (e.g., `goodplan epic:activate`) that handles directory renaming, state transitions, and activity-log entries internally.

2. **project-status state queries** use `__active__` prefix in `state --json --query` paths. These should be updated to use entity-name-based lookups once the CLI abstracts away the `__active__` prefix. Low priority — the queries work correctly today.

3. **codebase-context-discovery.md** should use `goodplan status --json` instead of `ls -d .project/epics/__active__*/`. This is a shared reference used by implement-plan and refine-plan.

4. **epic-conventions.md** should be updated to note that `__active__` prefix management is a CLI-internal concern once start-epic is migrated. The state transition table should reference CLI commands.

5. **iteration-loop.md** has a confusingly-named `activity-log.jsonl` in the run directory. If this is still used, rename to avoid conflation with the project-level file. If obsolete (per refine-architecture's note), remove the reference.
