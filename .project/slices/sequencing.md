# Vertical Slice Sequencing

## Naming Convention

Vertical slice directories are prefixed with a two-digit sequence number (`NN-slice-name`) so the order is visible in the filesystem. Side quests have no prefix — they're unordered.

## Order and Rationale

| # | Directory | Depends On | Rationale |
|---|---|---|---|
| 1 | `01-start-project` | — | Creates the `.project/` filesystem and writes the first CLAUDE.md project context. Building it first gives us a real example of `idea.md`, `flow-log.jsonl`, and `state.md` to reference when building subsequent skills. |
| 2 | `02-project-status` | `01-start-project` (defines file formats) | Reads the filesystem created by `start-project`. Building it second means we have real artifacts to test against, and it forces us to finalize state.md and flow-log conventions before every other skill starts using them. |
| 3 | `03-explore` | `02-project-status` (conventions locked) | Scope detection reads `state.md`; output written to directories established by `start-project`. Conventions need to be locked first. |
| 4 | `04-define-architecture` | `03-explore` (may read exploration output) | Reads idea.md and exploration output. Building after `explore` means we can test with real exploration artifacts. |
| 5 | `05-define-slices` | `04-define-architecture` (reads architecture) | Reads architecture and conventions to write well-grounded slice goals. |
| 6 | `06-create-plan` | `05-define-slices` (reads slice goals); inspect existing `/refine-plan` and `/implement-plan` for plan format | Output must be directly consumable by existing skills — inspect those skills as part of this slice. |
| 7 | `07-complete-slice` | `06-create-plan` (understand full slice lifecycle) | Closes out the lifecycle started by `create-plan`. Building last means we understand the full shape of a slice's artifacts. |

## Notes

- No slice depends on a previous slice being *deployed* — only that its file format conventions are understood.
- Side quests are created conversationally as needed; no slice for that.
- Git workflow (branching, PRs) is handled conversationally; no slice for that.
