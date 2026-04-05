# Merged Review Feedback — Round 2

### CRITICAL Issues

None.

### IMPORTANT Issues

**I1. Phase 3 file list is inflated — 13 of 18 listed files have zero stale references**
Sources: holistic, agent-skill, repo-tooling-docs (all three flagged independently)
The plan lists 15-18 files to update in Phase 3, but the plan's own verification grep finds stale references in only 5 files (32 matches total):
1. `skills/start-epic/SKILL.md` — 13 matches (handled by Phase 1 rewrite)
2. `skills/status/references/status-logic.md` — 13 matches
3. `skills/explore/SKILL.md` — 4 matches
4. `skills/upgrade/references/migration-heuristics.md` — 1 match
5. `skills/init/references/expertise-profiling.md` — 1 match
All other enumerated files (create-epic, plan-slice, audit, create-side-quest, _shared/references/*, init/references/repo-scanning.md, init/references/migration-detection.md, all 3 agent files) return zero matches — their references are `$GP` CLI commands (correctly excluded by `grep -v`) or already use current names.
Fix: Replace Phase 3 task list with the actual 5-file scope. Note that start-epic is already handled by Phase 1.
Resolution: DIRECTLY_ACTIONABLE

**I2. Phase 3 misses bare-name references in _shared/references/ files**
Source: agent-skill
`output-templates.md` and `iteration-loop.md` use bare old skill names (e.g., `refine-plan`, `refine-architecture`, `implement-plan`) in "Used by" annotations and substitution rules — not `/`-prefixed. The plan's grep pattern won't catch these. Either add a separate bare-name grep to verification, or explicitly list the ~15 bare-name replacements needed (e.g., `refine-plan` -> `plan-slice (refinement phase)`, `implement-plan` -> `implement`, etc.).
Resolution: DIRECTLY_ACTIONABLE

**I3. Phase 1 start-epic: architecture-proposal promotion assumption is unstated**
Source: software-architecture
The CLI's `epic:activate` does not promote `architecture-proposal/` to `architecture/`. The plan's rewrite removes the current skill's directory-creation logic. This is correct for the 12-skill model (where `/gp:create-epic` already creates `architecture/` before activation), but the assumption is unstated. Fix: add a pre-activation check (e.g., verify `architecture/_overview.md` exists) so the skill fails fast with a helpful message if architecture is missing.
Resolution: DIRECTLY_ACTIONABLE

**I4. Phase 2 Bug C: verification assessment mechanism is ambiguous**
Source: software-architecture
The plan says the agent should "independently assess whether each verification criterion is met" but doesn't clarify whether this means (a) the orchestrator spawns a new sub-agent for assessment, or (b) the existing completion-epic agent's return value includes verification assessments. The latter is consistent with existing architecture (the agent already reads artifacts). Clarify which approach.
Resolution: DIRECTLY_ACTIONABLE

**I5. Phase 1 start-epic: architecture file loading scope is too broad**
Source: agent-skill
Step 4 loads architecture via `gp status --json --query '.artifacts.architecture'`, which returns ALL architecture files (top-level + epic-level, ~15 files). Should only present the epic's architecture. Fix: use `gp epic:show --epic <name> --json` to get the epic's architecture path, then read files under that path.
Resolution: DIRECTLY_ACTIONABLE

**I6. Phase 1 wrong-status remedies are imprecise**
Sources: software-architecture, agent-skill
For `created`/`explored` status, the plan says "run `/gp:create-epic`" which is misleading — `/gp:create-epic` creates new epics. Agent-skill also notes the `slices-defined` remedy references `/gp:refine-slices` which no longer exists (slice refinement is part of `/gp:create-epic`). Fix: either use `gp epic:show --json` to surface `nextCommands`, or provide more precise per-status guidance. Remove the stale `/gp:refine-slices` reference.
Resolution: DIRECTLY_ACTIONABLE

### MINOR Issues

**M1. Phase 3 verification grep false positive: `/complete[^-]` matches natural language**
Source: holistic
The pattern `/complete[^-]` matches "Archived/completed entity" in `migration-heuristics.md`. Use `/complete ` or `/complete\b` with word boundary, or add `grep -v "completed"`.
Resolution: DIRECTLY_ACTIONABLE

**M2. Phase 1/Phase 3 overlap on start-epic/SKILL.md**
Source: holistic
Phase 1 rewrites start-epic from scratch (eliminating 13 stale references). Phase 3 implicitly includes it in the sweep. Add a note in Phase 3 that start-epic was handled by Phase 1.
Resolution: DIRECTLY_ACTIONABLE

**M3. Phase 4 hardcodes agent count (34) — should be dynamic**
Source: holistic
The count could change between planning and implementation. Say "count agent files" rather than hardcoding 34.
Resolution: DIRECTLY_ACTIONABLE

**M4. Phase 2 Bug A learningInputSchema omits `validUntil` field**
Source: software-architecture
The plan lists `{ category, summary, detail, tags, rollupTo }` but the actual schema also includes `validUntil: Array<string> (optional)`. Either add it or reference the CLI schema command instead.
Resolution: DIRECTLY_ACTIONABLE

**M5. Phase 4 architecture overview: skill/agent additions may blur architectural layering**
Source: software-architecture
The top-level `_overview.md` describes the 4-layer CLI stack. Skills and agents are plugin-level concerns. Clarify whether the update adds a "Plugin/Skills" section to the top-level overview or updates the epic-level overview.
Resolution: DIRECTLY_ACTIONABLE

**M6. Phase 3 grep pattern misses `/explore` at end-of-line**
Source: software-architecture
`/explore[^-]` requires a character after "explore", missing end-of-line occurrences. Minor gap.
Resolution: DIRECTLY_ACTIONABLE

**M7. Phase 4 README verification grep doesn't cover all stale skill names**
Source: repo-tooling-docs
Missing `/complete`, `/capture`, `/onboard-repo`, `/migrate` from the README verification pattern. Extend or reuse Phase 3 pattern.
Resolution: DIRECTLY_ACTIONABLE

**M8. Phase 3 Before assertion: "~75 stale references" figure from research is stale**
Source: repo-tooling-docs
Actual count is ~32 matches. Not a plan error but worth noting for implementer awareness.
Resolution: DIRECTLY_ACTIONABLE

### DIRECTLY_ACTIONABLE (for loop exit)

All 6 IMPORTANT and 8 MINOR issues are DIRECTLY_ACTIONABLE.
Total: 14

### RESEARCH_NEEDED

**R1. Phase 5 model identifier format**
Source: agent-skill (MINOR)
Verify the exact model string the dogfood harness accepts for `--model` flag. Check `tools/dogfood/validate-consolidated.ts`.

**R2. Phase 2 Bug B quest:create input schema field name**
Source: agent-skill (MINOR)
Verify whether `quest:create` uses `name` or `title` in its input schema. Check `src/schemas/commands/quest.ts` or `src/commands/quest/create.ts`.

Total: 2

### Contradictions Resolved

**C1. `/gp:refine-slices` as wrong-status remedy**
software-architecture lists it as a valid remedy option ("run `/gp:refine-slices` (or `/gp:create-epic`)"). agent-skill flags it as a stale reference since `/gp:refine-slices` no longer exists. Resolution: agent-skill is the domain specialist on skill naming — `/gp:refine-slices` is indeed stale and should be removed. The remedy should reference `/gp:create-epic` only.

### Unresolved (USER_INPUT required)

None.
