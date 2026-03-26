# Side Quest: Migrate Pre-CLI .project/ to CLI Format

## What We're Building

A `goodplan migrate` CLI command that drives a question-answer conversation to collect all the information needed to construct valid CLI-managed state from an existing pre-CLI `.project/` directory. The CLI asks questions, the LLM (or a human) reads the old format and provides answers, and the CLI writes the complete state when it has everything it needs.

## Why

The goodplan repo (and any repo that used the old skills) has a `.project/` with epics, slices, architecture, learnings, and decisions — but no `project.json`, no `overview.json` files, and entities aren't registered in the CLI's state format. Running any CLI command returns `DATA_NO_PROJECT`. We need a migration path so these repos can adopt the new CLI+skills without losing existing work.

## Design

### CLI-driven question-answer protocol

The CLI owns the state format and knows exactly what it needs. The migration works as a multi-round Q&A:

### Schema-driven question generation

Questions are derived from dedicated Zod "migration phase" schemas — small, focused schemas that each represent one logical chunk of information. The CLI walks these phases in order, emitting each phase's JSON Schema (via `z.toJSONSchema()`) as the `responseSchema` for the question. The LLM fills in the response, the CLI validates it against the same Zod schema, and moves to the next phase.

Phase schemas are separate from entity schemas (not tagged fields on the main schemas) so they can be small, self-contained, and independently testable. The CLI uses the phase answers to construct full entity state internally.

**Phase structure:**
- **Phase 1 (inventory):** Project name/goal, list of epics with names and statuses, list of quests
- **Phase 2 (per-epic details):** Emitted once per epic from phase 1 — slices, activation date, architecture presence
- **Phase 3 (per-slice details):** Emitted once per slice from phase 2 — status, refinement state, implementation state
- **Phase N:** Additional phases as needed — the CLI drives iteration based on previous answers

Each question includes a `responseSchema` so the LLM knows the exact shape to return:

```
goodplan migrate --json
→ { "questions": [
    {
      "id": "project",
      "question": "What is the project name and goal?",
      "hint": "Check idea.md for the goal, use the directory name for the project name",
      "responseSchema": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "goal": { "type": "string" }
        },
        "required": ["name", "goal"]
      }
    },
    {
      "id": "epics",
      "question": "List all epics with their names, goals, and current status",
      "hint": "Check epics/ directory. Strip __active__ and ~~archived~~NN_ prefixes for names. Infer status from artifacts: completion/learnings.md → completed, abandoned.md → abandoned, architecture/_overview.md without slices → architecture-defined, etc.",
      "responseSchema": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "goal": { "type": "string" },
            "status": { "type": "string", "enum": ["created", "explored", "architecture-defined", ...] },
            "isActive": { "type": "boolean" }
          }
        }
      }
    }
  ]}

echo '{"answers": {"project": {"name":"goodplan","goal":"..."}, "epics": [...]}}' | goodplan migrate --json
→ { "questions": [...per-epic follow-ups based on inventory...] }
   // OR
→ { "status": "complete", "summary": {...} }
```

### Key properties

- **Phased schemas** — dedicated Zod migration phase schemas (separate from entity schemas) keep each question small and manageable. The CLI iterates phases based on previous answers (e.g., one per-epic detail phase per epic discovered in inventory).
- **Schema-generated questions** — `z.toJSONSchema()` produces the `responseSchema` for each question automatically. Adding a field to a phase schema adds it to the question.
- **CLI writes all state** — the LLM/skill never touches JSON files, only reads old-format artifacts to answer questions
- **CLI validates answers** — against the same Zod schemas used for normal operation
- **Multi-round** — first round asks about project and entity inventory, subsequent rounds ask per-entity details based on the inventory
- **Testable without LLM** — answers can be provided manually or scripted
- **Format-independent** — if schemas change, questions update automatically

### What the skill does

The `/migrate` skill reads old `.project/` artifacts to answer CLI questions:
- Reads directory names to find epics, slices, quests (handling `__active__`, `~~archived~~`, `side-quests/` conventions)
- Reads `goal.md`, `idea.md`, `conventions.md` for content
- Infers entity status from artifact presence (completion/learnings.md → completed, plan-refined.md → plan-refined, etc.)
- Reports the active epic (from `__active__` prefix or `state.md`)
- Lists slice sequences from `sequencing.md`
- Returns answers in the exact `responseSchema` shape the CLI requested

### What the CLI does

- Generates questions from Zod schema `.describe()` annotations, grouped into logical units
- Emits `responseSchema` with each question so the LLM knows the expected answer shape
- Validates answers against the Zod schemas
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
