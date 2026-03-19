# Phase 2: `/create-initiative` Skill

Rename `/start-project` to `/create-initiative`. Two modes: project setup + first initiative, or new initiative on existing project.

### Tasks

- [x] **Rename skill directory**: `mv ~/.claude/skills/start-project ~/.claude/skills/create-initiative`. Update SKILL.md frontmatter (name, description, triggers).

- [x] **Update SKILL.md — Mode A (no `.project/`)**: Existing project setup behavior stays (idea capture, `.project/` directory structure, expertise calibration, CLAUDE.md). Changes:
  - Replace `mkdir vertical-slices` with `mkdir -p initiatives/__active__initial` — create `initiatives/__active__initial/goal.md` (derived from idea conversation) instead of top-level `vertical-slices/`
  - Do NOT create top-level `vertical-slices/` — slices live inside initiatives
  - Create top-level directories: `brainstorm/`, `research/`, `prototypes/`, `decisions/`, `flow-log/`
  - Create `initiatives/` directory
  - Reference `initiative-conventions.md` for directory structure
  - State.md Active Slice: `initiatives/__active__initial` (so `/define-architecture` can resolve the initiative path)
  - State.md Next Step: `"/explore or /define-architecture"` (same format as current `/start-project`; scope resolution will find the active initiative automatically via Active Slice)

- [x] **Update SKILL.md — Mode B (`.project/` exists)**: New behavior:
  - Interactive goal capture for the new initiative
  - Auto-detect initiative name from conversation (kebab-case, 2-4 words). If unclear, ask via AskUserQuestion.
  - Create `initiatives/<name>/goal.md`
  - Do NOT make it `__active__` — that's `/start-initiative`'s job
  - Multiple initiatives may exist simultaneously in exploration/proposal states. Only one can be `__active__` at a time, but creating a new initiative while another is active (or in proposal) is allowed.
  - If an `__active__` initiative exists, notify the user: "Note: Initiative '<name>' is currently active. Your new initiative can be explored and proposed, but won't be buildable until the active initiative completes or is abandoned."
  - State.md Next Step: `/explore <initiative-path>` or `/define-architecture <initiative-path>`

- [x] **Update references**: Update any reference files (guidance.md, etc.) to reflect new directory structure and dual-mode behavior.

- [x] **Update all cross-skill references**: Grep `~/.claude/skills/` for references to `start-project` or `/start-project` and update to `create-initiative` / `/create-initiative`. This includes:
  - `workflow.md` in the repo
  - Other skills' SKILL.md files that reference `/start-project` in their descriptions or next-step suggestions
  - `project-status/references/status-logic.md` state-to-next-skill mapping
  - `decisions-format.md` Writer/Reader lists
  - Any other shared references

### Verification

- Read updated SKILL.md. Confirm Mode A creates `initiatives/__active__initial/` and Mode B creates non-active initiative.
- Grep `~/.claude/skills/` for remaining `start-project` references — should be zero.
- Grep repo for remaining `/start-project` references — update those too.
- Confirm Mode A does NOT create top-level `vertical-slices/`.
- Smoke test: run Mode A in a temp directory, verify `initiatives/__active__initial/goal.md` exists and `vertical-slices/` does not.
