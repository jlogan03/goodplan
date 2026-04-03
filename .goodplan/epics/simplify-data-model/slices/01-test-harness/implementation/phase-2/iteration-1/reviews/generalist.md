# Generalist Review — Phase 2: Simulated User via Stateless LLM Calls

**Score: 8/10** | Critical: 0, Important: 2, Minor: 3

## Summary

Phase 2 delivers a clean, well-structured simulated user implementation with correct Anthropic SDK usage, proper `canUseTool` composition in `runSkillSession`, and two integration test scripts that gracefully degrade without an API key. The code integrates smoothly with Phase 1 utilities. Cost tracking, transcript writing, and AskUserQuestion interception all follow the plan spec faithfully.

## Important Issues

### I-1: `createAskUserHandler` returns passthrough `updatedInput` for non-AskUserQuestion tools

**File:** `tools/dogfood/utils.ts:446`

When the tool is not `AskUserQuestion`, the handler returns `{ behavior: "allow", updatedInput: input }`. This passes the raw `input` as `updatedInput`, which means the handler is _rewriting_ every tool's input to itself. While semantically a no-op, the `canUseTool` contract may treat `updatedInput` presence as a signal to replace input. If the Agent SDK ever distinguishes "no updatedInput" from "updatedInput === original input", this would cause subtle bugs.

**Recommendation:** Return `{ behavior: "allow" as const }` without `updatedInput` for non-AskUserQuestion tools. This is the cleaner passthrough semantic — only supply `updatedInput` when you actually want to modify input. Note: the `runSkillSession` composition already routes non-AskUserQuestion tools away from this handler (line 482 checks `toolName === "AskUserQuestion"` before delegating), so in practice this code path in `createAskUserHandler` is only hit by direct callers. Still worth fixing for correctness if the handler is used standalone.

### I-2: `test-integration.ts` hardcodes `macos-arm64` in PATH construction

**File:** `tools/dogfood/test-integration.ts:113`

```
PATH: `${join(PLUGIN_DIR, "binaries/macos-arm64")}:${HOME}/.local/bin:${process.env.PATH ?? ""}`
```

This will fail on x64 macOS or Linux. The `resolveDefaultGpBin()` function in `utils.ts` already has arch/platform detection logic. The integration test should either reuse that detection or derive the binary path from `resolveDefaultGpBin()`.

**Recommendation:** Extract the arch/platform detection from `resolveDefaultGpBin()` into a shared helper (e.g., `platformBinaryDir()`) and use it in the integration test's PATH construction.

## Minor Issues

### M-1: Cost estimation in `createSimulatedUser` uses haiku-only pricing

**File:** `tools/dogfood/utils.ts:398`

The cost calculation hardcodes haiku pricing ($0.25/$1.25 per MTok), but the model is configurable via `opts.model`. If someone passes sonnet or opus, the cost estimate will be significantly wrong.

**Recommendation:** Either make cost rates model-aware or add a comment noting the estimate is haiku-only and approximate. Since this is for test harness instrumentation (not billing), a comment is sufficient.

### M-2: `test-simulated-user.ts` has a mid-file import

**File:** `tools/dogfood/test-simulated-user.ts:44`

```typescript
import { mkdirSync } from "node:fs";
```

This import appears after the `TEST_DIR` constant declaration at line 41, separated from the other imports at the top. Biome may not flag this since it's still at module scope, but it's inconsistent with the file's structure.

**Recommendation:** Move to the top import block (line 13-15).

### M-3: `createSimulatedUser` accesses `transcriptBuffers` (module-private Map) directly

**File:** `tools/dogfood/utils.ts:352`

The `ask()` method reads from `transcriptBuffers` (a module-level `Map`) to get recent context. This couples the simulated user to the transcript buffer's internal data structure. If the buffering strategy changes (e.g., flush-on-write), the simulated user would get empty context.

**Recommendation:** Consider exposing a `getRecentTranscriptEntries(file: string, count: number): string[]` helper that abstracts over both the buffer and the on-disk file. Low priority since both are in the same module.

## What Went Well

- **Anthropic SDK usage is correct**: `messages.create()` with proper system prompt, max_tokens, and content block extraction. The stateless pattern avoids session management complexity.
- **`runSkillSession` composition is solid**: The `canUseTool` composition correctly layers violation detection, simulated user handling, and original handler delegation. The early `toolName === "AskUserQuestion"` check in `runSkillSession` (line 482) means the askUserHandler is only invoked when needed.
- **Graceful degradation**: Both test scripts check `ANTHROPIC_API_KEY` upfront and exit 0, which is the correct CI-friendly pattern.
- **Fuzzy option matching**: The `ask()` method strips quotes and does case-insensitive matching before falling back to the first option. This handles LLM response variability well.
- **Plan checklist updated**: The plan-refined.md checkboxes are correctly marked for completed Phase 2 tasks while Phase 3 remains unchecked.
- **Test quality**: Despite requiring an API key, `test-simulated-user.ts` tests the handler shape and passthrough behavior without LLM calls, giving some coverage even without keys.
