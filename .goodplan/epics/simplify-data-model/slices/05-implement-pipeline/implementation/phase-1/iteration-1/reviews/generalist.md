# Generalist Review — Phase 1: Agent Definitions

## Issues

### [MINOR] `implement-phase.md` — disallowedTools note inconsistent with conventions

The agent body states "No sub-agent spawning (disallowedTools: Agent)" as a parenthetical note, but `disallowedTools` is not set in the frontmatter. The conventions doc says "Do not restrict tools by default." The parenthetical note is informational (telling the agent what it should not do), which is fine — but the phrasing references a frontmatter field that isn't set, which could confuse maintainers. The other existing agents (plan-phase, explore-phase) use similar phrasing, so this is consistent with the existing pattern.

**Resolution:** Keep as-is for consistency with existing agents. Consider standardizing the phrasing across all agents in a future pass.

### [MINOR] `completion-slice.md` — tool list differs from other agents

The completion-slice agent says "Read, Grep, Glob, and Write tools" while implement-phase says "Read, Grep, Glob, Write, Bash, and WebSearch tools." The completion-slice agent's tool list correctly excludes Bash (it reads and writes artifacts, doesn't execute commands) — this is intentional and appropriate. Same for completion-epic. No issue, just noting the deliberate difference.

**Resolution:** No change needed.

### [MINOR] `implement-phase.md` — lint/build/test commands are hardcoded

Section 6 hardcodes `bun run lint`, `bun run build`, `bun test`. These are project-specific. The plan says the agent should "run lint/build/test" but doesn't specify how it discovers the correct commands. In practice, the agent has Read access and can check `package.json`, so this is a reasonable default with fallback capability.

**Resolution:** Acceptable as-is. The agent can adapt based on project context.

### [MINOR] `completion-epic.md` — `consolidatedLearnings` field mentioned in plan but not in return format

The plan's Phase 6 mode-isolation test (line 257) expects the completion-epic return to contain a `consolidatedLearnings` field, but the agent's return JSON format uses `filesWritten` pointing to `consolidated-learnings.md` instead. The test will need to check `filesWritten` or the summary text, not a dedicated `consolidatedLearnings` field. This is a Phase 6 concern, not Phase 1, but worth noting.

**Resolution:** No change to agents needed. Phase 6 test should check `filesWritten` paths.

## Plan Adherence

All Phase 1 tasks completed:

- [x] `agents/implement-phase.md` created with correct frontmatter, body structure, return format
- [x] `agents/completion-slice.md` created with correct frontmatter, body structure, return format
- [x] `agents/completion-epic.md` created with correct frontmatter, body structure, return format
- [x] Doc references updated: `conventions.md` line 58 now references `completion-slice` and `completion-epic` (confirmed 0 hits for `completion-phase` in agents/ and skills/)
- [x] `skill-model-api.md` updated with both `completion-slice.md` and `completion-epic.md` rows in the Agent Definitions table (lines 119-120)
- [x] `build-plugin.sh` confirmed to already copy `agents/` to dist (no changes needed)

## Convention Compliance

| Check | Result |
|---|---|
| Frontmatter: `name` field | Pass — all three agents have correct names |
| Frontmatter: `description` field | Pass — all under 1024 chars (max ~200 chars) |
| Frontmatter: `model: opus` | Pass — all three set to opus |
| No `skills:` frontmatter | Pass — none use the deprecated pattern |
| `@${CLAUDE_PLUGIN_ROOT}/` references | Pass — `implement-phase.md` and `completion-slice.md` and `completion-epic.md` all use `@${CLAUDE_PLUGIN_ROOT}/skills/_shared/references/sub-agent-return-format.md` which exists |
| File naming convention | Pass — `implement-phase.md` follows `<phase>-phase.md`, completion agents follow `completion-<scope>.md` |
| Under 500 lines | Pass — 156, 141, 143 lines respectively |
| Return format matches conventions | Pass — all use SUCCESS/PARTIAL/FAILED with standard fields |

## Consistency with Existing Agents

| Pattern | plan-phase.md | explore-phase.md | New agents | Match? |
|---|---|---|---|---|
| Frontmatter structure | name, description, model: opus | name, description, model: opus | name, description, model: opus | Yes |
| Shared return format injection | Yes (`@...sub-agent-return-format.md`) | Yes | Yes | Yes |
| Inputs section | Yes | Yes | Yes | Yes |
| Numbered instruction steps | Yes | Yes | Yes | Yes |
| Return JSON examples | Yes (SUCCESS, PARTIAL) | Yes (PARTIAL, SUCCESS, FAILED) | Yes (SUCCESS, PARTIAL, FAILED) | Yes |
| Important rules section | No (implicit in instructions) | No (implicit in instructions) | Yes (explicit section) | Minor divergence — acceptable, adds clarity |
| `triggeredConditions` in return | Yes | Yes | Yes (completion agents) | Yes |

## Score: 9/10

Strong execution. All three agent definitions are well-structured, follow established conventions, and have clear I/O contracts. The architecture doc updates correctly replace `completion-phase` references. The split justification is documented in `conventions.md`. Minor issues are cosmetic or concern downstream phases rather than the agents themselves.

## Summary

Critical: 0, Important: 0, Minor: 4
