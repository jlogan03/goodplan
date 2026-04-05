# Software Architecture Review — Slice 08 Documentation Plan

## Issues

**[CRITICAL]** Phase 1 start-epic rewrite references `epic:activate` precondition as `slices-refined` but CLI requires `slices-defined` or `slices-refined`
The plan's Step 2 says: "verify status is `slices-refined`". But the actual `epic:activate` command (in `src/commands/epic/activate.ts`) accepts epics in *either* `slices-defined` or `slices-refined` status. The rewritten skill must accept both preconditions, not just `slices-refined`. Otherwise, epics that skip slice refinement (a valid path) cannot be activated through this skill.
Resolution: DIRECTLY_ACTIONABLE

**[CRITICAL]** Phase 2 Bug B quest creation syntax is incomplete — stdin schema requires both `name` and `goal`
The plan proposes: `echo '{"name":"<name>","goal":"<goal>"}' | $GP quest:create --json`. This is correct for the stdin schema (`quest:create` takes `{name, goal}` via stdin per the CLI schema). However, the plan's replacement pattern shows `--title` being replaced but does not address the fact that the existing skill (complete-epic SKILL.md line 226) only passes `--title "{description}"` with no goal field. The replacement must ensure the `goal` field is populated from the agent's recommendation data — the `description` alone maps to `name`, but there is no source for `goal` in the current recommendation structure. The plan should specify where the goal value comes from (e.g., synthesized from the recommendation's `description` + `scope` fields, or a fixed string like "Follow-up from epic completion").
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 start-epic rewrite omits `epic:activate` verification requirements
The `epic:activate` command description says "Requires verifications." The plan's Step 5 calls `gp epic:activate --epic <name> --json` but does not address the verification precondition. Looking at the state machine, activation requires that the epic has at least one verification criterion added via `epic:add-verification`. The rewritten skill should check for existing verifications via `gp epic:show --epic <name> --json` and, if none exist, either prompt the user to add them or add a default verification. Without this, `epic:activate` will fail at the CLI level for epics without verifications.
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** Phase 2 Bug C verification validation is architecturally misplaced
The plan adds a pre-submit check in the orchestrator that reads `verificationResults` to ensure all have `passed: true`. But the plan says the orchestrator should not read content files (Context Discipline section of complete-epic SKILL.md: "You MUST NOT use the Read tool on architecture files, learnings files, slice artifacts"). The `verificationResults` are constructed by the orchestrator from CLI output and agent return data (Step 7), not from a file — so this is actually fine. However, the plan's phrasing ("checks all `verificationResults` entries") is ambiguous about whether these are the entries the orchestrator is *constructing* or entries read from a file. Clarify that this validation operates on the in-memory payload the orchestrator is about to submit, not on a file read.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 3 stale reference sweep has significant gaps in the mapping table
The Phase 3 task list provides a mapping for `status-logic.md` but the mapping is incomplete. Examining the actual file:
- Line 90: `/explore <epic-path>` should become `/gp:explore <epic-path>` (plan maps `/explore` -> `/gp:explore` but the file uses it without the prefix in 2 places)
- Line 92-93: `/create-architecture <epic-path>` appears twice — correctly mapped
- Line 97: `/complete <epic-path>` — correctly mapped
- Lines 108-112: `/create-plan`, `/refine-plan`, `/implement-plan` all appear in the slice state table — these need to map to `/gp:plan-slice` and `/gp:implement` respectively
- Line 114: `/complete <path>` for slice completion — should map to "built into /gp:implement"
- Line 100: "Suggest next skill for the most advanced in-progress epic (e.g., `/explore`, `/create-architecture`, `/start-epic`)" — all three need `/gp:` prefix
- Line 122: `/explore` and `/create-architecture` at project level — need updates

The plan says "~20 old skill name references" but the actual file has references in both the Epic States and Slice/Quest States tables. The mapping should be comprehensive, not estimated.
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Phase 1 start-epic does not specify what happens to `architecture-proposal/` directory
The current skill has an elaborate Step 5c that creates `architecture/` from `architecture-proposal/`. The plan's rewrite replaces this with just `gp epic:activate --epic <name> --json`. Does the CLI `epic:activate` command handle the `architecture-proposal/` to `architecture/` promotion? Looking at the code, `epic:activate` calls `begin(projectDir, "activate", ...)` which routes through the state machine and data layer. If the CLI already handles architecture directory creation on activation, this is correct. If it doesn't, the rewritten skill is missing a critical step. This needs verification.
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Phase 4 documentation tasks are vaguely specified
The plan says "Update `.goodplan/architecture/_overview.md`: Update skill count to 12, Add `agents/` as a described component (34 agents), Update subsystem maturity levels." But the current `_overview.md` does not mention skills at all — it describes the CLI subsystems. The epic-level architecture overview describes the 12-skill model. The plan should clarify which architecture overview is being updated and what specifically changes. Updating the top-level overview to mention skills could leak epic-level concerns into the current-reality architecture document.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Phase 5 E2E validation specifies `--model claude-opus-4-6` but this is a runtime detail
The model flag is a runtime concern, not an architectural one. However, the plan hardcodes a specific model. If the default model in the harness changes, or if the user wants to run with a different model, this instruction becomes stale. Consider using the harness default or noting this as a suggestion rather than a requirement.
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `output-templates.md` line 9 "Used by" list references old skill names
The plan's Phase 3 tasks mention updating `output-templates.md` but the specific task ("replace references to `refine-plan`, `refine-architecture`, `refine-slices`, `implement-plan` with current skill names") doesn't cover all instances. Line 9 says "Used by: refine-plan, refine-architecture, refine-slices, implement-plan" — these are internal agent-level references now (the agents still have these names: `refinement-coordinator`, `editor`, etc.). The "Used by" annotations should reference the skill names that *invoke* these templates, which are now `plan-slice`, `create-epic`, and `implement`. The plan should be explicit about what each "Used by" line becomes.
Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan correctly identifies the three categories of work (skill bug fixes, stale references, documentation) and structures them in a sensible dependency order. The E2E validation gate is appropriate. However, two critical issues undermine correctness: the `epic:activate` precondition mismatch in Phase 1 would produce a skill that rejects valid epics, and the quest creation fix in Phase 2 is incomplete (missing the `goal` field source). The multiple IMPORTANT issues around incomplete mappings and missing verification requirements indicate the plan needs more thorough codebase exploration before implementation.

To reach 9+: fix the two critical issues, verify the `epic:activate` architecture promotion behavior, complete the stale reference mapping with exact line-by-line changes, and clarify the Phase 4 documentation scope.

## Summary
- Critical: 2
- Important: 4
- Minor: 3
