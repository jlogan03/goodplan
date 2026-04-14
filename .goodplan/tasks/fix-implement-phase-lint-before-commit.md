# Implement-phase commits code that fails lint

## Problem

During E2E validation (2026-04-13), the Implementation quality metric failed because `bun run lint` found errors in the implemented code:
```
FAIL: Implementation -- phase >= P10: PASS, build: PASS, lint: FAIL, test: PASS
```

The implement-phase agent ran `bun test` (which passed) but didn't run lint before committing, so lint-failing code was committed.

## Expected Behavior

Before committing any chunk, the implement-phase should:
1. Run `bun test` — confirm tests pass
2. Run `bun run lint` — confirm lint passes
3. Run `bun run build` — confirm build passes
4. Only then call `chunk-verify` and git commit

All three should be gates, not just tests.

## Fix

Update `plugin/agents/implement-phase.md` to require running lint+build+test before chunk-verify. Or add a CLI invariant that chunk-verify requires evidence of all three (lint passing, tests passing, build passing).

## Impact

- Code quality degrades over time if lint failures slip through
- Biome/ESLint issues accumulate
- Downstream code review finds problems that should have been caught at implement time

## Files

- `plugin/agents/implement-phase.md` — add lint+build as mandatory gates
- Or: `src/commands/slice/chunk-verify.ts` — require structured evidence fields
