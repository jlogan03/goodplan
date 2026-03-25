## Issues

**[IMPORTANT]** Node.js imports missing `node:` protocol
The codebase consistently uses `node:` prefixed imports (e.g., `"node:fs"`, `"node:path"`, `"node:child_process"`) as confirmed in `src/`. The harness uses bare specifiers (`"child_process"`, `"fs"`, `"path"`), violating the project convention and triggering Biome `useNodejsImportProtocol` errors.
File: tools/dogfood/harness.ts:18
File: tools/dogfood/harness.ts:26
File: tools/dogfood/harness.ts:27
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Biome lint violations: `useTemplate` and `noUnusedTemplateLiteral`
There are 6 lint errors from Biome (string concatenation instead of template literals on lines 175, 299, 769, 789, 886; unused template literal on line 300). The project enforces `biome check` in CI. These should be fixed to keep the harness passable under `biome check`.
File: tools/dogfood/harness.ts:175
File: tools/dogfood/harness.ts:299
Resolution: DIRECTLY_ACTIONABLE

**[IMPORTANT]** Double `as` cast for `AskUserQuestionInput` bypasses type safety
Line 309: `const typed = input as unknown as AskUserQuestionInput;` uses a double cast (`as unknown as T`), which is an anti-pattern per project CLAUDE.md (`as any`, `@ts-ignore` -> "Fix types properly"). The `canUseTool` callback receives `Record<string, unknown>`, and the SDK exports `AskUserQuestionInput` for this purpose. A runtime guard or Zod validation at this boundary would be safer, since `canUseTool` is a runtime callback and the actual shape is not guaranteed by TypeScript alone. At minimum, validate the presence of `questions` before accessing it.
File: tools/dogfood/harness.ts:309
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `describeExitCode` unused in some error paths
`describeExitCode` is defined and used in `goodplanJson` and a few spots, but several error-logging sites (e.g., lines 670, 681) only log the exit code without the description, leading to inconsistent error reporting. Consider using `describeExitCode` consistently or dropping it.
File: tools/dogfood/harness.ts:670
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `epicStatus()` and `projectStatus()` return shapes are unchecked at runtime
`goodplanJson` casts `JSON.parse` output with `as T` (line 128), which provides zero runtime safety. For a dogfooding harness that tests CLI output, these are exactly the kind of external-data boundaries where runtime validation matters most. Consider adding basic shape checks (or a lightweight Zod parse) for the `{ status: string }` and `{ activeEpic: { name: string } | null }` shapes.
File: tools/dogfood/harness.ts:128
Resolution: DIRECTLY_ACTIONABLE

**[MINOR]** `for (const [filePath, original] of Array.from(patchedFileOriginals.entries()))` is unnecessarily verbose
`Map` is directly iterable. `for (const [filePath, original] of patchedFileOriginals)` works identically and is more idiomatic.
File: tools/dogfood/harness.ts:241
Resolution: DIRECTLY_ACTIONABLE

## Score: 7/10

The harness is well-structured with good error handling patterns, proper discriminated union checking for SDK messages, and a sensible `try/finally` for model patching restoration. However, 11 Biome lint errors (3 `useNodejsImportProtocol`, 4 `useTemplate`, 1 `noUnusedTemplateLiteral`, plus formatting) violate CI requirements. The double `as unknown as` cast and lack of runtime validation at external data boundaries are meaningful type safety gaps for a test harness that exercises CLI output. Fixing the lint issues and adding minimal runtime guards for the cast and JSON parsing would bring this to 9+.

## Summary
- Critical: 0
- Important: 3
- Minor: 3
