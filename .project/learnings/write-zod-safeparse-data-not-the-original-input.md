Zod 4 may strip unknown keys or coerce values during `safeParse()`. Writing the original object instead of `result.data` causes in-memory/on-disk divergence. Always persist `result.data`.
