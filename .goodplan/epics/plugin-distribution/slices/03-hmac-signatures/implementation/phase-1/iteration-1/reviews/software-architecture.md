# Software Architecture Review — Phase 1: HMAC Core Module

## Issues

**[IMPORTANT]** `serializeForHmac` mutates the return value of `serializeStateTree` in place
The `serializeStateTree` function returns `Record<string, unknown>` and `serializeForHmac` mutates that object directly (`serialized["project.json"] = rest`). While the current callers don't hold a reference to the serialized tree after calling `serializeForHmac`, this is a latent mutation hazard. If any future caller serializes the tree and then calls `serializeForHmac` on the same state, the tree structure would be corrupted. Since `serializeStateTree` constructs a fresh object on every call this is safe today, but the mutation is invisible to callers and violates the expectation that a `serialize*` function is side-effect-free. Consider working on a shallow copy: `const projectCopy = { ...projectNode as Record<string, unknown> }; delete projectCopy.stateSignature; serialized["project.json"] = projectCopy;` -- or note that you are already doing a destructure-rest which creates a new object, but you still mutate `serialized["project.json"]`. The fix is minor: just clone the top-level serialized object too (`const result = { ...serialized };`) so the original is untouched.
File: src/core/data/hmac.ts:43
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Plan specified `Bun.CryptoHasher` with `node:crypto` fallback -- implementation uses only `node:crypto`
The plan's task description says to use `Bun.CryptoHasher("sha256", key)` two-arg HMAC constructor, with `createHmac` from `node:crypto` as fallback. The implementation goes directly to `node:crypto`. This is actually a good architectural call -- `node:crypto` is fully supported in Bun and is more portable (no Bun-specific API dependency), so no change needed. Noting for traceability only.
File: src/core/data/hmac.ts:57
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** Test coverage gap: no test for `verifyStateTree` with malformed (non-hex, wrong-length) signature input
`verifyStateTree` handles length mismatch via the `computedBuf.length !== expectedBuf.length` guard, and `Buffer.from(expectedSignature, "hex")` silently drops non-hex characters. A test with a non-hex string or odd-length string would document this edge case behavior. Not blocking, but would strengthen confidence in the robustness of the verification path.
File: tests/unit/data/hmac.test.ts:120
Resolution: DIRECTLY_ACTIONABLE

## Score: 9/10
The implementation is clean, well-structured, and architecturally sound. It follows established patterns (build-time injection from `version.ts`, Data Layer placement, `deterministicStringify` reuse), maintains correct dependency direction (Data Layer depends on tree types and util, nothing depends on HMAC yet), and the public API surface is small and deep (4 exported functions hiding serialization, key management, and timing-safe comparison). The structural coupling comment is excellent documentation. The mutation concern is the only issue preventing a 10 -- it is safe today but represents a hidden contract that could bite during the entity-restructuring epic integration.

## Summary
- Critical: 0
- Important: 1
- Minor: 2
