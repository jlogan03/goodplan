# Slice Goal: `/explore`

## What We're Building

A skill that runs an iterative brainstorm/research/prototype loop scoped to either the whole project or a specific slice/quest. Continues until the user decides enough has been captured, then writes `explore-complete.md`.

## Behavior

1. Determine scope using Option C:
   - Read `state.md` for active slice/quest
   - No active scope → project-level
   - Active scope found → use that scope
   - Explicit argument (e.g., `/explore slice/user-auth`) → use that, ignore state.md
   - Announce the inferred scope and confirm before proceeding
2. Within the loop, offer three modes the user can choose from each iteration:
   - **Research** — spawn sub-agents to investigate specific topics in parallel; write findings to `research/<topic>.md` in the scoped directory
   - **Brainstorm** — interactive conversation to explore ideas, options, decisions; capture output to `brainstorm/<topic>.md`
   - **Prototype** — interactive session to try an approach (UI mockup, algorithm sketch, integration test); project-level only; output goes to `.project/prototypes/<name>/`
3. After each iteration, ask: "Keep exploring, or are we done?"
4. On exit: write `explore-complete.md` with a summary of what was explored and key conclusions. Update `state.md` and `flow-log.jsonl`.
5. Offer to skip (write `explore-skipped.md`) if the user already has enough context.

## Scope Path Mapping

| Scope | research/ path | brainstorm/ path |
|---|---|---|
| Project-level | `.project/research/` | `.project/brainstorm/` |
| Slice | `.project/vertical-slices/<name>/research/` | `.project/vertical-slices/<name>/brainstorm/` |
| Side quest | `.project/side-quests/<name>/research/` | `.project/side-quests/<name>/brainstorm/` |

## Success Criteria

- Run `/explore` with no arg when no slice is active → confirms "project-level", runs loop, output lands in `.project/brainstorm/` and/or `.project/research/`
- Run `/explore` with no arg when a slice is active in `state.md` → confirms that slice's scope, output lands in the slice's directories
- Run `/explore slice/some-slice` explicitly → uses that scope regardless of `state.md`
- On exit, `explore-complete.md` exists in the right directory with a useful summary
- Prototyping mode only offered at project-level; gracefully declined at slice/quest scope
