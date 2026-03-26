# CLI Integration Design Decisions

## Data Ownership Model (from conventions.md)

The authoritative split is documented in `.project/architecture/conventions.md` § Data Ownership:

- **JSON/JSONL**: CLI-owned. Skills never read or write these directly. All access through `goodplan` commands.
- **Free-form markdown**: LLM-owned content, CLI-owned root paths. CLI creates directories and returns paths in command responses. Skills write markdown into those directories.

Skills must NOT:
- Read `.project/*.json` or `.project/*.jsonl` directly
- Write or edit any JSON/JSONL files
- Maintain `state.md` (eliminated — CLI's `project.json` active entity fields replace it)
- Append to `activity-log.jsonl` (CLI handles this on mutations)
- Use file-existence checks for status inference (CLI's `show --json` commands replace this)

Skills DO:
- Call `goodplan` CLI commands for all state reads and mutations
- Write markdown content into directories provided by CLI command responses (`paths` in results)
- Require the `goodplan` binary (fail fast if not found)

## CLI Gaps to Address

### Gap 1: `activity:list` (unimplemented)

Already documented in commands-api.md but not built. Skills need filtered activity-log access for:
- Signal tracking (last 3 completions in `/complete`)
- Recent activity display in `/project-status`
- Completion summaries

**Resolution**: Implement the command. Straightforward build task.

### Gap 2: Scope-level phase inference

Skills currently infer workflow phase from file existence (plan.md exists? plan-refined.md? completion/learnings.md?). The CLI tracks entity status but doesn't expose artifact-level detail.

**Resolution**: Enrich `show` commands (`epic:show`, `slice:show`, `quest:show`) to include artifact existence in their `--json` output — which scope-level files exist (plan, plan-refined, implementation, completion, etc.). This moves the file-existence state machine into the CLI where it belongs.

### Gap 3: Architecture/research/brainstorm file listings

Skills need file paths (not just counts) for architecture files, research, brainstorm. Current `status --json` returns counts only.

**Resolution**: Enrich `status --json` to include file path arrays alongside counts. Also rely on RPC `PathReferences` in mutation responses — when a skill calls a mutation command, the response includes `paths` with directories the skill should use.

### Gap 4: Work stack elimination

Skills currently use `state.md` work stack to track interrupted work.

**Resolution**: Already eliminated in CLI design. `project.json` has `activeEpic`, `activeSlice`, `activeQuest` (each nullable). State machine guards enforce one-active-per-type. The CLI's active entity fields replace the work stack concept entirely. Skills query `status --json` to see what's active.

## Skill Interaction Pattern

The typical skill flow becomes:

1. **Orient**: `goodplan status --json` → understand what's active, what phase we're in
2. **Query details**: `goodplan slice:show --name X --json` → get entity details + artifact existence
3. **Mutate**: `goodplan slice:plan --json` → advance state, receive `paths` and `context` in response
4. **Write content**: Write markdown into directories from the `paths` response
5. **Submit content**: `goodplan submit-plan --json` → CLI validates and records the submission

Skills never need to:
- Track their own state between steps (CLI is the source of truth)
- Log activity (CLI logs on every mutation)
- Check file existence for status (CLI exposes this in `show` responses)

## Convention Doc Approach

Write `_shared/references/cli-interaction.md` covering:
1. Binary detection and requirement
2. Standard invocation patterns (`--json` always, parse stdout)
3. Error handling (exit codes, structured error JSON)
4. Read patterns (status, show, list)
5. Write patterns (mutations return paths, skill writes markdown there)
6. What skills must NOT do (direct file access)

Validate on 2-3 core skills, then mechanical rollout to the rest.
