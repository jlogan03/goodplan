# Agent Skill Review — Slice 01: State Command, Convention Doc & Tracer Bullet

## Issues

**[CRITICAL]** Phase 3 skill rewrite omits `--version --json` check and version gating

The convention doc (Phase 2, section 1) specifies that every skill using the CLI must call `goodplan --version --json` at startup and check the `requires` frontmatter constraint. Phase 3's rewrite of `project-status/SKILL.md` replaces Step 1 with `goodplan --version --json` as a project-existence check, but the tasks do not instruct adding a `requires` field to the SKILL.md frontmatter. The epic architecture (`cli-interaction-conventions.md` lines 20-38) makes this mandatory for all CLI-using skills.

The plan's Phase 3 Step 1 says "replace `ls .project/` with `goodplan --version --json`" but conflates two concerns: binary detection and project existence. `--version --json` confirms the binary exists but does NOT confirm a project exists. The convention doc says to use `goodplan status --json` which returns `DATA_NO_PROJECT` for that purpose, or the plan could use `goodplan state --json` which returns `ZERO_STATE`.

Fix: (a) Add `requires: goodplan >= 0.0.1` (or the appropriate version) to the `project-status` SKILL.md frontmatter. (b) Separate binary detection (`--version --json`) from project existence detection (`status --json` checking for `DATA_NO_PROJECT`). (c) Add a task to Phase 3 for updating the frontmatter.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 skill rewrite does not reference `cli-interaction.md` in SKILL.md instructions

The Phase 3 verification item #4 says "Verify the skill references `~/.claude/skills/_shared/references/cli-interaction.md`", but none of the Phase 3 tasks explicitly instruct adding a Read step for the convention doc. The current `project-status` SKILL.md loads `references/status-logic.md` and shared references in Step 2. The rewritten skill should also load the convention doc, or at minimum reference it so agents understand the CLI interaction rules.

Fix: Add a task to Phase 3 that inserts a line in Step 2 (or a new early step) instructing the agent to load `~/.claude/skills/_shared/references/cli-interaction.md` for CLI invocation patterns and error handling rules. This is consistent with how the skill currently loads other shared references.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 skill rewrite still writes `state.md` and appends to `activity-log.jsonl`

The current `project-status` SKILL.md Step 9 writes `state.md` and appends to `activity-log.jsonl`. The convention doc explicitly prohibits both (lines 49-54 of `cli-interaction-conventions.md`). The Phase 3 tasks say "Replace direct file access" but do not explicitly list Step 9's `state.md` write and `activity-log.jsonl` append as items to eliminate.

The `project-status` skill is read-only per the convention doc's "Read-Only Skills" section. It should not perform any state mutations. Step 9 must be entirely removed in the rewrite, not just adapted.

Fix: Add an explicit task to Phase 3: "Remove Step 9 (state.md writeback and activity-log append) entirely. The `project-status` skill is read-only per the convention doc. No state mutations are needed." Also update `references/status-logic.md` to remove the "state.md Write-Back Format" section.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Convention doc Phase 2 task list is underspecified for `stdin: ""` documentation

Phase 2 task item 4 says to note that `stdin: ""` is "Claude Code Bash tool API syntax (not shell)" with an explicit callout. However, the convention doc source (`cli-interaction-conventions.md` lines 97-102) provides a detailed explanation distinguishing the Claude Code Bash tool parameter from shell syntax. The plan should instruct copying this level of detail, including the equivalent shell syntax (`echo '' | goodplan ...`), to avoid future confusion. The Expected Behavior item "Documents `stdin: ""` as Bash tool syntax with explicit callout" is correct but the task description is too terse to ensure the implementer captures the full nuance.

Fix: Expand Phase 2 task item 4 to specify: include the `stdin: ""` explanation verbatim from the architecture spec, including the equivalent shell syntax and the note that this is a Claude Code named parameter.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3 does not address the `project-status` description field update

The current `project-status` SKILL.md description says "Read .project/ state" which implies direct file access. After the rewrite, the skill reads state via CLI commands. The description (which is the primary trigger mechanism per agentskills.io spec) should be updated to reflect the new behavior. This is also important for triggering accuracy -- the description should mention the CLI to differentiate from a potential future skill variant that does direct reads.

Fix: Add a task to Phase 3 to update the SKILL.md `description` frontmatter field to reflect CLI-based state reading. Example: "Query project state via the goodplan CLI -- including epic detection, slice progress, and side quests -- and report the current phase, recent activity, and what to do next."

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 2 convention doc does not mention `start-*` always-JSON behavior in the tasks

The Expected Behavior for Phase 2 includes "Documents `start-*` always-JSON behavior" but the task list (item 4, sub-bullet) only briefly mentions it. The architecture source (`cli-interaction-conventions.md` line 152) shows `start-plan --slice my-slice --inline --json` with `--json` explicitly present. The convention doc should clarify whether `start-*` commands _require_ `--json` (like all other commands) or return JSON regardless. The task should explicitly instruct the implementer to verify this behavior against the actual CLI and document accordingly.

Resolution: CODEBASE_EXPLORATION

---

**[MINOR]** Phase 3 Expected Behavior grep patterns may not catch all direct file access

The "Before implementation" check `grep -c 'state\.md\|activity-log\.jsonl\|\.project/.*\.json' skills/project-status/SKILL.md` would miss direct reads of `.project/` directories via `ls -d .project/epics/__active__*/` (Step 5, line 63 of current SKILL.md) and `ls .project/slices/*/interrupted.md` (Step 7). These are file-existence checks that the convention doc prohibits ("Use `ls` or file-existence checks to infer entity status").

The "After implementation" grep `grep -c 'activity-log\.jsonl' skills/project-status/SKILL.md` notes "references in comments/rationale OK" which is reasonable, but the plan should also verify absence of `ls .project/` patterns.

Fix: Add an additional Expected Behavior check: `grep -c 'ls.*\.project\|ls -d.*\.project' skills/project-status/SKILL.md` returns 0 after implementation.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 3 verification step 4 uses absolute path but install copies to `~/.claude/skills/`

Verification step 4 says "Verify the skill references `~/.claude/skills/_shared/references/cli-interaction.md`". This path with `~` is correct for the installed location. But the skill source in the repo is at `skills/_shared/references/cli-interaction.md`. The skill should reference the installed path (`~/.claude/skills/_shared/references/cli-interaction.md`) since that's where it runs from after `bun run install:skills`. This is consistent with existing references in `project-status/SKILL.md` which use `~/.claude/skills/_shared/references/`. No action needed here -- this is just confirming the verification step is correct.

Resolution: DIRECTLY_ACTIONABLE

## Score: 6/10

The plan covers the three phases (state command, convention doc, tracer bullet) with solid technical detail for Phase 1 (CLI code) and Phase 2 (convention doc). However, Phase 3 (the skill rewrite) has several gaps that would produce a non-compliant skill: missing version gating frontmatter, missing convention doc reference, and most critically, not explicitly removing the state.md writeback and activity-log append that the convention doc prohibits. These are the exact issues a tracer bullet is meant to catch -- if the first rewritten skill doesn't follow the conventions, the pattern for the remaining ~14 skills starts wrong.

To reach 9+: (1) Fix the Phase 3 tasks to explicitly remove Step 9, (2) add `requires` frontmatter and convention doc loading, (3) update the description field, and (4) add grep checks for `ls .project/` patterns.

## Summary
- Critical: 1
- Important: 4
- Minor: 3
