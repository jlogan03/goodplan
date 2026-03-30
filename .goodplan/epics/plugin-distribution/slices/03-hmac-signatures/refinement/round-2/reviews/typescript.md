# TypeScript and JavaScript Review — HMAC Signatures (Round 2)

## Issues

**[IMPORTANT]** Phase 2: Signature injection into PendingWrite needs to account for Zod-parsed `contentToWrite`

The plan says to "update the corresponding `PendingWrite` for `goodplan.json` with the signed content (re-serialize with the embedded signature)." In `commitState`, the `processJsonEntry` function validates content through Zod and uses `result.data` (not the raw input) as `contentToWrite`. If `commitState` computes the HMAC over `newState` (which contains the *pre-Zod* content), but then injects `stateSignature` into a PendingWrite whose serialized content is the *post-Zod* version, there is a subtle mismatch risk: the HMAC was computed over the pre-Zod tree, but the on-disk content reflects the post-Zod tree.

In practice, Zod's `safeParse` output should be identical to its input for well-formed data (no unknown keys to strip, no coercions). But the plan should be explicit about this: either (a) compute the HMAC over the state *after* all Zod parsing has occurred (which means computing it after `diffTree` has validated all entries), or (b) assert that the project schema round-trips cleanly (input === output) so the HMAC computed pre-Zod matches the post-Zod serialization. Option (a) is safer. The plan could achieve this by computing the signature from the actual PendingWrite content for `goodplan.json` (minus the `stateSignature` field) rather than from the in-memory `newState`.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 2: `signStateTree` is called on `newState` but `stateSignature` may already be present from a previous commit

When `commitState` is called, `newState` may already contain a `stateSignature` field from the previous commit (since the state machine does not clear it — it is infrastructure metadata). The plan says `serializeForHmac` "strips `stateSignature` from the result," which handles this. However, the plan's step 2 says "Inject `stateSignature` into the `goodplan.json` entry in `newState`." This mutates `newState` — which is supposed to be treated immutably throughout the data layer (the tree is a shared reference returned from the state machine). The plan should clarify that the injection creates a *new* project.json content object (using spread) rather than mutating the existing one, and that `newState` itself is not modified — only the `PendingWrite` content is updated.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 3: `status` command calls `assembleState()` directly — HMAC verification is bypassed

The plan's Phase 3 task says "Ensure commands that call `assembleState()` directly (like `status`) are addressed: either switch them to use `loadState()` or add verification separately." But it does not specify *which* approach to take. Looking at `src/commands/global/status.ts`, `buildStatusResult()` calls `assembleState(dir)` directly. If Phase 3 adds verification only to `loadState()`, then `gp status` (the most frequently run command) will silently skip HMAC verification. The plan should be definitive: either (a) switch `status` to use `loadState()`, or (b) add a `verifyIfSigned(state)` helper that both `loadState` and `status` call after obtaining state. Option (a) is simpler and aligns with the cache layer's intent.

The same concern applies to `state` and `init` commands that also call `assembleState()` directly. The plan should enumerate all call sites and specify the fix for each.

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT]** Phase 4: `gp verify --fix` writes `goodplan.json` directly — plan should specify the write mechanism

The plan says `gp verify --fix` "recomputes signature, embeds in `goodplan.json`, writes atomically." But it does not specify how it writes. The existing codebase uses `atomicWrite` (internal to `commit.ts`) for all JSON writes, and `commitState` is the sole public API for state writes. Writing `goodplan.json` directly from the verify command would bypass schema validation (INV-005) and the state cache update. The plan should specify one of: (a) call `commitState(projectDir, assembledState, stateWithNewSignature, { force: true })` — which gets schema validation, cache update, and atomic writes for free; or (b) use a targeted atomic write of just `goodplan.json` (simpler but bypasses INV-005 and skips cache refresh, meaning the next `loadState` will fall back to `assembleState`). The INV-001 exception note is good but the mechanism needs to be explicit.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1: `Bun.CryptoHasher` HMAC API — verify `update`/`digest` method chain availability

The plan specifies `new Bun.CryptoHasher("sha256", getHmacKey())`. This is the correct Bun-native HMAC API (the second argument makes it HMAC mode). However, the plan should confirm the method chain: `hasher.update(data).digest("hex")`. The `CryptoHasher` API in Bun 1.3.x supports `.update()` and `.digest()` but the plan does not show the full call chain. Since this is a Bun-specific API (not Node.js crypto), the implementation should include a brief comment noting the Bun version requirement for HMAC mode (`Bun.CryptoHasher` with key parameter).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 1: `serializeForHmac` strips `stateSignature` "from the result" — method should be specified

The plan says `serializeForHmac` "calls `serializeStateTree(state, { inline: false })` ... strips `stateSignature` from the result." The result of `serializeStateTree` is a `Record<string, unknown>`. The `stateSignature` field lives inside the `project.json` node of that record (which is itself a nested object after unwrapping). The plan should specify the exact stripping logic: destructure `stateSignature` from `result["project.json"]` (with a type assertion since the result is `Record<string, unknown>`) and reconstruct without it. For example:

```ts
const serialized = serializeStateTree(state, { inline: false });
const projectNode = serialized["project.json"] as Record<string, unknown>;
const { stateSignature: _, ...projectWithoutSig } = projectNode;
serialized["project.json"] = projectWithoutSig;
return deterministicStringify(serialized);
```

This matters because an incorrect path for stripping (e.g., stripping from the root instead of the `project.json` node) would produce a different HMAC.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR]** Phase 4: Fitness test "tampering with any `.json` file is detected on next read" needs scope clarification

The fitness test says "Tampering with any `.json` file is detected on next read." But the HMAC is computed over the serialized state tree — which only includes files registered in the schema registry. If a `.json` file exists on disk but is not in the schema registry (and thus not loaded by `assembleState`), tampering with it would NOT be detected. The fitness test should clarify: "Tampering with any schema-registered `.json` file is detected on next read." This is a test accuracy issue, not a design flaw.

Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The plan has substantially improved from round 1. All critical issues are resolved: it now correctly specifies `Bun.CryptoHasher` with `crypto.timingSafeEqual` (including Buffer conversion), reuses `serializeStateTree` instead of hand-rolling a tree walker, eliminates the double-write by computing the signature before flush, specifies `loadState` as the verification location, adds the error code, adds the vitest define, and removes the redundant cache invalidation. The remaining issues are important but not critical — they center on mutability/immutability of `newState` during signature injection, the Zod round-trip assumption, incomplete coverage of `assembleState` direct callers, and the unspecified write mechanism for `verify --fix`. To reach 9+: specify immutable injection via spread, decide on the Zod round-trip approach, enumerate all `assembleState` call sites with their fix, and specify the `verify --fix` write mechanism.

## Summary
- Critical: 0
- Important: 4
- Minor: 3
