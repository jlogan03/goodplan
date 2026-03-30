# Skill Model Configuration

Researched: 2026-03-24

---

## Summary

Skills do NOT use YAML frontmatter to specify model preferences. Model selection is handled entirely in prose instructions within SKILL.md and shared reference files. Sub-agents are spawned via the Claude Code `Agent` tool with a `model` parameter passed inline at each call site.

---

## 1. SKILL.md Frontmatter — No `model:` Field

Every SKILL.md has a standard frontmatter block with these fields only:

```yaml
---
name: <skill-name>
description: >
  ...
requires: goodplan >= 1.0.0
---
```

No `model:` field exists in any SKILL.md. Checked all 14 skills (audit-architecture, complete, create-architecture, create-epic, create-plan, create-slices, explore, implement-plan, migrate, project-status, refine-architecture, refine-plan, refine-slices, start-epic). Grep for `^model:` across all `skills/**/*.md` returned zero matches.

---

## 2. How Sub-Agents Are Spawned

Sub-agents are spawned via the Claude Code `Agent` tool (referred to as "Task tool" in some skill files). The `model` parameter is passed directly in each `Agent` tool call, specified in prose instructions throughout SKILL.md files. There is no central registry or config — the model is baked into individual call-site instructions.

### Key files that define model selection:

**`/Users/iwhite/Repos/goodplan/skills/_shared/references/iteration-loop.md`** — shared skeleton for refine-* skills:
- Reviewers: `model: "opus"` (line 49)
- Synthesis sub-agent: `model: "opus"` (line 66)
- Research sub-agents: `model: "opus"` (line 93)
- Editor sub-agent: `model: "opus"` (line 102)
- Cost-reduction downgrade: `model: "sonnet"` when all previous scores ≥ 8 and only MINOR issues (lines 58, 117)

**`/Users/iwhite/Repos/goodplan/skills/implement-plan/SKILL.md`** — the strongest model policy:
- Line 138: **"Every sub-agent Task tool call MUST include `model: "opus"`."**
- Implementation sub-agent: `model: "opus"` (line 142)
- Reviewers: `model: "opus"` (line 172); downgrade to `model: "sonnet"` when scores ≥ 8 and only MINOR issues (line 174)
- Synthesis: `model: "opus"`, downgrade to `model: "sonnet"` when all scores ≥ 8 (lines 184–185)
- Research sub-agents: `model: "opus"` (line 205)

**`/Users/iwhite/Repos/goodplan/skills/audit-architecture/SKILL.md`**:
- Exploration sub-agents: `model: "opus"` (line 87)

**`/Users/iwhite/Repos/goodplan/skills/create-plan/SKILL.md`**:
- Research sub-agents: `model: "opus"` (line 97)

**`/Users/iwhite/Repos/goodplan/skills/refine-plan/SKILL.md`**:
- Research sub-agents: `model: "opus"` (line 102)
- Codebase context sub-agent: `model: "opus"` (line 108)

**`/Users/iwhite/Repos/goodplan/skills/explore/references/explore-logic.md`**:
- Explore research sub-agents: **omit model param entirely** (line 54) — the one skill that explicitly skips model specification

---

## 3. `_shared/references/` — No Model Selection References

The `_shared/references/` directory contains no dedicated model-selection reference. Model selection lives in:
- `_shared/references/iteration-loop.md` — incidentally, as part of spawn patterns
- Individual SKILL.md files — inline at each call site

There is no central "model config" document.

---

## 4. Model Selection Patterns Across Skills

| Skill | Default model | Cost-reduction condition | Reduced model |
|---|---|---|---|
| implement-plan (all sub-agents) | opus | All scores 8+, MINOR only | sonnet |
| refine-plan (reviewers, synthesis, editor) | opus | All scores 8+, MINOR only | sonnet |
| refine-architecture (reviewers, synthesis, editor) | opus | All scores 8+, MINOR only | sonnet |
| refine-slices (reviewers, synthesis, editor) | opus | All scores 8+, MINOR only | sonnet |
| audit-architecture (exploration agents) | opus | — | — |
| create-plan (research agents) | opus | — | — |
| create-architecture (sub-agents) | opus | Design space narrowed | sonnet |
| explore (research agents) | (omitted) | — | — |

---

## 5. Implications for Harness Patching

### What needs to change

To force haiku model for all sub-agents, the harness must patch the inline `model: "opus"` and `model: "sonnet"` strings in the SKILL.md files. The target locations are:

1. **`_shared/references/iteration-loop.md`** — 5 call sites (lines 49, 58, 66, 93, 102, 117); patching this covers refine-plan, refine-architecture, refine-slices, and other future skills that consume this shared reference.

2. **`skills/implement-plan/SKILL.md`** — 6+ call sites; has an explicit "MUST include `model: "opus"`" directive that would also need patching.

3. **`skills/audit-architecture/SKILL.md`** — 1 call site.

4. **`skills/create-plan/SKILL.md`** and **`skills/refine-plan/SKILL.md`** — 1–2 call sites each.

5. **`skills/create-architecture/`** — inline model references in SKILL.md and `references/design-it-twice.md`.

6. **`skills/explore/references/explore-logic.md`** — currently omits model; to force haiku, would need to add `model: "haiku"`.

### Patch strategy options

**Option A — String replacement in skill files**: The harness does a sed-style replace of `"opus"` → `"haiku-4-5"` and `"sonnet"` → `"haiku-4-5"` across all skill files, then restores originals after the run. Simple but fragile — catches all model strings including any in comments or prose that aren't actual call sites.

**Option B — Targeted patch of shared reference + implement-plan only**: Since `_shared/references/iteration-loop.md` covers the refine-* family and `implement-plan/SKILL.md` covers the most complex skill, patching just those two files would cover ~80% of sub-agent spawns. Fewer files to touch, easier to restore.

**Option C — Orchestrator instruction override**: Instead of patching skill files, inject an instruction into the harness's system context or preamble that overrides model selection globally: "For ALL Agent tool calls in this session, use `model: 'haiku-4-5'` regardless of what the skill instructions specify." This avoids file mutation entirely but depends on the orchestrator model actually following the override (not guaranteed — `implement-plan` line 138 says "MUST include `model: opus`" which is a strong directive).

**Option D — `model:` frontmatter field (does not exist yet)**: If a `model:` frontmatter field were added to SKILL.md, the skill loader could inject a model override without touching skill body text. This would require building the frontmatter-as-config pattern into the goodplan skill infrastructure — out of scope for a harness.

### Recommendation

Option B (targeted patch of `_shared/references/iteration-loop.md` + `implement-plan/SKILL.md`) gives the best coverage-to-risk ratio. These two files contain the majority of explicit `model: "opus"` call sites. The harness can:
1. Read original content of both files
2. Replace `"opus"` and `"sonnet"` with `"haiku-4-5"` (or the appropriate haiku model ID)
3. Run the skill
4. Restore originals in a `finally`-equivalent block

The `explore` skill already omits model — if haiku is desired there too, add `model: "haiku-4-5"` to its spawn call.

### Exact model name to use

The current codebase uses `"opus"` and `"sonnet"` as model strings passed to the Agent tool. The equivalent haiku model identifier for the Agent tool would be `"haiku"` (short form, matching the pattern used for opus/sonnet). Confirm the actual Claude Code Agent tool model string for Haiku 3.5 before patching — it may be `"claude-haiku-4-5"` or just `"haiku"`.
