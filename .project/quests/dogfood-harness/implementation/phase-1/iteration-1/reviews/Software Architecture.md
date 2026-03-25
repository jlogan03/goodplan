# Software Architecture Review: Step 1 — Core Harness + Explore Validation

## Issues

**[IMPORTANT]** Harness directly modifies source-of-truth skill files via `patchSkillModels()`
The `patchSkillModels()` function discovers and mutates files in `SKILLS_DIR` (the `skills/` source directory), replacing model references in-place. This means:
1. If the harness crashes between patch and restore (e.g., `kill -9`, OOM), the skill source files are left in a modified state with `"haiku"` replacing `"opus"`/`"sonnet"`. The startup check detects this but only warns — it does not auto-restore.
2. The function operates on the repo's source-of-truth skill files (per `.project/conventions.md`: "skills/ as the source of truth"). A safer pattern would be to copy skill files to a temporary directory and patch the copies, or use an environment variable / config overlay to control model selection without mutating source files.
3. Git-tracked files are being modified at runtime — if the user runs `git add -A` or `git commit -a` during a harness run, patched files could be committed.

The current mitigation (startup check + `finally` block + catch handler) is reasonable for a dogfooding tool, but the architectural risk is real. Consider: (a) copying skills to a temp dir and pointing `settingSources` at it, or (b) using the SDK's model override exclusively without file patching.
File: tools/dogfood/harness.ts:182
Resolution: CODEBASE_EXPLORATION

**[IMPORTANT]** `goodplanJson()` uses `as T` without runtime validation — data contract not enforced
`goodplanJson<T>()` casts parsed JSON via `as T` (line 128). The plan noted Zod validation as "not blocking, but improves robustness." From an architecture perspective, this is a data contract gap: the harness trusts CLI output shape without verification. Given that INV-005 (schema validation on every read/write) is a system invariant for the core CLI, and the harness is exercising that CLI, unvalidated `as T` casts mean the harness cannot distinguish between "CLI returned wrong shape" (a real bug) and "harness assumed wrong shape" (a harness bug). For a dogfooding tool whose purpose is to find CLI issues, this matters.
File: tools/dogfood/harness.ts:128
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** `patchSkillModels()` uses `execFileSync("grep", ...)` — platform coupling and bypasses SDK model override
The grep call at line 188 shells out to system `grep` with GNU-style `\|` alternation, which may not work on all systems (BSD grep on macOS handles it but behavior can vary). More fundamentally, the harness already passes `model: "claude-haiku-4-5"` to `query()` and appends a system prompt instruction for sub-agents. The file patching is a belt-and-suspenders approach for sub-agent model selection, but it introduces significant complexity (file mutation, restore logic, crash recovery) for something the SDK's model inheritance should handle. Per the agent-sdk-types research: "If `AgentDefinition.model` is omitted or set to `'inherit'`, the sub-agent inherits the main model." The file patching primarily addresses hardcoded model strings in skill prompt text that might override the SDK-level setting.
File: tools/dogfood/harness.ts:186
Resolution: CODEBASE_EXPLORATION

**[MINOR]** Hardcoded paths reduce portability
`NONDET_EVAL_DIR`, `GOODPLAN_DIR`, `GOODPLAN_BIN`, and `SKILLS_DIR` are all computed from `HOME` with hardcoded path segments (`Repos/nondet-eval`, `Repos/goodplan`, `bin/goodplan`). This couples the harness to a specific developer's machine layout. For a dogfooding tool that only one person runs, this is acceptable, but environment variables or a config file would make it reusable. The plan does not require portability, so this is minor.
File: tools/dogfood/harness.ts:37
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `canUseTool` callback uses `as unknown as AskUserQuestionInput` — double cast
Line 309 uses `input as unknown as AskUserQuestionInput`. The plan explicitly accepts this cast as guarded by the `toolName === "AskUserQuestion"` check. The double cast (`as unknown as`) is slightly more concerning than a single `as` — it bypasses TypeScript's assignability check entirely. A safer alternative is a runtime type guard (`if ('questions' in input && Array.isArray(input.questions))`), but the plan documents this as an accepted exception. Noting for awareness.
File: tools/dogfood/harness.ts:309
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `restoreSkillModels()` called in both `finally` block and `.catch()` handler — redundant
`restoreSkillModels()` is called in the `finally` block at line 879 and again in the `.catch()` at line 908. The `finally` block already runs on both success and error paths, so the `.catch()` call is redundant. It is also harmless (the function checks `patchedFileOriginals.size === 0` early), but the duplication suggests unclear ownership of cleanup responsibility.
File: tools/dogfood/harness.ts:908
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** No verification of `init` system message to confirm skills loaded
The agent-sdk-harness research (section 1) documents that `SDKSystemMessage` with `subtype === "init"` includes a `skills: string[]` field. The harness logs system messages generically (line 395) but does not specifically check the `init` message to verify that expected skills (e.g., `explore`) were loaded. For a dogfooding harness, confirming skill discovery is a valuable diagnostic — a missing skill silently produces a different failure mode.
File: tools/dogfood/harness.ts:394
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The harness is well-structured for its purpose: clear separation between CLI helpers (`goodplan()`, `goodplanJson()`), the skill runner (`runSkill()`), and phase orchestration functions. The `canUseTool` callback, structured logging, and cost tracking are implemented correctly per the SDK research. The module is appropriately isolated in `tools/dogfood/` — it has no imports from the main `src/` tree and depends only on the Agent SDK and Node built-ins, maintaining clean architectural boundaries.

The main concerns that prevent a higher score:
1. File mutation of source-of-truth skill files is architecturally risky (IMPORTANT) — a temp-copy or config-overlay pattern would be safer.
2. Unvalidated `as T` casts in `goodplanJson()` undermine the harness's ability to detect CLI contract issues (IMPORTANT) — adding even basic shape checks would improve diagnostic value.
3. The `grep` shell-out for file discovery adds platform coupling (IMPORTANT) — could use `Glob`-style file discovery or Bun's native APIs.

To reach 9+: address the skill file mutation risk (copy-to-temp or config overlay), add basic runtime validation to `goodplanJson()`, and verify skill loading from the `init` system message.

## Summary
- Critical: 0
- Important: 3
- Minor: 4
