# TUI & CLI Review — Round 4

## Round 3 Resolution Assessment

Round 3 had 3 IMPORTANT issues and 4 MINOR issues.

**IMPORTANT-1** (abandon commands missing `--reason`): RESOLVED. All three abandon commands now show `--reason <text>` in their lifecycle signatures.

**IMPORTANT-2** (`epic:complete` missing `verificationResults` stdin doc): RESOLVED. Stdin Input Examples section now has a concrete JSON example with `verificationResults` array.

**IMPORTANT-3** (`COMPLETE_IMPLEMENTATION` absent from mapping table): RESOLVED. `submit-implementation` → `COMPLETE_IMPLEMENTATION` (or `COMPLETE_QUEST_IMPLEMENTATION`) now appears in the mapping table.

**MINOR-1** (create commands missing input doc): RESOLVED. Stdin Input Examples section now has examples for `epic:create`, `quest:create`, and `decision:create`.

**MINOR-2** (`--override` not in global flags table): RESOLVED. `--override` is now in the Global Flags table with a clear description and the list of commands it applies to.

**MINOR-3** (`quest:start` event mapping): RESOLVED. `quest:start` → `BEGIN_QUEST` now appears in the mapping table.

**MINOR-4** (help text quality): RESOLVED. A "Help Text Quality" contract section now requires `description` fields on all citty command definitions and flags.

All 7 round-3 issues are resolved. Round 4 focuses on the remaining gaps.

## Issues

### IMPORTANT-1: `slice:complete` and `quest:complete` stdin schemas absent from Stdin Input Examples

**Severity:** IMPORTANT
**Files:** `commands-api.md`

The Stdin Input Examples section now covers `epic:complete` (with `verificationResults`) and the create commands, but `slice:complete` and `quest:complete` — which carry the most complex payloads — have no stdin examples. The state machine events require:

```typescript
{ type: 'COMPLETE_SLICE'; slice: string; verificationPassed: boolean; deferred: DeferredItem[]; learnings: Learning[]; architectureDelta: ArchitectureDelta[] }
{ type: 'COMPLETE_QUEST'; quest: string; verificationPassed: boolean; learnings: Learning[]; architectureDelta: ArchitectureDelta[] }
```

`DeferredItem`, `Learning`, `ArchitectureDelta` are referenced throughout the architecture but never defined with their fields. The `verificationPassed` semantics note in commands-api.md explains the boolean but doesn't show the full JSON shape. An implementer must cross-reference flows.md (which shows a `slice:complete` stdin payload inline) to construct the Zod schema. This should be a first-class example in the Stdin Input Examples section, just as `epic:complete` is.

### IMPORTANT-2: `submit-*` stdin schemas undefined

**Severity:** IMPORTANT
**Files:** `commands-api.md`, `rpc-layer-api.md`

The sub-agent commands section describes `submit-*` commands as accepting "stdin JSON with the sub-agent's output (plan content, refinement scores, implementation results)" — but never defines what that JSON looks like for any submit variant. The RPC layer defines `submit(phase, target, content: SubmitInput, ...)` but `SubmitInput` is never given a shape.

Concrete gaps:
- `submit-refinement`: requires `scores: Record<string, number>` (inferred from state machine events `COMPLETE_REFINEMENT_ROUND`, `COMPLETE_REFINE_ARCHITECTURE`, etc.) — not documented at the CLI layer
- `submit-plan`: presumably accepts markdown content or a filepath — not specified
- `submit-explore`, `submit-architecture`, `submit-slices`, `submit-refine-architecture`, `submit-refine-slices`: no stdin schema documented

This is the most consequential gap for a sub-agent implementer. The sub-agent is the primary consumer of `submit-*` commands. Without stdin schemas, implementing or prompting these commands requires guessing.

### IMPORTANT-3: `--override` listed as a global flag but is not available on every command

**Severity:** IMPORTANT
**Files:** `commands-api.md`

The Global Flags table heading states "Available on every command" but lists `--override` as a member of that table. `--override` is only valid on four commands: `epic:refine-architecture`, `epic:refine-slices`, `slice:refine-plan`, and `quest:refine-plan` (and implicitly `submit-refinement`). Placing it in the "available on every command" table is architecturally incorrect — it implies an implementer should wire it up to resource reads, `status`, `init`, etc.

The round-3 fix correctly added `--override` to the table with a note listing the specific commands where it applies, but the table's own heading invalidates that scoping. `--override` should be moved out of the global flags table into a dedicated "Command-Specific Flags" section, or the table should be renamed to "Common Flags" with a note that not all flags apply to all commands.

### MINOR-1: `init` command undocumented beyond its signature

**Severity:** MINOR
**Files:** `commands-api.md`, `state-machine-api.md`

`goodplan init [--name <name>]` appears in the Global Commands list but has no description, no behavior spec, and no routing note. The state machine defines `INIT_PROJECT` with a required `name: string` field, but `--name` is shown as optional in the CLI signature. If `--name` is omitted, does the CLI prompt interactively? Use the current directory name? Fail with a validation error? The command exists in the architecture; its contract does not.

### MINOR-2: `Verification`, `DeferredItem`, `ArchitectureDelta`, `DecisionEntry` types are used but never defined

**Severity:** MINOR
**Files:** `state-machine-api.md`, `rpc-layer-api.md`, `data-model.md`

These types appear in state machine events, RPC layer interfaces, and the Stdin Input Examples but are never given field-level definitions anywhere in the architecture:

- `Verification` — used in `ADD_VERIFICATION` and `UPDATE_VERIFICATION` events; corresponds to the `verifications` array in `epic.json` (which shows `description`, `status`, `addedDuring`, `modifiedDuring` in its example but not as a typed interface)
- `DeferredItem` — used in `COMPLETE_SLICE` event and `CompleteInput`; fields never specified
- `ArchitectureDelta` — used in `COMPLETE_SLICE` and `COMPLETE_QUEST`; `architecture-deltas.jsonl` example shows `subsystem`, `type`, `description`, `ts` but it's in a prose section, not a type definition
- `DecisionEntry` — used in `UPDATE_DECISION` as `Partial<DecisionEntry>`; fields never defined

Missing type definitions mean Zod schema writers must infer field names and optionality from scattered examples, which is a source of divergence between implementation and spec.

### MINOR-3: `--inline` listed as global but produces no effect on resource and read-only commands

**Severity:** MINOR
**Files:** `commands-api.md`

`--inline` is in the "Available on every command" global flags table. Context bundling applies to workflow begin/complete operations and `start-*` commands — not to `resource:epic list`, `resource:slice show`, `status`, `schema`, or `init`. When `--inline` is passed to a resource command, it is silently ignored (the RPC/Data layer is never involved for context bundling on reads). The spec should clarify which commands meaningfully support `--inline` or note that it is silently ignored elsewhere. As written, an implementer validating the "global flags on all commands" contract will either wire up `--inline` to commands that don't need it or discover by surprise that it does nothing.

### MINOR-4: `--inline` typing mismatch in code example

**Severity:** MINOR
**Files:** `commands-api.md`

The citty command example shows `inline: { type: 'string' }` but the Global Flags table types it as `boolean or number`. A citty `type: 'string'` flag accepts any string — it would not produce a boolean when the user passes `--inline` without a value. Either the example should show how citty parses `--inline` (e.g., a custom coerce step) or the global flags table should clarify the wire type vs. the semantic type. The mismatch will cause confusion for anyone implementing the flag parsing.

## Score: 9.0/10

Round 4 is the strongest spec yet. All 7 round-3 issues are fully resolved, including the submit-implementation mapping gap, the abandon `--reason` inconsistency, and help text quality. The architecture's core design — pure state machine, unidirectional layers, stdin+flags merge, command-to-event mapping table — is well-specified.

The remaining issues are narrower in scope. Three IMPORTANTs all follow the same pattern as round-3 IMPORTANTs: the CLI surface doesn't fully document the stdin schemas for the most complex mutation commands (`slice:complete`, `quest:complete`, all `submit-*`). This is the same class of gap and will block implementers in the same way. The `--override` placement in the global flags table is a correctness issue in the spec itself (not just a documentation omission). The MINORs are type definition completeness and flag scoping clarity — real but resolvable with small additions.

## Summary

- Critical: 0
- Important: 3
- Minor: 4
