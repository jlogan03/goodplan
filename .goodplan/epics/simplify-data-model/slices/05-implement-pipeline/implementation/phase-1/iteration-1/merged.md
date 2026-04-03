# Merged Review — Phase 1: Agent Definitions

**Composite Score: 8/10**
Critical: 0 | Important: 3 | Minor: 5

---

## Plan Adherence

All Phase 1 tasks completed:

- [x] `agents/implement-phase.md` created with correct frontmatter, body structure, return format
- [x] `agents/completion-slice.md` created with correct frontmatter, body structure, return format
- [x] `agents/completion-epic.md` created with correct frontmatter, body structure, return format
- [x] Doc references updated: `conventions.md` line 58 now references `completion-slice` and `completion-epic` (0 hits for `completion-phase` in agents/ and skills/)
- [x] `skill-model-api.md` updated with both `completion-slice.md` and `completion-epic.md` rows in the Agent Definitions table
- [x] `build-plugin.sh` confirmed to already copy `agents/` to dist (no changes needed)

---

## Issues

### [IMPORTANT] `implement-phase.md` — `filesChanged` should be `filesWritten`

The shared sub-agent return format (`skills/_shared/references/sub-agent-return-format.md`) defines the required field as `filesWritten`. `implement-phase.md` uses `filesChanged` throughout — in return JSON examples (lines 115, 128, 141), rule #4 (line 154), and step 8 narrative. Every other agent in `agents/` uses `filesWritten`. Since the orchestrator uses this field for `git add` (per the agent's own rule #4), this is a functional bug: the orchestrator will not find the changed files list.

**Resolution:** Rename all instances of `filesChanged` → `filesWritten` in `agents/implement-phase.md`.

---

### [IMPORTANT] `implement-phase.md` — `redGreenResults` undocumented in shared return format

The return JSON includes a `redGreenResults: { passed: boolean, details: string }` object (lines 117-119, 130-132, 143-144). This field is not in `sub-agent-return-format.md` and not listed in the "Agent-Specific Return Fields" table. The implement orchestrator must check `redGreenResults.passed` to decide whether to proceed or escalate — without documenting it, future orchestrator implementations may silently drop this field.

**Resolution:** Add a row to the "Agent-Specific Return Fields" table in `skills/_shared/references/sub-agent-return-format.md`:
`| implement-phase | filesWritten, redGreenResults | Changed files + RED/GREEN check results |`

---

### [IMPORTANT] `completion-slice.md` — `mkdir -p` gap for `completion/` directory

The agent specifies only Read, Grep, Glob, and Write tools. The Write tool will fail if the `completion/` directory does not yet exist. The existing `complete` skill runs `mkdir -p <scope-dir>/completion/` before writing — this is currently unaccounted for.

**Resolution (preferred):** Document in the agent instructions that the orchestrator is responsible for running `mkdir -p <slice-path>/completion/` before spawning this agent. Keep the agent focused on analysis and writing; let the orchestrator handle filesystem setup. The same reasoning applies to `completion-epic.md`.

---

### [MINOR] `completion-slice.md` / `completion-epic.md` — `recommendations` field undocumented

Both agents return a `recommendations` array with typed objects (`type`, `description`, `priority` in slice; expanded with `target`, `scope`, `source`, `destination` in epic). Neither is in the shared return format. These are advisory only (not used for flow control) so this is lower urgency than `redGreenResults`, but documenting them aids future orchestrator implementation.

**Resolution:** Add notes for both completion agents to the "Agent-Specific Return Fields" table in the shared return format.

---

### [MINOR] Naming convention not updated for `completion-<scope>.md` pattern

`conventions.md` (line 158-161) specifies `<phase>-phase.md` for phase agents. The new agents use `completion-slice.md` / `completion-epic.md`, which is clearer and correctly justified by their distinct I/O shapes and non-overlapping callers — but the naming convention doc wasn't updated to account for this pattern.

**Resolution:** Add a note to the "File Naming" section: "When a logical phase has distinct variants with non-overlapping callers, use `<phase>-<variant>.md` (e.g., `completion-slice.md`, `completion-epic.md`) rather than a single `<phase>-phase.md`."

---

### [MINOR] `implement-phase.md` — description doesn't clearly distinguish it from the orchestrator skill

The description reads: "Implements a single plan phase, runs RED/GREEN Expected Behavior checks, and reports changed files and pass/fail status. Spawned by the implement orchestrator during the implementation loop." The "implement orchestrator" reference could cause Claude to conflate this sub-agent with the implement skill itself.

**Resolution (optional):** Strengthen to: "Implements a single plan phase as a sub-agent: runs RED before-checks, applies code changes, runs lint/build/test, runs GREEN after-checks, and reports changed files and pass/fail status. Never invoked directly — spawned by the implement orchestrator skill during its implementation loop."

---

### [MINOR] `implement-phase.md` — lint/build/test commands are project-specific but hardcoded

Section 6 hardcodes `bun run lint`, `bun run build`, `bun test`. The agent has Read access and can check `package.json`, so this is a reasonable default with fallback capability.

**Resolution:** Acceptable as-is. The agent can adapt based on project context.

---

### [MINOR — RESOLVED] `disallowedTools` parenthetical phrasing

Both reviewers noted that `implement-phase.md` references `disallowedTools` in a parenthetical note without setting it in frontmatter. This matches the existing pattern in `plan-phase.md` and `explore-phase.md` and is intentionally informational. No change needed; consistent with the established convention.

---

## Convention Compliance

| Check | Result |
|---|---|
| Frontmatter: `name` field | Pass — all three agents have correct names |
| Frontmatter: `description` field | Pass — all under 200 chars |
| Frontmatter: `model: opus` | Pass — all three set to opus |
| No `skills:` frontmatter | Pass — none use the deprecated pattern |
| `@${CLAUDE_PLUGIN_ROOT}/` references | Pass — all three reference shared sub-agent-return-format.md |
| File naming convention | Pass for intent; conventions doc needs update (see Minor #2) |
| Under 500 lines | Pass — 156, 141, 143 lines respectively |
| Return format (SUCCESS/PARTIAL/FAILED) | Pass — all three follow standard shape |

## Consistency with Existing Agents

| Pattern | Existing agents | New agents | Match? |
|---|---|---|---|
| Frontmatter structure | name, description, model: opus | Same | Yes |
| Shared return format injection | Yes | Yes | Yes |
| Inputs section | Yes | Yes | Yes |
| Numbered instruction steps | Yes | Yes | Yes |
| Return JSON examples (all statuses) | Yes | Yes | Yes |
| Important rules section | No (implicit) | Yes (explicit) | Minor divergence — acceptable, adds clarity |
| `triggeredConditions` in return | Yes (plan/explore) | Yes (completion agents) | Yes |

---

## Action Items (Priority Order)

1. **Fix `filesChanged` → `filesWritten`** in `agents/implement-phase.md` (functional bug)
2. **Document `redGreenResults`** in shared return format (orchestrator contract gap)
3. **Document `mkdir -p` responsibility** in `completion-slice.md` and `completion-epic.md` instructions (design decision, needs explicit resolution)
4. **Update naming convention** in `conventions.md` to account for `<phase>-<variant>.md` pattern
5. **Document `recommendations` field** in shared return format (lower urgency)
6. Optional: strengthen `implement-phase.md` description to differentiate from orchestrator skill
