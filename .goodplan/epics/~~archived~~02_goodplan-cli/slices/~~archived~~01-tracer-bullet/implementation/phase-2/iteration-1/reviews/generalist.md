# Phase 2 Review: Schemas & Minimal Data Layer

**Reviewer:** Generalist
**Score:** 8/10
**Counts:** Critical: 0, Important: 3, Minor: 3

## Summary

Solid implementation that covers all plan tasks. Schemas are well-structured, data layer follows architecture docs correctly, tests are thorough with good coverage of happy and error paths. The code is clean, well-organized, and follows project conventions. A few meaningful gaps remain around API alignment with the architecture spec and env cleanup in tests.

## Important Issues

### I-1: `writeEntity` signature missing `expected` parameter from architecture spec

**File:** `src/core/data/json.ts` line 69

The data-layer-api.md specifies: `writeEntity<T>(path: string, data: T, schema: ZodSchema<T>, expected?: T): void` with concurrent modification detection when `expected` is provided. The implementation omits the `expected` parameter entirely. While the plan says "minimal data layer," the function signature should match the architecture to avoid a breaking change later. Adding the parameter as optional with a no-op when absent would be zero-cost and forward-compatible.

### I-2: `resolveProjectDir` returns `.project/` path, but `GOODPLAN_DIR` is used raw

**File:** `src/core/data/project.ts` lines 19-20, 28-29

When walking up from cwd, `resolveProjectDir` returns the path to the `.project/` directory itself (e.g., `/foo/bar/.project`). But when `GOODPLAN_DIR` is set, it returns the env var value directly without verifying it ends with `.project/` or even exists. This means `GOODPLAN_DIR=/tmp/test` and the walk-up case return semantically different things -- one is the `.project/` dir, the other could be anything. The test on line 26-29 of `project.test.ts` sets `GOODPLAN_DIR` to a path that doesn't contain `.project/` and doesn't even exist, and the function happily returns it. This inconsistency will cause bugs when `readProject`/`writeProject` join `project.json` onto the result -- they'll look in the wrong place unless `GOODPLAN_DIR` is set to exactly the `.project/` directory path.

Recommend: either document that `GOODPLAN_DIR` must point to the `.project/` directory itself, or normalize the return value (e.g., if `GOODPLAN_DIR` doesn't end with `.project`, append it).

### I-3: `process.env.GOODPLAN_DIR = undefined` doesn't delete the env var

**File:** `tests/unit/data/project.test.ts` lines 12, 18-21

Setting `process.env.GOODPLAN_DIR = undefined` converts `undefined` to the string `"undefined"` in Node/Bun (env vars are always strings). This means the env var is NOT cleared -- it's set to the literal string `"undefined"`. The correct way to clear is `delete process.env.GOODPLAN_DIR`. The tests pass by coincidence because:
- In `beforeEach`, the `"undefined"` string is truthy but is used as a directory path, which would fail if `resolveProjectDir()` were called without a `cwd` argument in most tests.
- The `afterEach` has the same bug -- if `originalEnv` was `undefined`, it sets it to the string `"undefined"` instead of deleting it.

This could cause test pollution in future test suites that depend on `GOODPLAN_DIR` being absent.

## Minor Issues

### M-1: No test for `writeEntity` atomic write behavior

The plan's verification section says "Manually verify: create a fixture project.json, read it, write it, confirm byte-identical output (deterministic keys)." The round-trip test exists, but there's no test verifying the atomic write-to-temp-then-rename behavior (e.g., that a failed write doesn't leave a partial file). The architecture doc lists "Atomic writes survive interruption" as a fitness function candidate. Not required for this slice, but worth noting.

### M-2: `deterministicStringify` uses tab indentation

**File:** `src/core/data/json.ts` line 10

`JSON.stringify(sortKeys(data), null, "\t")` uses tab indentation. This is fine and matches existing `.project/` conventions, but it's worth confirming this is intentional since many projects use 2-space indentation for JSON. Not a bug, just a convention to be aware of.

### M-3: `versionSchema` regex allows leading zeros

**File:** `src/schemas/shared.ts` line 8

The regex `/^\d+\.\d+\.\d+$/` accepts versions like `01.02.03` which aren't valid semver. A stricter regex would be `/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/`. Low impact since the CLI controls version creation, but the schema should be precise if it's the validation boundary.

## Positives

- Deterministic key sorting is clean and recursive, handles arrays correctly
- Atomic write pattern (write-to-temp + rename) is correct
- Error handling is thorough with specific error codes per failure mode
- Schema files consistently export both the schema and the inferred type, establishing the convention called for in the plan
- Test coverage is comprehensive: valid/invalid fixtures, round-trip, walk-up resolution, nested subdirectory resolution
- Status result schema has the documentation comment about null active pointers in slice 01, exactly as the plan requested
- Clean separation between generic `json.ts` and entity-specific `project.ts`
