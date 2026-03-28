# Dogfooding

## What We're Building

Run the complete CLI-integrated skill suite on a real workflow cycle to surface ergonomic gaps, missing CLI capabilities, and convention doc shortcomings. This is where the "CLI conforms to skills" constraint gets exercised — if skills need something the CLI doesn't provide, the CLI changes.

## Behavior

1. Execute a representative workflow cycle using the updated skills on a real or realistic project
2. The cycle should exercise at minimum: `/create-epic` → `/explore` → `/create-architecture` → `/create-slices` → `/create-plan` → `/refine-plan` → `/implement-plan` → `/complete`
3. Document every friction point: CLI errors, missing data, awkward command sequences, convention doc gaps
4. Fix issues as they're discovered — both CLI code changes and skill/convention doc updates
5. Convention doc is updated with corrections and additional patterns
6. Final grep across all 15 skill files confirms zero direct `.project/` file access for structured state

## Success Criteria

- [ ] At least one full workflow cycle (epic → slices → plan → implement → complete) executed using CLI-integrated skills
- [ ] All friction points documented as issues and resolved
- [ ] Convention doc reflects the actual working patterns (not just the designed patterns)
- [ ] Focus on cross-skill transitions and emergent issues; a final cross-skill grep is included as a safety net (see Verification step 2)
- [ ] `bun test` passes — all existing CLI tests still work
- [ ] `bun run install:skills` installs all updated skills successfully

## Verification

1. **Full cycle**: Execute the workflow cycle listed above. At each step, verify the skill calls CLI commands (not direct file access) by checking command output and `goodplan state --json --query '.["activity-log.jsonl"] | .[-3:]'` for recent activity.

2. **Cross-skill grep**: Run `grep -rn 'Read.*\.project/.*\.json\|\.project/.*\.jsonl\|state\.md\|echo.*activity-log' skills/` and verify no direct structured state access.

3. **Regression**: Run `bun test` to confirm CLI changes from gap fixes haven't broken existing functionality.

4. **Convention doc review**: Read the final convention doc and verify it matches actual skill behavior observed during the dogfood cycle.

## Scope Boundaries

**In scope:**
- Full workflow cycle execution
- CLI bug fixes and gap filling discovered during dogfooding
- Convention doc corrections and additions
- Skill file fixes for any issues discovered
- Final verification grep across all skills

**Exit criteria:** One full workflow cycle end-to-end; critical issues fixed; non-critical issues logged as deferred work.

**Out of scope:**
- Full skill consolidation (~12 → ~7 skills) — future epic
- Major new CLI commands — side quests if needed
- Performance optimization
