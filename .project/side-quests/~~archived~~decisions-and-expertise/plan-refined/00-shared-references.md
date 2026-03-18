# Phase 0: Shared References Consolidation

Create `~/.claude/skills/_shared/references/` and move duplicated reference files into it, then update all skill SKILL.md files to Read from the shared location.

### Context

Six skills currently maintain near-identical copies of `formats.md` (state.md + flow-log.jsonl formats). Two skills (refine-plan, implement-plan) maintain identical copies of `dependency-research.md`, `team-defaults.md`, and `codebase-context-discovery.md`. Moving these to a shared location eliminates drift and makes it easier to add new shared references (decisions-format.md, expertise-tracking.md) in subsequent phases.

**Consolidation criterion**: only consolidate files expected to stay unified long-term. Reviewer prompt files (85-95% similar across refine-plan/implement-plan) are left as skill-specific copies because they serve different workflows and may diverge. `shared-preamble.md` is also excluded — copies differ between refine-plan and implement-plan (different placeholder sets for plan review vs code review).

**Path resolution**: shared references use absolute `~/.claude/skills/_shared/references/` paths. Project-level skill installs are not supported for shared references. The `_shared/references/` directory itself should include a brief README noting this convention.

### Tasks

- [x] Create directory `~/.claude/skills/_shared/references/`
- [x] Create `~/.claude/skills/_shared/references/README.md` — contents: purpose of the directory (shared reference files consumed by multiple skills), path convention (absolute `~/.claude/skills/_shared/references/` paths), how to add a new shared reference (consolidation criterion: expected to stay unified long-term), troubleshooting note: if this directory is missing, skills will fail with a Read error pointing to the missing path — fix by re-creating the directory and its files
- [x] Before merging, diff all 6 `formats.md` files to identify any skill-specific content that may have crept in. Document any differences found.
- [x] Create `~/.claude/skills/_shared/references/state-and-flow-formats.md` — merge content from the 6 existing `formats.md` files. Include: state.md 4-section format, flow-log.jsonl entry format, timestamp convention. Exclude skill-specific content (e.g., start-project's idea.md template stays in start-project)
- [x] Create `~/.claude/skills/_shared/references/dependency-research.md` — copy from `implement-plan/references/dependency-research.md` (identical to refine-plan's copy)
- [x] Create `~/.claude/skills/_shared/references/team-defaults.md` — copy from `implement-plan/references/team-defaults.md` (identical to refine-plan's copy)
- [x] Create `~/.claude/skills/_shared/references/codebase-context-discovery.md` — copy from `implement-plan/references/codebase-context-discovery.md` (identical to refine-plan's copy)
- [x] Update `start-project/SKILL.md` — change Read paths from `references/formats.md` to `~/.claude/skills/_shared/references/state-and-flow-formats.md`. Keep start-project's skill-specific content (idea.md template, CLAUDE.md format) in a local reference file
- [x] Update `explore/SKILL.md` — change Read paths for formats
- [x] Update `define-architecture/SKILL.md` — change Read paths for formats
- [x] Update `define-slices/SKILL.md` — change Read paths for formats
- [x] Update `create-plan/SKILL.md` — change Read paths for formats
- [x] Update `complete-slice/SKILL.md` — change Read paths for formats
- [x] Update `refine-plan/SKILL.md` — update ALL occurrences of old paths for dependency-research.md, team-defaults.md, and codebase-context-discovery.md (Read instructions, reference listings, and inline mentions)
- [x] Update `implement-plan/SKILL.md` — update ALL occurrences of old paths for dependency-research.md, team-defaults.md, and codebase-context-discovery.md (Read instructions, reference listings, and inline mentions)
- [x] Remove old per-skill copies: `formats.md` from 6 skills, `dependency-research.md`, `team-defaults.md`, and `codebase-context-discovery.md` from refine-plan and implement-plan
- [x] Verify: each skill's SKILL.md references the correct `_shared/` path. Spot-check by reading 2-3 updated SKILL.md files

### Verification

- `ls ~/.claude/skills/_shared/references/` shows `README.md`, `state-and-flow-formats.md`, `dependency-research.md`, `team-defaults.md`, `codebase-context-discovery.md`
- `grep -r "references/formats.md" ~/.claude/skills/*/SKILL.md` returns no results (all migrated)
- `grep -r "_shared/references/state-and-flow-formats.md" ~/.claude/skills/*/SKILL.md` returns hits for 6 skills
- Old files removed: `ls ~/.claude/skills/start-project/references/formats.md` fails
- Read one updated SKILL.md end-to-end to confirm the Read path is correct and context flows properly
