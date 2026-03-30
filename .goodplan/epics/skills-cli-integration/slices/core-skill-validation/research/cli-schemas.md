# CLI Schema Research — Slice 03

## R1: Payload Shapes

**slice:complete**: `{ verificationPassed: boolean, deferred?: [...], learnings?: [...], architectureDelta?: [...] }`
**quest:complete**: `{ verificationPassed: boolean, learnings?: [...], architectureDelta?: [...] }` (no deferred)
**epic:complete**: `{ verificationResults: [{ index: number, passed: boolean, notes?: string }, ...] }` (min 1 item, NO learnings/architectureDelta)

## R2: Artifacts Object

Slice/quest artifacts: `{ abandoned, exploreComplete, goal, implementation, plan, planRefined }` — **no completion field**. Re-entry detection must use status value or filesystem stat.

## R3: Slice Status Values

`created → planning → plan-created → refining → plan-refined → implementing → implementation-complete → completed` (+ `abandoned`)

Key: `implementation-complete` is the target for auto-detect. `slice:list` does NOT support status filtering — use `state --json --query` to filter.
