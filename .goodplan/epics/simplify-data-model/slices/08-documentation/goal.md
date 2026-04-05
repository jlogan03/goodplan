# Documentation and Skill Bug Fixes

## What We're Building
Fix skill bugs found during quality validation (slice 07) and update all documentation to reflect the verified 12-skill model. The bug fixes must happen first — documentation should describe the corrected behavior.

## Skill Bug Fixes

### 1. Rewrite `start-epic` skill to use CLI commands
The start-epic skill is entirely based on the old v1.0.3 model:
- Uses `ls -d`, `test -f`, `[ -d ]` for file-existence checks instead of `gp epic:show --json`
- Uses `mv` to rename epic directories with `__active__` prefix instead of `gp epic:activate`
- Writes directly to `activity-log.jsonl` instead of letting the CLI handle it
- References old artifact names (`architecture-proposal/`, `approved.md`, `explore-complete.md`)
- References old skill names (`/create-architecture`, `/create-slices`, `/explore`, `/complete`)

The correct flow is simple:
1. `gp epic:show --epic <name> --json` → check status is `slices-refined`
2. Present architecture for user review
3. `gp epic:activate --epic <name> --json` → transitions to `activated`

The CLI enforces the state machine — `epic:activate` only works from `slices-refined`. No file scanning or directory renaming needed.

### 2. Fix `complete-epic` learnings rollup
The completion-epic agent produces rich consolidated learnings (7+ items) but the complete-epic orchestrator only extracts and submits 1 truncated summary through the CLI. The orchestrator's Step 7 needs to properly extract all learnings from the agent's output and submit them individually in the `epic:complete` payload.

### 3. Fix `complete-epic` quest creation syntax
Uses `quest:create --title "..."` (invalid flag) instead of stdin JSON: `echo '{"name":"...","goal":"..."}' | gp quest:create --json`

### 4. Fix stale skill name references in SKILL.md files
Multiple skill files and shared references still use old 19-skill names:
- `skills/status/references/status-logic.md` — ~20 instances of old names in the state-to-next-skill mapping table
- `skills/_shared/references/output-templates.md` — references `refine-plan`, `refine-architecture`, `refine-slices`, `implement-plan`
- `skills/_shared/references/iteration-loop.md` — references `refine-plan, refine-architecture`
- `skills/explore/SKILL.md` — next-step guidance references `/create-architecture`, `/create-plan`
- `skills/init/SKILL.md` — line 209 references `/gp:create-architecture`

### 5. Fix `complete-epic` verification validation
The complete-epic orchestrator submits `verificationResults` to `gp epic:complete` but does not validate that all results have `passed: true` before submitting. The CLI guard rejects the payload if any verification failed (`STATE_VERIFICATION_FAILED`). The skill should check all results before calling the CLI and surface failures to the user instead of hitting the guard.

### 6. Verify skill-to-CLI state transition ordering
Ensure all skills instruct the LLM to call CLI commands in the order the state machine expects. The epic lifecycle is strictly:
```
created → exploring → explored → defining-architecture → architecture-defined →
refining-architecture → architecture-refined → defining-slices → slices-defined →
refining-slices → slices-refined → activated → completed
```
Skills must not attempt transitions out of order (e.g., activating before slices are defined).

## Documentation Updates

6. Update `README.md`:
   - Reflect the 12-skill inventory with correct `/gp:` invocation names
   - Update the workflow overview to show the consolidated pipeline flow
   - Update any installation or usage instructions affected by skill renaming
7. Update `CLAUDE.md`:
   - Update the "Read these" list if any architecture files were added/removed/renamed
   - Update any skill invocation references (old names → new names)
   - Update the repo structure section in conventions to reflect agents/ directory
8. Update `.goodplan/architecture/_overview.md`:
   - Update skill references throughout
   - Update subsystem maturity levels based on epic outcomes
   - Add agents/ as a described component
9. Update `.goodplan/conventions.md`:
   - Update repo structure to include `agents/` directory
   - Update skill development conventions for the new model
10. Update any other architecture files that reference old skill names or the 19-skill model.
11. Review and update `docs/` directory if it exists and contains affected content.
12. Verify no stale references remain: grep for old skill names across the repo.

## Verification
- [ ] E2E validation (`bun tools/dogfood/validate-consolidated.ts --model claude-opus-4-6`) — start-epic step passes (epic activates via CLI)
- [ ] E2E validation — learnings metric passes (>= 2 learnings, each >= 100 chars)
- [ ] E2E validation — all 8 pipeline steps pass
- [ ] E2E validation — all 6 quality metrics pass
- [ ] `grep -r 'CLAUDE_PLUGIN_ROOT.*binaries' skills/` returns zero matches
- [ ] `grep -r 'create-plan\|refine-plan\|create-slices\|refine-slices\|implement-plan\|audit-architecture\|audit-docs\|audit-tests\|project-status\|onboard-repo\|/capture\b\|/migrate\b' skills/ --include="*.md"` returns zero matches (excluding false positives like "capture learnings")
- [ ] `bun run build:plugin` passes
- [ ] Read `README.md` — lists exactly 12 skills with correct names
- [ ] Read `.goodplan/architecture/_overview.md` — skill count matches 12, agents/ described

## Scope Boundaries
**In scope:** Skill bug fixes (start-epic, complete-epic, stale references), documentation updates (README, CLAUDE.md, architecture, conventions), state transition ordering verification, E2E validation pass
**Out of scope:** New features. Marketing copy. API documentation beyond SKILL.md self-documentation.
