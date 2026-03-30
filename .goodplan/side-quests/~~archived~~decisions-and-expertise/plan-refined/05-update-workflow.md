# Phase 5: Update workflow.md

Update the canonical workflow document to reflect decisions/ and expertise tracking — only features that are actually implemented after Phases 0-4.

### Tasks

- [x] Read current `workflow.md` to understand existing structure
- [x] Add `.project/decisions/` to the file structure tree — insert it after `architecture/` — with a brief description of its purpose
- [x] Add expertise tracking description: where it lives (CLAUDE.md section + auto memory), how it's maintained (start-project calibrates, all skills update opportunistically)
- [x] Update the workflow step descriptions to mention decisions loading/writing where relevant (explore, define-architecture, define-slices, create-plan, complete-slice)
- [x] Update the workflow step descriptions to mention expertise calibration (start-project) and expertise check (all interactive skills)
- [x] Add `_shared/references/` to the File Structure section of workflow.md — document its purpose (shared reference files consumed by multiple skills) and that it uses absolute `~/.claude/skills/_shared/references/` paths
- [x] Do NOT add unimplemented skills (refine-architecture, refine-slices, audit-architecture) or conventions (system-profile.md) — those belong to other side quests

### Verification

- Read updated `workflow.md` — confirm decisions/ appears in file structure with description
- Confirm expertise tracking is described (two-layer system, which skills calibrate vs update)
- Confirm no references to unimplemented skills or conventions
- Spot-check consistency: verify workflow.md describes the same writer/reader lists as the plan implemented (9 readers, 5 writers for decisions; 6 skills for expertise check + start-project calibration + project-status display)
- Confirm downstream quest dependencies are satisfied: architecture-quality expects decisions loading in define-architecture and expertise calibration; slice-quality-and-health expects decision writing from complete-slice. Verify these are covered by Phases 3-4.
