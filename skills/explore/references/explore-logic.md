# Explore Logic Reference

> See also: `~/.claude/skills/_shared/references/state-and-activity-formats.md` for state.md and activity-log.jsonl formats.

## Scope Path Mapping

| Scope | research/ | brainstorm/ | prototypes/ | explore-complete.md | explore-skipped.md |
|---|---|---|---|---|---|
| Epic | `.project/epics/__active__<name>/research/` | `.project/epics/__active__<name>/brainstorm/` | `.project/epics/__active__<name>/prototypes/<name>/` | `.project/epics/__active__<name>/explore-complete.md` | `.project/epics/__active__<name>/explore-skipped.md` |
| Project | `.project/research/` | `.project/brainstorm/` | `.project/prototypes/<name>/` | `.project/explore-complete.md` | `.project/explore-skipped.md` |
| Slice | `.project/slices/<name>/research/` | `.project/slices/<name>/brainstorm/` | N/A | `.project/slices/<name>/explore-complete.md` | `.project/slices/<name>/explore-skipped.md` |
| Quest | `.project/side-quests/<name>/research/` | `.project/side-quests/<name>/brainstorm/` | N/A | `.project/side-quests/<name>/explore-complete.md` | `.project/side-quests/<name>/explore-skipped.md` |

> **Note**: Epic scope supports Prototype mode (like Project scope). Per-slice exploration is not supported for epic slices — all exploration happens at the epic level. For non-active epics (no `__active__` prefix), use the epic directory path without the prefix (e.g., `.project/epics/<name>/research/`).

## explore-complete.md Template

```markdown
# Explore Complete

## Scope
<project-level | epics/<name> | slices/<name> | side-quests/<name>>

## What Was Explored
<Bullet list of topics researched and/or brainstormed>

## Key Conclusions
<What we learned, decisions made, open questions that remain>

## Artifacts
<List of files written: research/<topic>.md, brainstorm/<topic>.md, prototypes/<name>/>
```

## explore-skipped.md Template

```markdown
# Explore Skipped

## Scope
<scope>

## Reason
<Why exploration was skipped — what context already exists>
```

## Research Mode

**User interaction:**
1. Ask: "What topics do you want to research? List them and I'll investigate in parallel."
2. Show confirmation with each topic, computed output path, and topic slug. Wait for OK.
3. Show one-line progress as each sub-agent completes (e.g., "Wrote research/auth-providers.md").
4. After all complete, summarize findings. Report partial results if any failed (e.g., "4/5 done; X failed — retry?").

**Implementation:**
- Cap parallel sub-agents at 5; queue rest sequentially.
- Compute full absolute output path before spawning. Use the Agent tool to spawn a sub-agent (omit model param) with:
  - Context: "This is a goodplan-managed project. `.project/` contains project state. You are researching a topic for `/explore`."
  - Search codebase (Grep/Glob/Read) for relevant code/patterns
  - Use WebSearch for external knowledge; use Context7 MCP tools if available (resolve library ID → query docs)
  - `mkdir -p <research-path>` before writing
  - Write to `<research-path>/<topic-slug>.md` (slug: 2-4 words, kebab-case). If file exists, append numeric suffix (e.g., `api-design-2.md`)
  - **Sub-agent must NOT modify any files other than its designated output file**
- On failure, write a stub file noting the failure.

## Brainstorm Mode

1. Ask: "What do you want to explore or think through?"
2. Open conversation — ask follow-ups, surface trade-offs, explore options.
3. At a natural stopping point (repetition, convergence, user satisfied), offer to capture or keep going. If capturing: show outline, wait for approval.
4. Backstop: after 8-10 exchanges, nudge: "We've been at this a while — want me to capture what we have?"
5. `mkdir -p <brainstorm-path>` before writing.
6. Derive slug (2-4 words, kebab-case). Show to user and confirm (e.g., "I'll save as `brainstorm/auth-approach.md` — OK?").
7. Write structured summary: options considered, trade-offs, decision (if any), open questions. If file exists, append numeric suffix.

## Prototype Mode (Project or Epic Scope)

1. Ask: "What do you want to prototype? Describe the approach."
2. Derive `<name>` from the approach description (2-4 words, kebab-case), confirm with user. If directory already exists, append numeric suffix (e.g., `auth-flow-2/`).
3. `mkdir -p <prototypes-path>/<name>/` (use the prototypes/ path from the Scope Path Mapping table above)
4. Run session interactively — write prototype files into that directory.
5. On completion, write `summary.md`: what was tried, what was learned, verdict (promising / not worth pursuing / needs more exploration).
