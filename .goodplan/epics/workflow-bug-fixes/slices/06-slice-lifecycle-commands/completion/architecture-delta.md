# Architecture Delta: Slice 06 — Slice Lifecycle Commands

## Alignment

- All 21 slice commands match `architecture/commands.md:93-117` exactly
- Event naming conventions follow the two-level discriminant pattern (`domain: 'entity-lifecycle'`)
- Dependency direction respected: commands import from engine/context/schemas, never the reverse
- Event scope invariant maintained: all slice/chunk events go to `epics/<name>/events.jsonl`

## Modifications

### Command Layer — shared helper extraction
- **Added** `src/commands/_shared/command-context.ts` — shared boilerplate extraction for ~45 command files
- **Effect**: Reduces coupling between individual commands and engine internals; single place to update event-command wiring

### Schemas — slice artifact types
- **Added** `src/schemas/entities/slice-artifacts.ts` — `DeferredItemSchema` and `ArchitectureDeltaSchema`
- **Effect**: Provides typed schemas for structured data in `slice-landed` payload; reusable by skills and agents

### Invariant Engine — rule corrections
- **Fixed** 2 invariant rules with event name drift (stale names from spec iteration)
- **Effect**: Chunk lifecycle invariants now correctly reference actual event names

## Drift

### ContextBundle phase parameter
`code-refine-start.ts` passes `"P10"` to `buildContextBundle` but architecturally represents P11 (code refinement). This may produce incorrect context bundling if the bundler has phase-specific behavior. Needs verification.

### v1 fallback shim
`slice:list` and `slice:show` include v1 state fallback logic not described in the v2 architecture. This is intentional transitional code with TODO markers for removal after slice 12.

## Gaps

### Side-quest commands not yet implemented
`architecture/commands.md:119-134` defines 12 side-quest commands. These are out of scope for this slice but represent the next command surface to build.

### learningInputSchema still v1
The `slice:land` command reuses `learningInputSchema` from `src/schemas/records/learning.ts` (v1 schema). Migration to a v2 event-native schema is deferred to slice 07.
