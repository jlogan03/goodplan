# Codebase Context — Integration Test Plan (Slice 08)

Generated: 2026-03-23

## Fresh Documentation

- `.project/conventions.md` — tech stack, repo structure, testing conventions (Vitest 4.x, temp dirs, no mocks)
- `.project/epics/__active__goodplan-cli/architecture/invariants.md` — 7 architectural invariants (INV-001 through INV-007)
- `.project/epics/__active__goodplan-cli/architecture/data-layer-api.md` — assembleState/commitState/loadState API
- `.project/epics/__active__goodplan-cli/architecture/state-machine-api.md` — pure reducer, StateEvent union
- `.project/epics/__active__goodplan-cli/architecture/commands-api.md` — CLI command surface

Architecture files updated 2026-03-23, plan written 2026-03-22. Architecture is slightly newer due to skills-migrate slice completion (non-impacting — skills-migrate didn't change core APIs).

## Key Codebase Facts

### Test Framework
- **Vitest 4.x** via `bun test` (package.json maps `test` → `vitest`)
- Plan references `bun test` which works, but helpers should use Vitest APIs (`describe`, `it`, `expect`, `beforeAll`)
- 61 existing unit tests in `tests/unit/`
- `tests/integration/` and `tests/fixtures/` contain only `.gitkeep`

### Binary
- Build: `bun build --compile src/index.ts --outfile goodplan`
- Version: hardcoded `"goodplan 0.0.1\n"` in `src/index.ts` line 62
- Error handling: exit 1 (internal), 2 (validation), 3 (state machine)
- Global `--json` flag parsed pre-dispatch

### Key Functions
| Function | Location | Notes |
|---|---|---|
| `assembleState(projectDir?)` | `src/core/data/assemble.ts:30` | Returns ZERO_STATE if no dir |
| `commitState(projectDir, old, new)` | `src/core/data/commit.ts:30` | Atomic writes + concurrent mod detection |
| `loadState(projectDir?)` | `src/core/data/load.ts:45` | Caching via .state-cache.json |
| `atomicWrite()` | `src/core/data/commit.ts:201-224` | writeFileSync(tmp) + renameSync |
| `checkConcurrentModification()` | `src/core/data/commit.ts:232-255` | Compares on-disk vs oldContent |

### Missing: EVENT_TYPES
- `StateEvent` is a discriminated union with 37 event types in `src/schemas/state-events.ts`
- `handlerRecord` in `reduce.ts` uses `satisfies` for compile-time exhaustiveness
- No runtime `EVENT_TYPES` array exists — plan allows creating this as the one production code change

### Testing Helpers
- `GOODPLAN_DIR` env var overrides `.project/` location — useful for integration tests
- Existing unit tests use `mkdtempSync` + inline JSON for fixtures
- No vitest.config.ts exists — tests run with defaults; integration tests may need longer timeouts

## Potential Issues
1. Plan says "Bun.spawnSync" for binary spawning — works but child_process is more standard for compiled binary testing
2. No vitest workspace config — integration tests with binary compilation may need separate timeout config
3. Plan's error code names (STATE_SLICE_NOT_FOUND, STATE_GUARD_FAILED, STATE_MAX_ROUNDS_REACHED) need verification against actual error codes in src/util/errors.ts
4. Schema validation happens on both read (assembleState) and write (commitState) — fitness function coverage is straightforward
