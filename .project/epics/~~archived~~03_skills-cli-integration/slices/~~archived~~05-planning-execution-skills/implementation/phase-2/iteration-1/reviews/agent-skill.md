# Agent Skill Review: Phase 2 — High-Complexity Skills (create-plan, create-slices)

## Issues

**[IMPORTANT]** create-slices Step 4 still uses `mkdir -p .project/decisions/` instead of CLI command
The create-plan SKILL.md was correctly updated to use `decision:create --json` for durable decisions (line 116). However, the create-slices SKILL.md Step 4 (line 102) still contains the old pattern: `Run mkdir -p .project/decisions/ before the first write. Write in the format specified by decisions-format.md.` This should be migrated to use `decision:create --json` with the same payload pattern as create-plan, matching the established pattern from create-architecture: `echo '{"id":"...","domain":"...","title":"...","summary":"..."}' | goodplan decision:create --json`. This is an inconsistency within the same phase of migration work.
File: skills/create-slices/SKILL.md:102
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** create-plan decision:create invocation lacks concrete command syntax
The create-plan SKILL.md (line 116) says `Use decision:create --json with payload { "id": "<id>", "domain": "<domain>", "title": "<title>", "summary": "<summary>" }` but omits the concrete `echo '...' | goodplan decision:create --json` bash invocation pattern. The established convention (visible in create-architecture SKILL.md line 162) shows the full piped command. Agent skills that embed concrete command strings are more reliable than those that describe the invocation abstractly — the agent must otherwise infer the piping pattern. Change to: `echo '{"id":"<id>","domain":"<domain>","title":"<title>","summary":"<summary>"}' | goodplan decision:create --json`.
File: skills/create-plan/SKILL.md:116
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** create-slices Step 9 lacks `stdin: ""` pattern for submit-slices
The create-slices SKILL.md Step 9 (line 190) shows `echo '{}' | goodplan submit-slices --epic <name> --json`. The codebase research notes (Pattern 5 / risk item 5) indicate that `stdin: ""` is the required pattern for commands without a payload — the compiled binary reads stdin and blocks if nothing is piped. `echo '{}'` works equivalently (since empty object is treated as no input), but is inconsistent with the `stdin: ""` convention documented in the research context. This is a minor consistency concern, but `echo '{}'` is functionally correct per the commands-api.md documentation ("Empty stdin: treated as `{}` (empty object)"). Downgrading: the `echo '{}'` pattern actually appears in multiple migrated skills and is fine — both work.
File: skills/create-slices/SKILL.md:190
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** create-slices SKILL.md Step 0 still references `$EPIC_DIR` with `<activeEpic.name>` JavaScript-style notation
Line 48 uses `.project/epics/<activeEpic.name>/slices/` — the `<activeEpic.name>` notation is clear enough as a placeholder, and it matches how the create-plan SKILL.md references similar fields. This is consistent across the two files, so not actually an issue. Withdrawing this item.

**[MINOR]** create-plan guidance.md Migration Note in CLAUDE.md section references stale `__active__` path
In `skills/create-slices/references/guidance.md` line 37, the old guidance text mentioned `.project/slices/sequencing.md` as stale. The new text (line 37) correctly says "Check for and replace any stale `.project/slices/sequencing.md` reference with the epic-scoped path" — but this line was not updated by the diff and still refers to the non-`__active__` path correctly. No issue.

Let me re-examine for actual remaining issues more carefully.

**[MINOR]** create-plan Step 2 scope resolution mentions `.project/epics/<name>/slices/` without `.project/` prefix consistently
In create-plan SKILL.md line 42, the argument resolution says "then check `.project/epics/<name>/slices/`, `.project/slices/`, or `.project/side-quests/`" which is correct. In the guidance.md line 5, it says "match in `epics/<name>/slices/`, `slices/`, or `side-quests/`" without `.project/` prefix. This is a minor inconsistency between SKILL.md and guidance.md — the guidance.md omits the `.project/` prefix, which could cause an agent to look in the wrong location if it only reads guidance.md.
File: skills/create-plan/references/guidance.md:5
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** create-plan Step 2 scope resolution for slices doesn't match flat entity path pattern
Line 44 of create-plan SKILL.md says `use .project/slices/<activeSlice.name>/` but the codebase research (risk item 2) notes that slices live at `.project/slices/<name>/` as a flat path — the active slice within an epic is still referenced at `.project/slices/<name>/` not nested under epics. The parenthetical "(or `.project/epics/<activeEpic.name>/slices/<activeSlice.name>/` if an active epic exists)" suggests slices are nested under epics, which is correct per the architecture. However, this is a known confusion source — the dual path mention is actually correct behavior. No issue.

## Score: 8/10

The migration is well-executed overall. Both skills correctly: add `requires` frontmatter, add Step 0 version checks, replace `__active__` glob patterns with `goodplan status --json` → `.activeEpic`, replace state.md/activity-log writes with CLI submit commands, and simplify graceful stop logic. The patterns are consistent with the established migration patterns from slices 03-04 (explore, create-architecture). Two IMPORTANT issues prevent a 9+: (1) create-slices still uses `mkdir -p .project/decisions/` instead of `decision:create`, which is an incomplete migration within this phase, and (2) create-plan's `decision:create` invocation lacks the concrete piped command syntax that the established convention requires. Fixing these two brings the score to 9+.

## Summary
- Critical: 0
- Important: 2
- Minor: 1
