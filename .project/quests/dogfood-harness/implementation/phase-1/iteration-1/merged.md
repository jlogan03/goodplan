# Merged Review: Step 1 — Core Harness + Explore Validation

## Score: 7/10

All reviewers agree: solid structure, correct SDK usage, good error handling. Key gaps are lint violations, unsafe casts, and skill-file mutation risk.

## Important (4)

### 1. Biome lint violations block CI
**Source: TypeScript** | Resolution: DIRECTLY_ACTIONABLE
11 Biome errors: 3 `useNodejsImportProtocol` (bare `"child_process"`, `"fs"`, `"path"` instead of `node:` prefix), 6 `useTemplate`/`noUnusedTemplateLiteral` (string concat on lines 175, 299, 769, 789, 886; unused template literal on line 300). Must fix to pass `biome check`.
File: tools/dogfood/harness.ts:18, :175, :299

### 2. `goodplanJson()` uses `as T` without runtime validation
**Source: Architecture + TypeScript (converged)** | Resolution: DIRECTLY_ACTIONABLE
`JSON.parse(stdout) as T` (line 128) provides zero runtime safety. For a dogfooding harness whose purpose is detecting CLI contract issues, unvalidated casts mean it cannot distinguish "CLI returned wrong shape" from "harness assumed wrong shape." Add basic shape checks or lightweight Zod validation for `{ status: string }`, `{ activeEpic: ... }`, etc.
File: tools/dogfood/harness.ts:128

### 3. `patchSkillModels()` mutates source-of-truth skill files
**Source: Architecture** | Resolution: CODEBASE_EXPLORATION
Modifies git-tracked files in `skills/` in-place. Risks: crash leaves patched files, accidental git commit of patched state, complexity of restore logic. Safer alternatives: (a) copy skills to temp dir and point `settingSources` at copies, (b) rely solely on SDK model override (`model: "claude-haiku-4-5"` already passed to `query()`). The file patching primarily addresses hardcoded model strings in skill prompts that might override SDK-level settings. Startup check detects prior patches but only warns.
File: tools/dogfood/harness.ts:182

### 4. Double `as unknown as AskUserQuestionInput` cast bypasses type safety
**Source: TypeScript + Architecture (converged)** | Resolution: DIRECTLY_ACTIONABLE
Line 309 uses double cast, which is an anti-pattern per project CLAUDE.md. Add a runtime guard (`if ('questions' in input && Array.isArray((input as Record<string, unknown>).questions))`) before accessing `.questions`. The `canUseTool` callback is a runtime boundary — TypeScript alone cannot guarantee the shape.
File: tools/dogfood/harness.ts:309

## Minor (4)

### 5. `patchSkillModels()` grep uses non-portable BRE alternation
**Source: Generalist + Architecture (converged)**
`"opus\\|sonnet"` relies on GNU grep BRE. Use `grep -E "opus|sonnet"` (ERE flag) or Bun's native file APIs for portability.
File: tools/dogfood/harness.ts:188

### 6. `restoreSkillModels()` called redundantly in both `finally` and `.catch()`
**Source: Generalist + Architecture (converged)**
`finally` already covers both success and error paths, so the `.catch()` call at line 908 is dead code. Harmless but misleading — remove the `.catch()` call.
File: tools/dogfood/harness.ts:908

### 7. No verification of `init` system message for skill loading
**Source: Architecture**
The SDK's `init` system message includes `skills: string[]`. The harness logs system messages generically but doesn't verify expected skills (e.g., `explore`) were loaded. A missing skill silently produces a different failure mode.
File: tools/dogfood/harness.ts:394

### 8. Inconsistent `describeExitCode()` usage + verbose Map iteration
**Source: TypeScript**
Some error paths (lines 670, 681) log raw exit codes without `describeExitCode()`. Also, `Array.from(patchedFileOriginals.entries())` can be simplified to `patchedFileOriginals` since Map is directly iterable.
File: tools/dogfood/harness.ts:670, :241

## Deferred (not bugs — Step 2 scope)

- `phase2SliceCycle()` needs explicit `submit-plan`, `submit-refinement`, `submit-implementation` CLI calls between skill invocations (plan defers to Step 2)
- `phase2Architecture()` and `phase2RefineArchitecture()` need explicit CLI transition commands (plan defers to Step 2)

## What's Working Well

- Clean separation: CLI helpers / skill runner / phase orchestration
- Correct `canUseTool` callback shape with `behavior: 'allow' as const`
- Structured logging with cost tracking, tool call counting, sub-agent visibility
- Proper `try/finally` cleanup pattern
- No imports from `src/` — clean architectural boundary
- All CLI calls use `--json` per conventions
- `execFileSync` used consistently (no `execSync`)
