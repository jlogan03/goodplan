# Side Quest: Migrate Pre-CLI .project/ to CLI Format

## What We're Building

A `goodplan migrate` CLI command that drives a question-answer conversation to collect all the information needed to construct valid CLI-managed state from an existing pre-CLI `.project/` directory. The CLI asks questions, the LLM (or a human) reads the old format and provides answers, and the CLI writes the complete state when it has everything it needs.

## Why

The goodplan repo (and any repo that used the old skills) has a `.project/` with epics, slices, architecture, learnings, and decisions — but no `project.json`, no `overview.json` files, and entities aren't registered in the CLI's state format. Running any CLI command returns `DATA_NO_PROJECT`. We need a migration path so these repos can adopt the new CLI+skills without losing existing work.

## Design

### CLI-driven question-answer protocol

The CLI owns the state format and knows exactly what it needs. The migration works as a multi-round Q&A:

```
goodplan migrate --json
→ { "questions": [
    { "id": "project-name", "question": "What is the project name?", "hint": "Check idea.md or directory name" },
    { "id": "epics", "question": "List all epics...", "hint": "Check epics/ directory structure" },
    ...
  ]}

echo '{"answers": {"project-name": "goodplan", "epics": [...]}}' | goodplan migrate --json
→ { "questions": [...next round...] }   // follow-up questions based on answers
   // OR
→ { "status": "complete", "summary": {...} }  // done — state written
```

### Key properties

- **CLI writes all state** — the LLM/skill never touches JSON files, only reads old-format artifacts to answer questions
- **CLI validates answers** — rejects invalid data, asks for corrections
- **Multi-round** — first round asks about project and entity inventory, subsequent rounds ask per-entity details based on the inventory
- **Testable without LLM** — answers can be provided manually or scripted
- **Format-independent** — if the CLI state format changes, only the questions change, not the skill

### What the skill does

The `/migrate` skill (or a prompt) reads old `.project/` artifacts to answer CLI questions:
- Reads directory names to find epics, slices, quests (handling `__active__`, `~~archived~~`, `side-quests/` conventions)
- Reads `goal.md`, `idea.md`, `conventions.md` for content
- Infers entity status from artifact presence (completion/learnings.md → completed, plan-refined.md → plan-refined, etc.)
- Reports the active epic (from `__active__` prefix or `state.md`)
- Lists slice sequences from `sequencing.md`

### What the CLI does

- Asks structured questions with hints about where to find answers
- Validates answer shapes (expected types, required fields)
- Creates `project.json`, entity JSON files, overview files
- Normalizes directory names (strips `__active__`, `~~archived~~` prefixes)
- Preserves all existing markdown artifacts
- Writes `activity-log.jsonl` migration entry

## Success Criteria

- [ ] `goodplan migrate --json` starts the Q&A protocol with structured questions
- [ ] Answers can be provided via stdin JSON (LLM or human)
- [ ] Multi-round: follow-up questions based on initial answers
- [ ] CLI validates answers and rejects invalid data with clear errors
- [ ] After complete migration, `goodplan status --json` returns valid project state
- [ ] `goodplan epic:list`, `slice:list`, `quest:list` all work correctly
- [ ] All existing markdown artifacts preserved (zero data loss)
- [ ] Directory names normalized (`__active__` → bare, `side-quests/` → `quests/`)
- [ ] Running on the goodplan repo itself produces a working CLI-managed `.project/`
- [ ] After migration, new CLI-integrated skills can be installed at `~/.claude/skills/` and used

## Scope Boundaries

**In scope:** `goodplan migrate` command, Q&A protocol, answer validation, state construction, directory normalization, `/migrate` skill or prompt that answers CLI questions

**Out of scope:** Onboarding repos with no `.project/` (separate quest), migrating `state.md` content (eliminated), complex content transformations (just inventory and status inference)
