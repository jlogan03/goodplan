# Slice Goal: `/start-project`

## What We're Building

A skill that initializes a new project's `.project/` filesystem, captures the idea through conversation, and writes the initial CLAUDE.md project context section.

## Behavior

1. Check if `.project/` already exists — if so, warn and confirm before proceeding.
2. Create the full `.project/` directory structure (as defined in `workflow.md`).
3. Add `.project/state.md` to `.gitignore`.
4. Ask the user a structured set of questions to flesh out the idea: problem, desired outcome, scope, constraints, open questions.
5. Write `.project/idea.md` from the conversation.
6. Initialize `.project/flow-log.jsonl` with the first entry.
7. Write `state.md` noting that capture-idea is complete, explore loop is next.
8. Add the initial Project Context section to `CLAUDE.md` (append if it exists, create if not) with just the `idea.md` reference — other references are added by later skills.

## Success Criteria

Run `/start-project` in a fresh test directory (not this repo). After answering questions:

- `.project/` directory exists with the correct structure
- `.project/idea.md` is populated with well-structured content reflecting the conversation
- `.project/flow-log.jsonl` has one entry
- `.project/state.md` exists and reflects current phase
- `CLAUDE.md` exists and contains a Project Context section with the `idea.md` reference
- `.gitignore` includes `.project/state.md`
- Running `/project-status` (once built) in the same directory correctly identifies the phase as "explore or define-architecture"
