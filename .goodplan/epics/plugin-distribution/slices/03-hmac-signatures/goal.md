# HMAC Signatures

## What We're Building
Implement an embedded `stateSignature` field in `goodplan.json` that contains an HMAC-SHA256 computed over the serialized state tree (JSON/JSONL files only — markdown excluded). Every Data Layer write computes and embeds the signature atomically. Every Data Layer read verifies the signature (hard error on mismatch). Add `gp verify` and `gp verify --fix` commands. Include bootstrap exception for first run on a repo without signatures.

## Behavior
1. Data Layer write path: after mutating state, serialize the state tree (JSON/JSONL only, deterministic key ordering per INV-002), compute HMAC (excluding `stateSignature` field), embed signature in `goodplan.json`, write atomically
2. Data Layer read path: assemble state tree (JSON/JSONL only), compute HMAC (excluding `stateSignature`), compare to embedded signature. Hard error on mismatch with message directing user to `gp verify --fix`
3. Cache invalidation: `stateSignature` comparison is the cache validity check. Cache hit skips HMAC verification. Cache miss triggers full assembly + verification.
4. Bootstrap exception: if `stateSignature` is missing from `goodplan.json`, compute and embed it automatically on first CLI run. `gp verify` without `--fix` on a pre-HMAC repo returns fail (not bootstrap).
5. `gp verify` (read-only): assemble state tree, compute HMAC, compare. Returns JSON `{ "status": "pass" }` or `{ "status": "fail", "message": "..." }`. Exit 0 on pass, exit 1 on fail.
6. `gp verify --fix`: recompute and re-embed the signature. Returns `{ "status": "fixed" }`. Exit 0.
7. HMAC key injected via `--define __GP_HMAC_KEY__` at compile time. Dev builds use a well-known dev key.
8. `serializeStateTree()` uses deterministic key ordering, lexicographic file path sorting, preserved JSONL order, `\n` normalization
9. Markdown files (architecture, research, brainstorm, plans, goals) are excluded from the signature — LLM-owned content changes don't invalidate state integrity

## Verification
- [ ] Run any mutation (`gp epic:create`) — `goodplan.json` contains a `stateSignature` field
- [ ] `gp verify --json` — returns `{ "status": "pass" }` with exit 0
- [ ] Manually edit a `.goodplan/*.json` file (e.g., change a field in `goodplan.json` other than `stateSignature`) — next CLI read returns hard error with message mentioning `gp verify --fix`
- [ ] `gp verify --json` after tampering — returns `{ "status": "fail" }` with exit 1
- [ ] `gp verify --fix --json` — returns `{ "status": "fixed" }` with exit 0, and subsequent `gp verify` passes
- [ ] Create a fresh temp directory, `gp init` — `goodplan.json` has `stateSignature` (bootstrap)
- [ ] Edit a markdown file in `.goodplan/` (e.g., write to `architecture/test.md`) — `gp verify` still passes (markdown excluded)
- [ ] `bun run test` — all existing tests pass, new signature tests pass

Initialize a temp project with `gp init`, run several mutations (`epic:create`, `slice:create`, `quest:create`), verify `stateSignature` updates on each. Tamper with a JSON file manually, confirm the next CLI command hard-errors. Run `gp verify --fix` to recover. Edit a markdown file and confirm no signature invalidation. Run the full test suite.

## Scope Boundaries
**In scope:** `stateSignature` field in `goodplan.json`, `serializeStateTree()`, `signStateTree()`, `verifyStateTree()` in Data Layer, `gp verify` and `gp verify --fix` commands, cache invalidation via signature comparison, bootstrap exception, deterministic serialization, HMAC key define
**Out of scope:** Hook scripts (slice 4), CI secret injection (slice 7), key rotation implementation (documented but deferred)
