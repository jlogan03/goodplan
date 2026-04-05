# Test Harness Guidelines

## Three-World Model

This repo develops a plugin that is ALSO installed in the user's Claude Code session. Never confuse:

1. **Repo source** (`skills/`, `src/`, `agents/`) — what we edit
2. **Installed plugin** (`~/.claude/plugins/cache/...`) — frozen release; NEVER read, write, or reference
3. **Test harness** (`tools/dogfood/`) — builds from repo, runs against `dist/gp-plugin/` in `/tmp` fixtures

| Action | Correct | Wrong |
|--------|---------|-------|
| Edit skills | `skills/<name>/SKILL.md` | `~/.claude/plugins/cache/...` |
| Build | `bun run build` | — |
| Test | Harness against `dist/gp-plugin/` | Against installed plugin |
| Understand behavior | Read repo source | Read installed cache |

## Harness Isolation

Every `query()` call must use:
- `settingSources: []` — no user config leakage
- `plugins: [{ type: "local", path: PLUGIN_DIR }]` — local build only
- `env: createTestEnv(PLUGIN_DIR)` — filtered PATH, no cache access

If the local plugin path doesn't work, that's a harness bug to fix — never touch `~/.claude/plugins/cache/`.

## E2E Validation Runs

Always use `--model claude-opus-4-6` (or omit `--model` — default IS opus). Never downgrade to sonnet. Sonnet produces different output that makes runs non-representative, wasting the full run cost and requiring a re-run.

## Quality Metrics Principle

**Every metric must test whether the skill/CLI pipeline worked correctly. Never test LLM prose quality.**

Before adding any metric check, ask: "Would this fail if the LLM produced correct but terse output?" If yes, it's testing the wrong thing.

### Bad metrics (model-dependent, not pipeline bugs)
- Character or word count thresholds
- Requiring specific heading counts
- Requiring IMPORTANT/CRITICAL severity in reviews (a clean plan is a success, not a failure)
- Requiring multiple phases (simple work = single phase = correct)

### Good metrics (deterministic, proves tooling works)
- Files exist at expected paths (skill wrote output)
- CLI status shows correct post-transition state (state machine accepted the work)
- CLI-injected fields present — `source`, `file` (content went through the CLI, not direct writes)
- Cross-scope rollup happened (multiple sources in learnings = rollup pipeline ran)
- Build/lint/test pass (implementation produces valid code)

### Current metrics in validate-consolidated.ts

| Metric | What it proves |
|--------|---------------|
| Architecture | `_overview.md` at project + epic level, CLI discovers files |
| Plan Structure | Plan file exists and references codebase paths |
| Review Loop | Refined plan exists, CLI status is post-refinement |
| Implementation | Build, lint, tests pass on implemented code |
| Learnings | Valid categories, CLI source fields, file paths, multi-source rollup |
| Orchestrator Discipline | No artifact read violations |

## Writing New Tests

Use the Agent SDK pattern from `utils.ts`. Don't ask the user to run manual Claude Code sessions — write a harness script instead.

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
// Use createTestEnv(PLUGIN_DIR) for isolation
```
