# Merged Review — Phase 2: Fix complete-epic Bugs

**Consensus score: 7.5/10** (Generalist: 9/10, Agent-Skill: 6/10)

The generalist confirmed all three bugs (A, B, C) are addressed per plan. The agent-skill reviewer found that while the structural changes are correct, several field names and CLI invocation details diverge from the actual codebase, creating runtime failures.

## CRITICAL

### 1. `epic:complete` invocation missing required `--epic` flag
Step 7d pipes `epic` inside the stdin JSON payload but the CLI requires `--epic` as a flag argument (citty validates required args before `run()` executes). The command will fail before stdin is read.

**Fix:** Move `epic` out of the JSON payload and onto the command line as `--epic $EPIC_NAME`. Update the payload description (lines 335-338) accordingly.

File: `skills/complete-epic/SKILL.md:333`

> Note: The generalist flagged this same change as Minor issue #1 ("behavioral change beyond the three stated bugs — worth noting"). The agent-skill reviewer confirmed it is actually a runtime failure, elevating it to CRITICAL.

## IMPORTANT

### 2. Field name mismatch: `verification` vs `verifications`
Steps 4e and 7a reference `verification` (singular) but the epic entity schema (`src/schemas/entities/epic.ts:41`) uses `verifications` (plural). This will extract `undefined` from `epic:show --json` output.

**Fix:** Replace `verification` with `verifications` in Steps 4e and 7a.

File: `skills/complete-epic/SKILL.md:275`, `skills/complete-epic/SKILL.md:155`

### 3. Verification entry field names incorrect in Step 7a
Step 7a references `index`, `criterion`, and `addedDuring` fields. The actual `verificationSchema` fields are `description`, `status`, `addedDuring`, and `modifiedDuring`. No `index` or `criterion` field exists.

**Fix:** Replace `criterion` with `description`, remove `index` (use array position), and reference the correct schema fields.

File: `skills/complete-epic/SKILL.md:275`

## MINOR

### 4. "Independently verify" wording is misleading
Both reviewers flagged that Step 7a says "the orchestrator must independently verify these criteria" but then uses the agent's assessments as the source of truth. No independent verification occurs.

**Fix:** Reword to clarify the orchestrator validates completeness and non-empty notes from the agent's assessments, rather than performing independent verification.

File: `skills/complete-epic/SKILL.md:265`

### 5. Step 4e doesn't explain how the agent accesses verification criteria
The task prompt tells the agent to assess verification criteria but doesn't provide them as input or specify how to obtain them. The agent lacks Bash access so cannot run `gp epic:show --json`.

**Fix:** Have the orchestrator pass verification criteria in the task prompt (from its own `epic:show` output during scope resolution), or add Bash to the agent's allowed tools.

File: `skills/complete-epic/SKILL.md:155`

## Items confirmed correct (no action needed)

- Bug A (learnings rollup): Step 7c reads consolidated-learnings.md with full schema, parses all entries, `rollupTo: ["project"]` default documented
- Bug B (quest creation syntax): `quest:create --title` replaced with stdin JSON pattern, scope incorporated into goal string
- Bug C (verification validation): Step 4e returns `verificationAssessments`, Step 7b implements pass/fail gate with user options
- Context discipline exception properly justified for learnings read
- No stale references to old quest:create syntax remain
