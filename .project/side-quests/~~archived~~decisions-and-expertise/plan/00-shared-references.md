# Phase 0: Shared References Consolidation

Create `~/.claude/skills/_shared/references/` and move duplicated reference files into it, then update all skill SKILL.md files to Read from the shared location.

### Context

Six skills currently maintain near-identical copies of `formats.md` (state.md + flow-log.jsonl formats). Two skills (refine-plan, implement-plan) maintain identical copies of `dependency-research.md` and `team-defaults.md`. Moving these to a shared location eliminates drift and makes it easier to add new shared references (decisions-format.md, expertise-tracking.md) in subsequent phases.

**Consolidation criterion**: only consolidate files expected to stay unified long-term. Reviewer prompt files (85-95% similar across refine-plan/implement-plan) are left as skill-specific copies because they serve different workflows and may diverge.

### Tasks

- [ ] Create directory `~/.claude/skills/_shared/references/`
- [ ] Create `~/.claude/skills/_shared/references/state-and-flow-formats.md` — merge content from the 6 existing `formats.md` files. Include: state.md 4-section format, flow-log.jsonl entry format, timestamp convention. Exclude skill-specific content (e.g., start-project's idea.md template stays in start-project)
- [ ] Create `~/.claude/skills/_shared/references/dependency-research.md` — copy from `implement-plan/references/dependency-research.md` (identical to refine-plan's copy)
- [ ] Create `~/.claude/skills/_shared/references/team-defaults.md` — copy from `implement-plan/references/team-defaults.md` (identical to refine-plan's copy)
- [ ] Update `start-project/SKILL.md` — change Read paths from `references/formats.md` to `~/.claude/skills/_shared/references/state-and-flow-formats.md`. Keep start-project's skill-specific content (idea.md template, CLAUDE.md format) in a local reference file
- [ ] Update `explore/SKILL.md` — change Read paths for formats
- [ ] Update `define-architecture/SKILL.md` — change Read paths for formats
- [ ] Update `define-slices/SKILL.md` — change Read paths for formats
- [ ] Update `create-plan/SKILL.md` — change Read paths for formats
- [ ] Update `complete-slice/SKILL.md` — change Read paths for formats
- [ ] Update `refine-plan/SKILL.md` — change Read paths for dependency-research.md and team-defaults.md
- [ ] Update `implement-plan/SKILL.md` — change Read paths for dependency-research.md and team-defaults.md
- [ ] Remove old per-skill copies: `formats.md` from 6 skills, `dependency-research.md` and `team-defaults.md` from refine-plan and implement-plan
- [ ] Verify: each skill's SKILL.md references the correct `_shared/` path. Spot-check by reading 2-3 updated SKILL.md files

### Verification

- `ls ~/.claude/skills/_shared/references/` shows `state-and-flow-formats.md`, `dependency-research.md`, `team-defaults.md`
- `grep -r "references/formats.md" ~/.claude/skills/*/SKILL.md` returns no results (all migrated)
- `grep -r "_shared/references/state-and-flow-formats.md" ~/.claude/skills/*/SKILL.md` returns hits for 6 skills
- Old files removed: `ls ~/.claude/skills/start-project/references/formats.md` fails
- Read one updated SKILL.md end-to-end to confirm the Read path is correct and context flows properly
