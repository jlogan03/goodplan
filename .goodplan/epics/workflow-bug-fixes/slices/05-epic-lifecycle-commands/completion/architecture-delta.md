# Architecture Delta — 05-epic-lifecycle-commands

## Alignment

- **Context Layer** implemented as specified: `src/context/` with `bundler.ts`, `types.ts`, `phase-specs.ts`, `token-estimate.ts`, and barrel `index.ts`. Matches the architecture overview subsystem map.
- **Command Layer** epic commands follow the `defineCommand` + `appendEvent` + `InvariantError` pattern specified in `commands.md`.
- **Layer boundaries** respected: context imports engine + schemas only; engine does not import context or commands. Verified by fitness test.
- **Event scoping** implemented as designed: epic events in `.goodplan/epics/<name>/events.jsonl`, not project scope.
- **ContentRef storage** in `src/engine/content/store.ts` and resolution in `src/engine/content/resolve.ts` are engine-layer utilities as expected.

## Drift

1. **`context-helper.ts` added to command layer** — The architecture did not specify a shared helper for context bundle integration. Implementation added `src/commands/epic/context-helper.ts` which wraps `buildContextBundle` + `computeDerivedState` + `readContentRef`. This is architecturally sound (commands layer can import everything) but is an emergent pattern not in the spec.

2. **V1 files retained alongside v2** — The architecture assumed a clean replacement. In practice, v1 files like `explore.ts`, `define-architecture.ts`, `define-slices.ts` remain on disk (just not registered in `main.ts`). This creates dead code.

3. **`storeContentRef` is async but uses `execSync`** — The function signature is `async` (returns `Promise<ContentRef>`) but the implementation is synchronous (`execSync`). This is a minor API inconsistency.

## Gaps

1. **No schema validation in commands** — The architecture spec mentions `gp schema --events` for payload validation and typed event schemas. While `EpicEventMap` exists, commands do not validate payloads against these schemas before appending events. The invariant engine catches structural issues but not schema mismatches.

2. **Reference path conventions are hardcoded** — `getReferenceInfo()` in `bundler.ts` returns hardcoded paths like `.goodplan/architecture-current.md`. These should ideally come from project configuration or derived state, not be baked into the bundler.

3. **No `--query` (jq) integration tested** — The architecture specifies `--query <jq>` as a global flag. Commands accept it via `globalArgs` but the e2e tests do not exercise jq filtering.

## Emergent Patterns

1. **`buildEpicContextBundle` as a shared helper** — Should be documented as the canonical pattern for phase-starting commands. Slice and side-quest commands (slices 06-07) should follow the same pattern with `buildSliceContextBundle` / `buildSideQuestContextBundle`.

2. **Advisory context bundles** — The try/catch-and-return-undefined pattern for context bundles establishes that bundles are optimization hints, not correctness requirements. This should be explicit in the architecture docs.
