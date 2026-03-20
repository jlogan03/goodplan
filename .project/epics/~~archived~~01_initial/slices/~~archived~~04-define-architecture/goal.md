# Slice Goal: `/define-architecture`

## What We're Building

A skill that interactively drives architecture decisions until `architecture/` is fully populated and the user is satisfied. Also captures project-level conventions and updates CLAUDE.md with the full project context section.

## Behavior

1. Read `idea.md`, any exploration output (`brainstorm/`, `research/`, `prototypes/`), and existing `architecture/` files (if partially done — skill is re-entrant).
2. Ask structured questions in two phases:
   - **Project Conventions** — tech stack, language/framework choices, repo structure, dependency management, file naming, code style, testing approach → writes `.project/conventions.md`
   - **Architecture** — system overview, subsystems and their boundaries, data model, key flows, information architecture, UI/UX direction (if applicable), subsystem API contracts → writes `architecture/` files
3. For each area, present a draft based on what's known, ask for corrections/additions, iterate until the user is satisfied.
4. Write files incrementally — don't wait until all questions are answered.
5. On completion, update `CLAUDE.md` with the full Project Context section (all architecture file references, conventions, brainstorm, research, prototypes, side-quests directories).
6. Update `state.md` and append to `flow-log.jsonl`.

## Files Written

- `.project/conventions.md`
- `.project/architecture/_overview.md`
- `.project/architecture/conventions.md`
- `.project/architecture/data-model.md` (if applicable)
- `.project/architecture/<subsystem>-api.md` (one per subsystem, as needed)
- `.project/architecture/flows.md` (if applicable)
- `.project/architecture/information-architecture.md` (if applicable)
- `.project/architecture/ui-ux.md` (if applicable)
- Updated `CLAUDE.md`

## Success Criteria

Run on a test project that has `idea.md` and some exploration output. After the conversation:

- All relevant `architecture/` files exist and are coherent with each other
- `conventions.md` captures concrete, actionable conventions (not vague generalities)
- `CLAUDE.md` Project Context section lists all the right files in the "always read" and "check if relevant" groups
- Running `/project-status` after completion recommends `/define-slices` as the next step
- Re-running the skill on a partially-complete `architecture/` skips already-answered areas and focuses on gaps
