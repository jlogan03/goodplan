# Agent Skill Review: Phase 1 — create-epic Migration

## Issues

**[IMPORTANT]** Missing error handling guidance for CLI commands
The skill invokes 5 CLI commands (`--version`, `status`, `init`, `epic:create`, `epic:show`) but provides no error handling guidance beyond the version check. The convention doc (`cli-interaction-conventions.md` lines 258-294) defines specific recovery patterns for exit codes 1/2/3, including idempotent re-entry. The `project-status` skill (already migrated) references `cli-interaction.md` for error handling. Without at least a reference to the shared conventions doc, an agent encountering a `STATE_INVALID_TRANSITION` on `epic:create` (e.g., duplicate name) or a validation error on `init` will not know how to recover.
File: skills/create-epic/SKILL.md:1
Resolution: DIRECTLY_ACTIONABLE

Suggested fix: Add a brief error handling section or a reference to `~/.claude/skills/_shared/references/cli-interaction.md` for error recovery patterns. At minimum, after the version check section, add: "For all CLI commands below, follow error handling patterns in `~/.claude/skills/_shared/references/cli-interaction.md`."

**[IMPORTANT]** `.activeEpic` checked but not acted upon in Mode B
Step 2 says "Check `.activeEpic` in the response" for Mode B detection, but the skill never uses this information. The old skill (Step 13) informed the user when an active epic exists: "Note: Epic '<name>' is currently active. Your new epic can be explored and proposed, but won't be buildable until the active epic completes or is abandoned." This is useful context for the user. The CLI's `epic:create` guard will reject creating a duplicate but won't warn about an unrelated active epic.
File: skills/create-epic/SKILL.md:36
Resolution: DIRECTLY_ACTIONABLE

Suggested fix: After detecting Mode B, if `.activeEpic` is non-null, add an informational note to the user about the currently active epic before proceeding to Step 10.

**[IMPORTANT]** Hardcoded goal.md path instead of using `paths` from CLI response
Steps 6-7 derive the goal.md path via "fixed convention" (`.project/epics/<entity>/goal.md`) rather than using the `paths` field from the `epic:create` mutation response. The convention doc (line 131) explicitly says "Mutation responses include `paths` — a `Record<string, string>` mapping logical names to absolute filesystem paths. Write markdown content into these paths." The plan acknowledges this is intentional ("not derived from `paths`"), but it contradicts the convention doc and creates a coupling to directory structure that the CLI is meant to abstract. If the directory convention ever changes, all skills using hardcoded paths break simultaneously.
File: skills/create-epic/SKILL.md:95
Resolution: USER_INPUT

The plan explicitly chose hardcoded paths. Should the skill use `paths` from the `epic:create` response instead, consistent with the convention doc? Or is the "fixed convention" approach acceptable here?

**[MINOR]** Step numbering discontinuity between modes
Mode A uses Steps 1-9, Mode B uses Steps 10-14. The jump from 9 to 10 across a section boundary is inherited from the old skill. Since this is a rewrite and the skill is now ~100 lines shorter, renumbering Mode B as Steps 3-7 (matching Mode A's offset from the shared Steps 1-2) or using independent numbering (B1-B5) would improve clarity for the agent following instructions.
File: skills/create-epic/SKILL.md:139
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Missing stdin piping for `init` command
The convention doc (line 97) states: "Always pipe empty stdin even when no input is needed — the compiled binary reads stdin and will block if nothing is piped." Step 4 shows `goodplan init --name <project-name> --json` without stdin piping. However, the convention doc's own examples (line 120) also show `init` without piping. The commands-api doc says stdin is read only "if the command accepts input (mutations with complex payloads)." Since `init` takes its input via flags (`--name`), this may be fine — but it's inconsistent with the blanket warning. Same applies to `epic:show` (read-only, clearly no stdin needed) and `status` (read-only, clearly no stdin needed).
File: skills/create-epic/SKILL.md:80
Resolution: CODEBASE_EXPLORATION

Check whether `goodplan init` actually reads stdin in the implementation (`src/commands/init.ts` or equivalent). If it does, the skill needs `stdin: ""` piping. If not, the blanket warning in the convention doc is overstated and should be narrowed.

## Score: 7/10

The migration successfully eliminates all direct `.project/` structured-state access (zero grep hits for state.md, activity-log.jsonl, mkdir, epic-conventions, state-and-activity-formats). CLI commands are correctly formed with proper `--json` flags and stdin payloads for `epic:create`. Line count is 190 (under 200 target). The interactive dialogue quality is preserved, and expertise calibration is retained. Templates reference file is unchanged and clean.

The two IMPORTANT issues prevent a higher score: missing error handling guidance is a functional gap that will cause agent confusion on CLI failures, and the `.activeEpic` check-without-action is a UX regression from the old skill. The hardcoded paths issue is a convention doc compliance question that needs user input. Fixing the error handling reference and the activeEpic notification would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 2
