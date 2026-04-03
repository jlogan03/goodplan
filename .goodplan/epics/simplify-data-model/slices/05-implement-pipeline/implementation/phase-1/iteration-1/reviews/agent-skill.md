# Agent Skill Review — Phase 1: Agent Definitions

## Issues

**[IMPORTANT]** implement-phase uses `filesChanged` instead of shared `filesWritten` field name
The shared sub-agent return format (`skills/_shared/references/sub-agent-return-format.md`) defines the field as `filesWritten` (required, `string[]`). The `implement-phase.md` agent uses `filesChanged` instead — in its return JSON examples (lines 115, 128, 141), in rule #4 (line 154), and in the step 8 narrative. Every other agent in `agents/` uses `filesWritten`. This mismatch means the orchestrator would need special-case parsing for this one agent, or (more likely) the agent will return a field name the orchestrator doesn't expect, silently dropping the changed files list. Since the orchestrator uses this for `git add` (per the agent's own rule #4), this is a functional bug.
File: agents/implement-phase.md:115
Resolution: DIRECTLY_ACTIONABLE

Rename all instances of `filesChanged` to `filesWritten` in the return JSON examples and rule text. Alternatively, if the intentional semantic distinction ("changed" vs "written") matters, document the deviation in the shared return format and add `filesChanged` as an agent-specific field in the "Agent-Specific Return Fields" table. The former is strongly preferred for consistency.

---

**[IMPORTANT]** implement-phase return format includes non-standard `redGreenResults` field without documenting it in shared return format
The `implement-phase.md` agent's return JSON includes a `redGreenResults` object (`{ passed: boolean, details: string }`) on lines 117-119, 130-132, 143-144. This field does not appear in the shared sub-agent return format (`sub-agent-return-format.md`) and is not listed in the "Agent-Specific Return Fields" table. The orchestrator (`implement-plan` skill) needs to know about this field to decide whether to proceed or escalate based on `redGreenResults.passed`. Without documenting it, future orchestrator implementations may not handle it.
File: agents/implement-phase.md:117
Resolution: DIRECTLY_ACTIONABLE

Add `redGreenResults` to the "Agent-Specific Return Fields" table in `skills/_shared/references/sub-agent-return-format.md` with a row like: `| implement-phase | filesWritten, redGreenResults | Changed files + RED/GREEN check results |`. This also serves as documentation for the implement orchestrator.

---

**[IMPORTANT]** completion-slice lacks Bash tool but needs `mkdir -p` for output directory
The `completion-slice.md` agent says "This agent runs with Read, Grep, Glob, and Write tools" (line 11). However, the existing `complete` skill's Step 4 runs `mkdir -p <scope-dir>/completion/` before writing files. The Write tool will fail if the `completion/` directory does not exist. Either the orchestrator must ensure the directory exists before spawning this agent, or the agent needs Bash access.
File: agents/completion-slice.md:11
Resolution: DIRECTLY_ACTIONABLE

Either: (a) add Bash to the tool list for `completion-slice.md` so it can create directories, or (b) document in the agent instructions that the orchestrator is responsible for running `mkdir -p <slice-path>/completion/` before spawning this agent. Option (b) is cleaner — keeps the agent focused on analysis and writing, with the orchestrator handling filesystem setup.

---

**[MINOR]** completion-slice agent does not reference `recommendations` field type definition
The `completion-slice.md` return JSON (line 104-108) includes a `recommendations` array with `{ type, description, priority }` objects. The `completion-epic.md` has a similar but expanded shape (adds `target`, `scope`, `source`, `destination` fields). Neither is documented in the shared return format. This is less urgent than the `redGreenResults` issue because recommendations are advisory (not used for flow control), but documenting them would help future orchestrator implementations.
File: agents/completion-slice.md:104
Resolution: DIRECTLY_ACTIONABLE

Add a note to the shared return format's "Agent-Specific Return Fields" table documenting `recommendations` for both completion agents.

---

**[MINOR]** completion-epic mentions `Bash` in no-sub-agent note but doesn't list it in tool set
The `completion-epic.md` tool note (line 11) says "Read, Grep, Glob, and Write tools" but the agent may need to read git history or run `gp` CLI commands to check slice statuses. Same consideration as completion-slice — the orchestrator should either pass all needed context inline or the agent needs Bash. Given the epic architecture overview says sub-agents cannot use AskUserQuestion but CAN access all other parent tools, the explicit tool list may be unnecessarily restrictive.
File: agents/completion-epic.md:11
Resolution: DIRECTLY_ACTIONABLE

If the orchestrator passes all needed context (slice learnings paths, architecture-delta paths, cross-slice summary) in the task prompt as specified in the Inputs section, then Read/Grep/Glob/Write is sufficient. The current Inputs section looks complete for this. No change needed if the orchestrator contract is followed. Add a brief note: "All slice data is provided via task prompt paths — no CLI access needed."

---

**[MINOR]** Agent definition naming breaks the file-naming convention for completion agents
The conventions.md (line 158-161) specifies: phase agents use `<phase>-phase.md`, reviewers use `reviewer-<domain>.md`, utility agents use `<function>.md`. The new agents are named `completion-slice.md` and `completion-epic.md`, which don't follow the `<phase>-phase.md` pattern (would be `completion-phase-slice.md` or similar). However, the conventions doc also says the split "reflects their distinct I/O shapes, non-overlapping callers, and cleaner responsibility boundaries." The current names are clearer and more descriptive. The naming convention should be updated to account for this pattern.
File: .goodplan/epics/simplify-data-model/architecture/conventions.md:158
Resolution: DIRECTLY_ACTIONABLE

Update the "File Naming" section in conventions.md to add a note: "When a logical phase has distinct variants with non-overlapping callers, use `<phase>-<variant>.md` (e.g., `completion-slice.md`, `completion-epic.md`) rather than a single `<phase>-phase.md`."

---

**[MINOR]** Triggering accuracy: implement-phase description doesn't clearly distinguish it from the implement orchestrator skill
The implement-phase description (line 2) reads: "Implements a single plan phase, runs RED/GREEN Expected Behavior checks, and reports changed files and pass/fail status. Spawned by the implement orchestrator during the implementation loop." This is good for human context but the "implement orchestrator" reference could cause Claude to confuse this agent with the implement skill itself. The "Spawned by..." clause helps, but the description should more strongly differentiate.
File: agents/implement-phase.md:2
Resolution: DIRECTLY_ACTIONABLE

Consider strengthening: "Implements a single plan phase as a sub-agent: runs RED before-checks, applies code changes, runs lint/build/test, runs GREEN after-checks, and reports changed files and pass/fail status. Never invoked directly — spawned by the implement orchestrator skill during its implementation loop."

## Score: 7/10

The three agent definitions are well-structured, follow established patterns (frontmatter format, `@` references for shared content, clear Input/Instructions/Return sections), and have thorough instructions. The split of `completion-phase` into `completion-slice` and `completion-epic` is well-justified with clean responsibility boundaries. The architecture docs were correctly updated to reflect the split. However, the `filesChanged` vs `filesWritten` naming mismatch in implement-phase is a functional inconsistency that would cause orchestrator integration issues. The undocumented `redGreenResults` field is a gap in the shared return format contract. The `mkdir -p` concern for completion-slice is a design decision that needs explicit resolution. Fixing the two IMPORTANT issues and the naming convention would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
