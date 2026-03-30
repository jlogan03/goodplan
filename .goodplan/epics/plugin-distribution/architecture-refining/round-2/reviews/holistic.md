## Issues

### 1. HMAC key same across all installations undermines stated threat model
**Severity: IMPORTANT**

The architecture states the HMAC key is "a stable constant baked into the compiled binary" and "same key across all builds" (conventions.md line 73). It also says "prevents casual LLM bypass, not determined adversaries" (conventions.md line 74). However, the threat model is internally contradictory:

- If the key is the same across all installations and extractable via `strings`, any LLM with internet access or tool use can look up the key from a public binary or documentation. The "casual bypass" protection degrades to "LLM doesn't know to look."
- The key is injected from a CI secret but baked into a public binary on a public `release` branch. The secret provides no protection once the binary ships.

The HMAC still provides value as a tamper-detection checksum (detecting accidental corruption, merge conflicts, stale caches). But calling it "defense in depth" against LLM bypass overstates its effectiveness when the key is publicly extractable.

**Resolution: Reframe the HMAC's value proposition. It is a tamper-detection checksum, not an access control mechanism. The hooks are the actual LLM bypass prevention. The HMAC detects corruption from any source (manual edits, bad merges, disk errors, non-CLI tools). Remove "prevents casual LLM bypass" framing -- the hooks do that. The HMAC catches what hooks miss (direct filesystem writes outside Claude Code).**

---

### 2. Cache invalidation via `.signatures.json` comparison has a race condition
**Severity: IMPORTANT**

cli-changes-api.md states: "the Data Layer compares `.signatures.json` on disk against the cached version. If they differ, the cache is stale and must be rebuilt." This replaces per-file mtime/content checks with a single file comparison.

But `.signatures.json` is updated atomically by the Data Layer on every state file write (conventions.md line 76). If two CLI invocations run concurrently:
1. Process A loads state (cache valid)
2. Process B loads state (cache valid)
3. Process B writes, updates `.signatures.json`, updates cache
4. Process A writes -- it compares its cached `.signatures.json` against on-disk (which B updated), detects staleness, rebuilds cache. But the rebuilt cache now reflects B's writes, and A's `oldState` (used for concurrent modification detection in `commitState`) is from before B's writes.

The concurrent modification detection in `commitState()` (existing Data Layer contract) already handles this scenario -- it compares on-disk content against `oldState` before writing. So the cache invalidation race does not cause data corruption. But it does mean cache invalidation via `.signatures.json` is redundant with the existing concurrent modification check, not a replacement for it.

**Resolution: Clarify that `.signatures.json`-based cache invalidation is an optimization (avoids reading every file to check staleness), not a replacement for the existing `commitState()` concurrent modification detection. The two mechanisms are complementary: cache invalidation answers "is my in-memory state fresh?" while concurrent modification detection answers "has the file I'm about to overwrite changed since I read it?"**

---

### 3. `gp verify` exit code conflicts with existing error code convention
**Severity: MINOR**

cli-changes-api.md defines `gp verify` exit codes as: 0 = all valid, 1 = mismatches found. But the existing Commands API (commands-api.md) establishes exit code 1 as "internal/unexpected errors." A verify command finding mismatches is expected behavior, not an internal error. This creates ambiguity for callers trying to distinguish "verify found problems" from "verify crashed."

**Resolution: Use exit code 2 for "mismatches found" (validation/usage error category), keeping exit code 1 for internal failures. Or document explicitly that `gp verify` is an exception to the exit code convention, with a note in commands-api.md.**

---

### 4. `warn-bash-state.sh` dev repo check order is wrong
**Severity: MINOR**

plugin-api.md shows the logic for `warn-bash-state.sh` as:
1. Check `.goodplan-dev` sentinel -- if exists, exit 0
2. Extract `command` from stdin JSON
3. Check if command contains `.project/`

But step 1 reads stdin JSON for `cwd` (to check `$CWD/.goodplan-dev`), which means `jq` must run before the sentinel check. The pseudocode shows the sentinel check before JSON extraction, but the actual implementation needs `CWD` from the JSON to locate the sentinel file.

Looking more carefully at the code block in plugin-api.md (lines 112-118): `INPUT=$(cat)` and `CWD=$(echo "$INPUT" | jq ...)` happen first, then the sentinel check. So the code block is correct, but the numbered steps (lines 117-121) describe the order wrong -- step 1 says "Check sentinel" but the sentinel path depends on `CWD` from step 2's JSON extraction.

**Resolution: Reorder the numbered steps to match the code: (1) extract JSON, (2) check sentinel, (3) check command for `.project/`.**

---

### 5. Missing `gp verify` in the Commands API surface
**Severity: MINOR**

`gp verify` and `gp verify --fix` are defined in cli-changes-api.md but not added to the Commands API file (commands-api.md). The Commands API is the canonical surface for all CLI commands. A new command should appear there under Global Commands, with its flags, routing, and error codes documented.

**Resolution: Add `gp verify [--fix] [--json]` to the Global Commands section of commands-api.md. Document: read-only (routes to Data Layer), `--fix` re-signs all files, exit codes, output shape.**

---

### 6. `nextCommands` approximation may confuse LLM consumers
**Severity: MINOR**

The architecture repeatedly notes that `nextCommands` is "an approximation -- guards may prevent some listed commands from succeeding" (overview line 33, conventions.md line 6, cli-changes-api.md line 177). This is correctly documented, but there is no guidance on how LLM consumers should handle failures from suggested commands.

Since the CLI already returns structured errors with specific error codes (e.g., `STATE_GUARD_FAILURE`), this is largely self-correcting -- the LLM will see the error and adjust. But the plugin CLAUDE.md (which instructs LLMs on CLI usage) should mention that `nextCommands` are suggestions, not guarantees.

**Resolution: Add a one-line note to the plugin CLAUDE.md template content (plugin-api.md line 129-134) mentioning that `nextCommands` in mutation responses are suggestions -- some may fail due to preconditions.**

---

### 7. `commandMetadata` registry derivation is underspecified
**Severity: MINOR**

conventions.md says the registry "inverts the existing command-to-event mapping from the Commands API." cli-changes-api.md shows the TypeScript interface. But the architecture doesn't specify whether the registry is:
(a) Generated at build time from the command definitions (static)
(b) Constructed at CLI startup from the command definitions (runtime)
(c) Manually maintained as a separate data structure

Option (c) would violate the principle of deriving from the existing mapping. Options (a) and (b) are both valid but have different implementation and maintenance characteristics.

**Resolution: Specify that the registry is a static data structure in source code, derived manually from the Commands API's command-to-event mapping. Add a fitness function candidate: assert that every command in the Commands API that triggers a state transition has a corresponding entry in `commandMetadata`. (Note: this fitness function is already listed in cli-changes-api.md -- just clarify the registry's nature.)**

---

## Round 1 Issue Resolution Check

| Round 1 Issue | Status | Notes |
|---|---|---|
| #1 hooks.json format (CRITICAL) | RESOLVED | hooks.json now uses correct three-level nested format with `type: "command"` |
| #2 Binary at PLUGIN_ROOT (IMPORTANT) | WAS NON-ISSUE | Correctly kept as-is |
| #3 Skill auto-namespacing bug (IMPORTANT) | RESOLVED | Known bug acknowledged in conventions.md with fallback plan and build verification step |
| #4 HMAC key rotation (IMPORTANT) | PARTIALLY RESOLVED | Language softened to "stable constant" but still claims "prevents casual LLM bypass" -- see issue #1 above |
| #5 HMAC bootstrap on fresh clones (IMPORTANT) | RESOLVED | Bootstrap exception clearly defined: missing `.signatures.json` triggers automatic signing |
| #6 "other" section unbounded (MINOR) | RESOLVED | Scoped to "curated list of high-value creation commands, not exhaustive" |
| #7 Repo name unexplained (MINOR) | RESOLVED | Clarified in overview and distribution model |
| #8 Build step numbering (MINOR) | RESOLVED | Steps renumbered sequentially |
| #9 Hook blocks CLI writes (IMPORTANT) | WAS NON-ISSUE | Correctly noted hooks only intercept tool calls |
| #10 No platform detection (MINOR) | RESOLVED | v1 explicitly scoped to macOS arm64, future path documented |
| #11 Hook decision control (MINOR) | WAS NON-ISSUE | Exit-code model appropriate |
| #12 INV-008 wording (MINOR) | RESOLVED | INV-008 now says "Every CLI mutation command" |

## Score: 8/10

The architecture has improved substantially from round 1. The critical hooks.json format issue is fixed. The HMAC bootstrap exception is clearly defined. The skill namespacing bug has a concrete fallback plan. The distribution model is well-scoped to macOS arm64 v1 with a clear future path.

The remaining issues are mostly minor clarifications. The two IMPORTANT issues (HMAC framing and cache invalidation semantics) are conceptual imprecisions, not implementation blockers. The HMAC system will work correctly regardless of how the threat model is framed. The cache invalidation will work correctly because the existing concurrent modification detection provides the safety net.

The architecture tells a consistent story: hooks prevent, signatures detect, nextCommands guide. The layering between plugin infrastructure (outside the 4-layer stack) and CLI modifications (within the stack) is clean. INV-008 and INV-009 are well-motivated and scoped. The distribution model via release branch is pragmatic. The confirmed goals (atomic plugin, state protection, self-documenting CLI, clean rename, simple build pipeline) are all addressed.

## Summary
- Critical: 0
- Important: 2
- Minor: 5
