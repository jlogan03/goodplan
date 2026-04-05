# CLI Commands Research

## 1. epic:list Command
**EXISTS** at `src/commands/epic/list.ts`. Returns `{ items: Array<{ name, status, created, completed }> }`. Supports `--json`, `--query`, `--quiet`, `--limit`, `--offset`.

## 2. epic:activate Promotion Behavior
**NO** — `epic:activate` does NOT copy/move `architecture-proposal/` to `architecture/`. The `handleActivateEpic` function in `src/core/state/transitions/epic-lifecycle.ts` (lines 25-88) only sets epic status from `slices-refined` → `activated` and sets `project.activeEpic`. No filesystem directory manipulation. The start-epic skill must handle architecture-proposal promotion itself.

## 3. Stale References in epic-conventions.md
**NONE FOUND** — `skills/_shared/references/epic-conventions.md` already uses correct `/gp:` prefixed names. No stale references.

## 4. epic:complete Payload Format
**Schema**: `completeEpicInputSchema` at `src/schemas/commands/epic.ts` (lines 22-30):
```
{
  epic: string (required),
  verificationResults: Array<{index: number, passed: boolean, notes?: string}> (required, non-empty),
  learnings: Array<learningInputSchema> (optional, defaults to [])
}
```

**learningInputSchema** at `src/schemas/records/learning.ts` (lines 28-35):
```
{
  category: "domain" | "worked" | "didnt-work" | "do-differently" (required),
  summary: string (required, min 1 char),
  detail: string (required, min 1 char),
  tags: Array<string> (required),
  rollupTo: Array<"epic" | "project"> (required),
  validUntil: Array<string> (optional)
}
```

RPC layer (`src/core/rpc/complete.ts`, lines 125-150) maps `LearningInput` to `LearningEventEntry` by deriving a slug from `summary` and setting `file: learnings/{slug}.md`.
