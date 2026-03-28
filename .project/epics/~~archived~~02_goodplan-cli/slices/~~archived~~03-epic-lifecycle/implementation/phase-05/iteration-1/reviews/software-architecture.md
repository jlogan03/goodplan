# Software Architecture Review — Phase 05: Epic CLI Commands

**Score: 8/10**
**Critical: 0 | Important: 2 | Minor: 3**

---

## Summary

13 command files are structurally sound. Layer boundary discipline is correct: read-only commands (`list`, `show`) go directly to `loadState`/`getJson`; all mutations route through RPC (`begin` or `complete`). Stdin handling, schema validation, output modes, and registration pattern are all consistently applied.

---

## Important Issues

### 1. `epic:create` — `begin` call missing `await`

`create.ts` line 32 calls `begin(...)` without `await`. If `begin` ever returns a Promise (or is refactored to async), the result assigned to `result` will be a `Promise` object, not the actual transition result. The output block then serializes a Promise. All other mutation commands have the same pattern. Currently non-breaking only because `begin`/`complete` are synchronous — but it's a latent correctness hazard.

**File:** `src/commands/epic/create.ts:32`, same pattern in `abandon.ts`, `explore.ts`, `activate.ts`, `define-architecture.ts`, `refine-architecture.ts`, `define-slices.ts`, `refine-slices.ts`, `add-verification.ts`, `update-verification.ts`, `complete.ts`.

### 2. `epic:abandon` — redundant runtime guard duplicates citty's declarative validation

`abandon.ts` lines 36–40 manually check `if (!args.reason)` and throw a `GoodplanError`. The `reason` arg is already declared `required: true` in the citty arg definition (line 31), so citty will reject the call before `run` is ever reached. The manual guard is dead code — but it also introduces an inconsistency: `epic` is equally required yet has no such guard, and no other command duplicates citty's required-flag enforcement this way. If the manual guard is intentional as a belt-and-suspenders defense, it should be applied uniformly or removed.

**File:** `src/commands/epic/abandon.ts:36–40`

---

## Minor Issues

### 3. `completeEpicInputSchema` conflates flag and stdin fields

The schema in `src/schemas/commands/epic.ts` includes both `epic` (a CLI flag) and `verificationResults` (a stdin field) in the same Zod object. `addVerificationInputSchema` and `updateVerificationInputSchema` do the same. The `validateInput` utility merges args and stdin before validating, so this works — but the schema boundary blurs the distinction between "comes from flags" and "comes from stdin". The `createEpicInputSchema` correctly contains only stdin fields (name, goal). The inconsistency makes schemas less self-documenting and could mislead future contributors about where each field originates.

### 4. `setup()` is an empty no-op on every command

Every command file includes `setup() {}`. This is likely a citty requirement or scaffolding artifact, but it adds noise to every file without documentation explaining why it's there. If it's required by citty's interface, a comment or shared base explaining it would help; if it's not required, it should be removed.

### 5. Tests bypass citty routing layer — no integration test of flag parsing

All test helpers call `def.run(...)` directly with pre-constructed `args` objects, bypassing citty's flag parsing. This means the `required: true` flag constraints, type coercions, and the `--index` string-to-number coercion path are never exercised by the test suite. The `update-verification` test passes `index: "0"` as a string (matching the raw CLI input), but this goes through `validateInput` with `z.coerce.number()` which works — however, the actual citty `type: "string"` declaration for `index` is never verified to produce the right raw value. Not blocking, but worth noting as a test coverage gap.

---

## What's Done Well

- Strict read/mutation routing: no mutation command touches `loadState` directly; no read-only command touches RPC. Layer boundary is clean throughout.
- Stdin handling is consistent: commands with complex payloads use `readStdin` + `validateInput`; simple flag-only commands don't call `readStdin` at all.
- Output modes (json / human / quiet) are uniform across all 13 files with no deviations.
- Help text quality meets the spec contract: every command description includes precondition status and transition direction.
- Registration in `main.ts` uses flat colon-namespaced keys matching the architecture spec exactly.
- Test coverage is broad: every command has at least one happy-path test; disk state is verified (not just output) for create/add/update-verification.
- Full lifecycle integration test walks the entire epic state machine end-to-end via CLI helpers.
- Schema reuse: `verificationResultSchema` and `verificationSchema` are imported from entity schemas rather than re-declared.
