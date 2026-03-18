# Phase 5: Update workflow.md

Update the canonical workflow document to reflect decisions/ and expertise tracking — only features that are actually implemented after Phases 0-4.

### Tasks

- [ ] Read current `workflow.md` to understand existing structure
- [ ] Add `.project/decisions/` to the file structure tree with a brief description of its purpose
- [ ] Add expertise tracking description: where it lives (CLAUDE.md section + auto memory), how it's maintained (start-project calibrates, all skills update opportunistically)
- [ ] Update the workflow step descriptions to mention decisions loading/writing where relevant (explore, define-architecture, define-slices, create-plan, complete-slice)
- [ ] Update the workflow step descriptions to mention expertise calibration (start-project) and expertise check (all interactive skills)
- [ ] Add `_shared/references/` to any relevant "where things live" section, if workflow.md has one
- [ ] Do NOT add unimplemented skills (refine-architecture, refine-slices, audit-architecture) or conventions (system-profile.md) — those belong to other side quests

### Verification

- Read updated `workflow.md` — confirm decisions/ appears in file structure with description
- Confirm expertise tracking is described (two-layer system, which skills calibrate vs update)
- Confirm no references to unimplemented skills or conventions
- Spot-check that the workflow step descriptions are consistent with the actual skill SKILL.md files updated in Phases 3-4
