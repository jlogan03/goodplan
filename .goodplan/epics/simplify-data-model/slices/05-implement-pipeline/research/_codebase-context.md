# Codebase Context — Slice 05 Implement Pipeline

## Fresh Documentation
- `.goodplan/architecture/_overview.md` — current system architecture (4-layer stack)
- `.goodplan/epics/simplify-data-model/architecture/_overview.md` — epic target: 19→12 skills, orchestrator pattern
- `.goodplan/epics/simplify-data-model/architecture/conventions.md` — orchestrator conventions, agent conventions, testing conventions
- `.goodplan/epics/simplify-data-model/architecture/skill-model-api.md` — 12 skill inventory, pipeline vs standalone
- `.goodplan/epics/simplify-data-model/architecture/test-harness-api.md` — LLM-simulated user responses, phase verification
- `.goodplan/conventions.md` — tech stack (Bun, TypeScript, Vitest, Biome), repo structure

## Established Patterns (from completed slices 02, 04)
- **Agent definitions**: 14 existing files in `agents/` — all use `name`, `description`, `model: opus` frontmatter + `@${CLAUDE_PLUGIN_ROOT}/` references for shared content
- **Orchestrator skills**: `skills/plan-slice/SKILL.md` (2-phase) and `skills/create-epic/SKILL.md` (6-phase) — both follow context discipline, use `$GP` variable, phase tables, CLI status mapping
- **Test harness**: `tools/dogfood/test-plan-slice.ts` and `tools/dogfood/test-create-epic.ts` — Agent SDK `query()`, plugin loading, `verifyOrchestratorDiscipline()`, `--model` parameter
- **Build pipeline**: `build-plugin.sh` already copies `agents/` to dist (added in slice 02)

## Existing Skills Being Replaced
- `skills/implement-plan/SKILL.md` — current implementation orchestrator (~260 lines, rich feature set: red-green cycle, research, stall detection, 12-iteration cap, reviewer registry)
- `skills/complete/SKILL.md` — current completion skill (~260+ lines: learnings synthesis, architecture review, project-health, debt eval, signal tracking, remaining slice review)
- Both are fully functional and serve as the feature reference for the new consolidated versions

## Key Conventions
- CLI binary at `${CLAUDE_PLUGIN_ROOT}/binaries/macos-arm64/gp` — not on PATH
- All CLI queries use `--json`, stdin for payloads
- Orchestrator context discipline: no Read on architecture/plan/source files
- Sub-agent return format: `{ status, summary, filesWritten, ... }` (see conventions.md)
- `review_context: "code-implementation"` is defined in conventions but this is the first skill to exercise it
- `completion-phase` agent is new — no prior art for dual-mode agents in this codebase
