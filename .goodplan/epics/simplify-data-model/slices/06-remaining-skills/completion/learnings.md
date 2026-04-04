# Learnings: 06-remaining-skills

## Agent SDK skill discovery requires installed plugin cache sync, not just local plugin path
_Source: 06-remaining-skills_

The Agent SDK `plugins: [{ type: "local", path: PLUGIN_DIR }]` option alone is insufficient for skill discovery — skills must also be synced to the installed plugin cache at `~/.claude/plugins/cache/goodplan-marketplace/goodplan/<version>/`. Test harnesses must rsync new skills and agents from `dist/gp-plugin/` to the cache before invoking `runSkillSession`. The `test-create-epic.ts` harness had this pattern; new harnesses initially missed it, causing "Unknown skill" errors.

## Agent SDK skill invocation requires systemPrompt.append, not slash command resolution
_Source: 06-remaining-skills_

Slash commands like `/gp:init` in the `prompt` field are not reliably resolved by the Agent SDK from local plugin paths. The working pattern is: read the SKILL.md body, inject it into `systemPrompt.append`, and use a natural language prompt like `"Run /gp:init. Initialize this project..."`. This was the pattern used by `test-create-epic.ts` and `test-audit.ts` from the start.

## Audit agents must stay read-only — orchestrator owns file writes
_Source: 06-remaining-skills_

Initial implementation gave audit agents `allowedTools: ["Read", "Grep", "Glob"]` but instructed them to write reports. Reviewers caught the contradiction. Resolution: agents return structured JSON; the orchestrator writes the report file. This is consistent with the orchestrator pattern where the orchestrator owns all filesystem mutations.

## Orchestrator refinement loops need per-iteration context bundle reload
_Source: 06-remaining-skills_

The create-side-quest skill initially loaded the context bundle once and reused it across refinement iterations. Reviewers identified that this means reviewers and editors operate on stale context after the first edit. Fix: reload via `start-plan --quest <name> --inline --json` at each iteration, matching the create-epic pattern.

## Haiku-tier models cannot drive multi-phase pipeline orchestrators
_Source: 06-remaining-skills_

The create-side-quest full pipeline E2E test consistently fails at haiku tier ($1.99/run, 980s) with 67 artifact read violations and incomplete quest lifecycle. The error path test (which validates code correctness without requiring multi-phase orchestration) passes reliably. This confirms the slice-02 learning: haiku validates mechanics, not workflow quality. E2E pipeline tests need sonnet/opus.

## Concurrent E2E tests corrupt shared dist directory
_Source: 06-remaining-skills_

Running multiple E2E test harnesses in parallel causes `build:plugin` races that corrupt `dist/gp-plugin/`. Tests that run `bun run build:plugin` as a preflight step must be run sequentially, not in parallel, unless they use separate output directories.
