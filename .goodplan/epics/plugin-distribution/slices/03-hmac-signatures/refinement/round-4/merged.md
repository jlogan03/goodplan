# Merged Feedback — HMAC Signatures Plan (Round 4)

Reviewers: holistic, software-architecture, typescript, tui-cli, repo-tooling-docs
Overall score: 9/10 | Critical: 0 | Important: 2 | Minor: 8

---

## Important

**[IMPORTANT-1] Phase 2: `commitState()` signature injection must preserve INV-005 (Zod validation on all write paths)**
_Source: software-architecture (primary), typescript (supporting)_

The plan injects `stateSignature` into the `goodplan.json` `PendingWrite` entry after `processJsonEntry` has already run Zod validation. Two sub-cases:

1. Entry exists: plan says to update its `content` with "re-serialized clone" — doesn't specify whether this re-runs through `projectSchema.parse()` or just calls `deterministicStringify` directly. Direct serialization bypasses INV-005.
2. Entry does not exist (created fresh): plan explicitly creates a `PendingWrite` without Zod validation — INV-005 violation.

Fix: add an explicit `projectSchema.parse(cloneWithSignature)` call before serializing in both sub-cases, matching Phase 4's `verify --fix` pattern ("validates through `projectSchema.parse()` before writing"). The serialization format must also match what `processJsonEntry` produces: `${deterministicStringify(contentToWrite)}\n` (trailing newline).

Resolution: DIRECTLY_ACTIONABLE

---

**[IMPORTANT-2] Phase 4: `gp verify` error-handling pattern must be explicitly specified**
_Source: tui-cli_

The plan says the command throws `DATA_INTEGRITY_CHECK_FAILED` via `GoodplanError` and delegates to `outputError`. Two patterns exist in the codebase: `init.ts` lets the top-level handler catch, `state.ts` catches within the command. The `verify` command should state which it follows.

Given that:
- `--json` mode requires `{ "error": { "code": "...", "message": "..." } }` on stdout (INV-007), and the top-level handler's JSON routing is implicit
- `verify --fix` has both success and failure output paths that warrant explicit control
- The error message must include the fix hint (`"Run 'gp verify --fix' to repair."`)

The plan should specify that `verify` catches its own errors (like `state.ts`), not delegates to the top-level handler. This makes JSON/human output symmetry explicit and keeps the command self-contained.

Resolution: DIRECTLY_ACTIONABLE

---

## Minor

**[MINOR-1] Phase 2: write-read equivalence test needs more precise assertion wording**
_Source: holistic_

The test "commit state via `commitState()`, read it back via `assembleState()`, verify the signature matches" is ambiguous about what "matches" means. Specify: call `assembleState()` on the same `projectDir`, extract `stateSignature` from the project node of the reassembled state, call `signStateTree()` on the reassembled state, assert the two are equal. This distinguishes "signature field matches recomputed signature" (correct) from "signature field matches original signature field" (trivially true but weaker).

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-2] Phase 3: `status.ts` comment must be updated when switching to `loadState()`**
_Source: holistic, software-architecture, tui-cli (converging)_

`status.ts` lines 22–25 contain a deliberate architectural comment: "Uses assembleState() (not loadState) — deliberately chosen because it handles fresh/zero-state projects gracefully." After switching to `loadState()`, this comment becomes stale and will mislead future implementers. The plan should include updating the comment to note that `loadState()` already returns `ZERO_STATE` for missing/empty project dirs (lines 46–53 of `load.ts`), so the zero-state behavior is preserved.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-3] Phase 4: `atomicWrite` export is an API surface expansion — add a scope note**
_Source: software-architecture (primary), typescript (supporting)_

Exporting `atomicWrite()` from `commit.ts` widens the Data Layer's public API. The plan should add a brief note (or a JSDoc comment on the export) that `atomicWrite` is an internal utility — callers outside `commit.ts` should be limited to `verify --fix`; general writes must go through `commitState()`. This prevents future misuse while the Data Layer API surface is still being shaped (Developing maturity).

Additionally (typescript): the plan should specify how `verify --fix` derives the absolute path argument: `path.join(resolveProjectDir(), "goodplan.json")`, matching the pattern in `status.ts`.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-4] Phase 1: `serializeForHmac` stripping logic is structurally coupled to tree layout**
_Source: software-architecture_

The `"project.json"` key destructure to strip `stateSignature` assumes a stable tree layout. If `project.json` is relocated (e.g., entity-restructuring epic), the stripping silently stops working, producing valid but non-comparable HMAC values. Add a comment on the function noting this structural coupling so it's visible during future refactors. Recursive stripping would be more resilient but is low priority for current Developing maturity.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-5] Phase 1: explicit imports required for `timingSafeEqual` and (possibly) HMAC**
_Source: typescript_

With `verbatimModuleSyntax: true`, all imports must be explicit. The plan should add to Phase 1's task description:
- `import { timingSafeEqual } from "node:crypto"` (or `import crypto from "node:crypto"` with `crypto.timingSafeEqual`)
- Note: `Bun.CryptoHasher("sha256", key)` two-arg HMAC constructor was added in later Bun versions. Verify against `bun-types: ^1.3.11`; fallback is `crypto.createHmac("sha256", getHmacKey())` from `node:crypto`, which works across all Bun versions.

Resolution: DIRECTLY_ACTIONABLE (import statement) / CODEBASE_EXPLORATION (Bun version check)

---

**[MINOR-6] Phase 4: architecture doc update tasks lack target section and content shape**
_Source: repo-tooling-docs_

Two doc update tasks are underspecified:

1. `data-layer-api.md`: add an "HMAC State Integrity" subsection under Contracts describing sign-on-write / verify-on-read behavior and the bootstrap exception (INV-001 carve-out for `verify --fix`).
2. `commands-api.md`: add `verify` to the "Global Commands" section (alongside `status`, `state`, `init`, `migrate`, `schema`), documenting both the read-only form and the `--fix` variant.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-7] Phase 4: `gp schema --query` assertion needs expected return shape**
_Source: tui-cli_

The Expected Behavior check `gp schema --json --query '.commands[] | select(.name == "verify")'` silently returns `null` (exit 0) if the key is `subCommands` or structured differently. The plan should specify what the expected return shape looks like: an object with `name: "verify"` and an `args` property containing the `--fix` flag definition. This makes the assertion meaningful rather than vacuous.

Resolution: DIRECTLY_ACTIONABLE

---

**[MINOR-8] Phase 4 (optional): `gp verify` human output could include short signature**
_Source: tui-cli_

`green "State integrity: pass"` is minimal. For a debugging/verification command, showing the first 8 hex characters (e.g., `"State integrity: pass (sig: a1b2c3d4)"`) mirrors git short-hash UX. Could be gated on `--verbose`. Not blocking.

Resolution: DIRECTLY_ACTIONABLE (optional)

---

## Acknowledged — No Action Needed

- **Phase 4: `atomicWrite` export lacks standalone test coverage.** Coverage through `verify --fix` fitness tests is sufficient. (holistic)
- **Round 3 IMPORTANT resolutions are sound.** `serializeForHmac` Option A, dual-path HMAC verification, citty args block, dual-define note, `state.ts` staying on `assembleState()` — all correct. (holistic, software-architecture, typescript)
