# System Invariants — Plugin Distribution Epic

## INV-008: Single Transition Per Command

- **Rationale:** The `nextCommands` feature derives available commands from the command metadata registry. This only works if each CLI mutation command corresponds to exactly one state machine transition. Read-only commands have no transitions. Multi-transition commands would require parallel registries that can drift out of sync.
- **Scope:** System-wide — all CLI mutation commands, State Machine, RPC Layer
- **Verification:** Fitness function candidate: assert that every RPC function calls `reduce()` exactly once. Manual review during plan refinement for new commands.

## INV-009: State File Integrity via Embedded Signature

- **Rationale:** Hooks prevent most out-of-band modifications to `.goodplan/` state files, but cannot catch all bypass vectors (Bash redirects, manual edits outside Claude Code). The embedded HMAC signature detects tampering that hooks miss — manual edits, bad merges, disk errors, non-CLI tools. The HMAC is a tamper-detection mechanism, not an access control mechanism (the key can be extracted from the binary).
- **Scope:** Data Layer — all reads and writes of `.json` and `.jsonl` files in `.goodplan/`
- **Mechanism:** A single `stateSignature` field in `goodplan.json` contains an HMAC-SHA256 computed over the serialized state tree (JSON/JSONL files only — markdown files are excluded). LLM-owned markdown can be written freely without invalidating the signature. On write, the signature is computed and embedded atomically as part of the state mutation. On read, the signature is recomputed and compared — hard error on mismatch.
- **Key management:** Stable constant baked into the compiled binary, same across all installations, injected from a CI secret (`GP_HMAC_KEY`) at build time. Never stored in source control. Local dev uses a well-known dev key hardcoded in the build script.
- **Key rotation:** Handled via the `version` field in `goodplan.json`. A future major version can change the key; the CLI detects version mismatch and re-signs automatically. For v1, the key is permanent. Rotation procedure: (1) generate new key, (2) update CI secret, (3) publish new binary with bumped major version, (4) users run `gp verify --fix` to re-sign with the new key.
- **Bootstrap:** If `stateSignature` is missing from `goodplan.json` on first CLI run, the CLI computes and embeds it automatically.
- **Verification:** Every Data Layer read verifies the HMAC (hard error on mismatch). `gp verify` performs a single pass/fail check. `gp verify --fix` recomputes and re-embeds the signature. Fitness function candidate: assert that no Data Layer write path skips state tree signing.
- **INV-001 exception:** `gp verify --fix` writes `project.json` directly via `atomicWrite()`, bypassing `commitState()` and the state machine. Rationale: signature repair is infrastructure metadata maintenance, not a workflow state transition. This is analogous to the existing exceptions for version-stamp and migrate.
