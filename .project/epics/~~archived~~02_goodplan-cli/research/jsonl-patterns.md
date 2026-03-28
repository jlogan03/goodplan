# JSONL Manipulation Patterns for File-Based State Management

Research for goodplan CLI — how to safely read, write, query, merge, and manage JSONL files that store project state.

---

## 1. Atomic Appends in Node/Bun

### POSIX O_APPEND guarantees

Opening a file with `O_APPEND` makes the seek-to-end + write an atomic step — no intervening modification can occur between the offset adjustment and the write. Both `fs.appendFile` and `fs.appendFileSync` use the `'a'` flag, which maps to `O_APPEND`.

**Size caveat:** POSIX only guarantees atomicity for writes <= `PIPE_BUF` (4 KB on Linux, 512 B minimum). Writes larger than `PIPE_BUF` may interleave with concurrent writers. A single JSONL entry in goodplan will comfortably stay under 4 KB, so `O_APPEND` is sufficient for our use case.

### Bun specifics

- `Bun.write()` does **not** support append mode — it overwrites.
- Use `node:fs` compat layer: `import { appendFile } from "node:fs/promises"` works in Bun.
- `appendFileSync` from `node:fs` is the simplest approach for CLI tools where we want write-then-continue semantics.

### Recommendation for goodplan

Use `fs.appendFileSync(path, JSON.stringify(entry) + '\n', { flag: 'a' })`. This is:
- Atomic for entries < 4 KB (all of ours)
- Simple — no locking library needed for single-machine, single-process CLI use
- Compatible with both Node and Bun

For the unlikely case of two CLI sessions appending simultaneously (e.g., user runs two terminals), O_APPEND prevents corruption. Each entry lands intact; worst case is ordering differs from wall-clock time.

### When to add locking

If we ever need read-modify-write cycles (not just appends), use `proper-lockfile`:
- Uses `mkdir`-based locking (atomic on all filesystems including NFS)
- Periodic mtime updates prevent stale locks
- Pattern: `lock(path)` → read → modify → write → `unlock(path)`

We should **not** need this for JSONL files since they are append-only by design.

---

## 2. Concurrent Append Safety

### Single-machine, single-process (our primary case)

`fs.appendFileSync` is fully safe. No special handling needed.

### Single-machine, multiple processes

O_APPEND guarantees no data corruption for writes < PIPE_BUF. Each line lands atomically. The only concern is **ordering** — two entries appended near-simultaneously may appear in either order. Including an ISO timestamp in every entry makes the logical order recoverable.

### Cross-branch (git merge scenario)

Not a runtime concern — handled by git merge strategy (see section 4).

### Decision

No locking library needed. `appendFileSync` with `'a'` flag is sufficient for all goodplan scenarios. If we ever add a daemon/watch mode with concurrent writes, revisit.

---

## 3. Querying JSONL Files

### Scale analysis for goodplan

| File | Expected size | Max realistic size |
|------|--------------|-------------------|
| `activity-log.jsonl` | 100s of entries/epic | ~5,000 entries for a large project |
| `decisions.jsonl` | 10-50 entries | ~200 entries |
| `learnings.jsonl` | 10-30 entries/level | ~100 entries |

At ~200 bytes/entry average, 5,000 entries = ~1 MB. This is trivially small — no streaming needed.

### Approach: read-all-and-parse

For our scale, the simplest approach wins:

```typescript
function readJsonl<T>(path: string): T[] {
  const text = readFileSync(path, 'utf-8');
  return text.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}
```

This is fast (< 1ms for 5,000 lines), simple, and easy to filter/sort in-memory afterward.

### When streaming would matter

Streaming (line-by-line parsing) makes sense at 100K+ lines or when memory is constrained. Two options if we ever need it:

1. **Bun native:** `Bun.JSONL.parse(file)` — C++ implementation, returns array. `Bun.JSONL.parseChunk()` for true streaming with `{ values, read, done, error }` return.
2. **Node:** `stream-json` library — SAX-style streaming parser, sub-object level granularity. Overkill for JSONL but available.

### `--query` support

Options considered:

| Approach | Pros | Cons |
|----------|------|------|
| Shell out to `jq` | Full jq syntax, users know it | External dependency |
| Embed `jq` via WASM | No external dep | Large binary, maintenance burden |
| Simple built-in filters | No deps, predictable | Limited expressiveness |
| Pipe-friendly output | Let users use their own `jq` | Requires knowledge |

**Recommendation:** Provide built-in filters for common operations (`--type`, `--since`, `--tag`, `--id`) and output JSONL to stdout so users can pipe to `jq` for advanced queries. This follows Unix philosophy and avoids reimplementing jq.

```
goodplan decisions list --since 2024-01-01 --tag architecture
goodplan activity-log --type slice-complete | jq 'select(.epic == "auth")'
```

---

## 4. Git Merge Behavior

### Why JSONL merges cleanly

Git's default merge strategy is line-based. When two branches both append lines to a JSONL file:
- If they append to different positions (e.g., one branch had more entries before the other diverged), git auto-merges with no conflicts.
- If both append at the exact same position (end of file), git may produce a conflict — but this is **easily solvable** with `merge=union`.

### Union merge strategy

Add to `.gitattributes`:
```
*.jsonl merge=union
```

The `union` merge driver keeps lines from **both** sides when there's a conflict. For append-only files, this is exactly correct — both additions are valid and should be preserved.

### Edge cases

1. **Identical lines from both branches:** Union merge deduplicates. If two branches independently add the same entry (same content), only one copy appears. This is unlikely in practice since entries include timestamps and IDs.

2. **Line ordering:** Union merge may interleave lines rather than preserving branch-temporal order. Entries should include timestamps so consumers can sort by time.

3. **Trailing newline:** Ensure files always end with `\n`. Without it, two appends can merge onto the same line. Our append function must always write `JSON.stringify(entry) + '\n'`.

4. **Rebase vs. merge:** Both work with union strategy. Rebase replays commits sequentially, so appends from the rebased branch appear after the base branch's appends.

### Recommendation

- Add `*.jsonl merge=union` to `.gitattributes` in any project using goodplan.
- Ensure every JSONL write includes a trailing newline.
- Include `ts` (ISO timestamp) and `id` (UUID or ULID) in every entry for deterministic ordering after merge.

---

## 5. JSONL Libraries Assessment

### Do we need a library?

For goodplan's scale and use case, **hand-rolling is better**. The core operations are trivial:

```typescript
// Write
appendFileSync(path, JSON.stringify(entry) + '\n');

// Read all
const entries = readFileSync(path, 'utf-8').trim().split('\n').filter(Boolean).map(JSON.parse);

// Read streaming (Bun native, if ever needed)
const entries = Bun.JSONL.parse(Bun.file(path));
```

### Libraries reviewed

| Library | Use case | Verdict for goodplan |
|---------|----------|---------------------|
| `stream-json` | Streaming parse of huge JSON/JSONL | Overkill — our files are small |
| `ndjson-cli` | CLI tools for JSONL streams (filter/map/reduce) | Good reference for API design, not a dependency |
| `Bun.JSONL` | Native C++ JSONL parser in Bun | Use if/when we need performance; zero-dep |
| `jsonlines` (npm) | Read/write JSONL with streams | Unnecessary abstraction for our case |

### Decision

No JSONL library dependency. Hand-roll read/write utilities (~10 lines of code). Leverage `Bun.JSONL` if we're Bun-only and need perf later.

---

## 6. Handling "Updates" to Entries

JSONL is append-only, but some entries have mutable state (e.g., decision status: proposed → accepted → superseded). Three patterns:

### Pattern A: Append new version with same ID (event sourcing)

```jsonl
{"id":"d-001","ts":"2024-01-10T10:00:00Z","verb":"propose","title":"Use JSONL for state","status":"proposed"}
{"id":"d-001","ts":"2024-01-15T14:00:00Z","verb":"accept","title":"Use JSONL for state","status":"accepted"}
```

- **Read:** Filter by ID, take latest entry (max `ts`)
- **Pros:** Full history, append-only (merge-safe), audit trail
- **Cons:** Read requires dedup logic; file grows with every status change

### Pattern B: Rewrite file

Read all entries, modify the target, write all entries back.

- **Pros:** Simple reads (no dedup)
- **Cons:** Not atomic, loses history, creates merge conflicts, breaks append-only model

### Pattern C: Separate state from log

Keep immutable JSONL log + a separate "current state" JSON file derived from the log.

- **Pros:** Fast reads from state file, full history in log
- **Cons:** Two files to maintain, state file must be rebuilt if corrupted

### Recommendation: Pattern A (event sourcing)

This aligns perfectly with our design:
- `activity-log.jsonl` is already append-only audit trail — no updates needed.
- `decisions.jsonl` uses event sourcing — append new entry with same ID and new status.
- `learnings.jsonl` entries are immutable facts — no updates needed. Superseding a learning means appending a new entry referencing the old one.

Read utility needs a `latestById()` function:

```typescript
function latestById<T extends { id: string; ts: string }>(entries: T[]): T[] {
  const map = new Map<string, T>();
  for (const entry of entries) {
    const existing = map.get(entry.id);
    if (!existing || entry.ts > existing.ts) map.set(entry.id, entry);
  }
  return [...map.values()];
}
```

The `verb` field on each entry makes history readable: propose, accept, supersede, revise, etc.

---

## 7. Deterministic Ordering

### Timestamps alone are insufficient

- Clock skew between machines (rare for single-dev CLI, but possible)
- Two entries within same millisecond
- Git merge reorders lines

### Options

| Approach | Pros | Cons |
|----------|------|------|
| ISO timestamp only | Simple, human-readable | Ties possible, merge reorders |
| Timestamp + sequence number | Unambiguous within a session | Sequence must be file-scoped; hard after merge |
| ULID (timestamp + random) | Sortable, globally unique, no coordination | 26 chars, not human-readable |
| UUID v7 (timestamp-based) | Sortable, standard, widely supported | 36 chars |

### Recommendation: Timestamp + ULID as ID

- `ts`: ISO 8601 timestamp — human-readable, used for display and filtering
- `id`: ULID — sortable (encodes timestamp at millisecond precision + random suffix), globally unique, no coordination needed

ULIDs sort lexicographically in timestamp order, so `latestById()` can use either `ts` or `id` for ordering. After a git merge, sorting entries by `id` (ULID) gives a deterministic, chronologically-correct order regardless of line position in the file.

Use the `ulid` npm package (tiny, no deps) or implement the 48-bit timestamp + 80-bit random encoding directly.

---

## 8. File Size Management

### When does JSONL become unwieldy?

| Entries | Avg size/entry | Total size | Read time | Concern? |
|---------|---------------|------------|-----------|----------|
| 100 | 200 B | 20 KB | < 1ms | No |
| 1,000 | 200 B | 200 KB | < 1ms | No |
| 10,000 | 200 B | 2 MB | ~5ms | No |
| 100,000 | 200 B | 20 MB | ~50ms | Marginal |
| 1,000,000 | 200 B | 200 MB | ~500ms | Yes |

For goodplan, even a very active project won't exceed 10,000 activity-log entries. **No rotation needed.**

### If we ever need rotation

Pattern from OpenClaw and other local-first tools:

1. **Time-based archival:** After N days, move old entries to `activity-log.2024-Q1.jsonl`.
2. **Size-based rotation:** When file exceeds threshold (e.g., 5 MB), rotate to timestamped archive.
3. **Epic-scoped archival:** When an epic completes, its activity log is archived as part of the epic's completion artifact.

### Recommendation

- **No rotation for v1.** Files will stay small.
- **Design for it:** Keep read utilities accepting glob patterns (e.g., `activity-log*.jsonl`) so archived files can be queried alongside active ones.
- **Epic completion is natural archival:** When an epic is completed, its `.project/epics/<name>/` directory becomes a historical artifact. The activity log within it stops growing.

---

## Summary of Decisions

| Question | Decision |
|----------|----------|
| Append mechanism | `fs.appendFileSync` with `'a'` flag; no locking library |
| Concurrent safety | O_APPEND sufficient for < 4 KB entries |
| Query approach | Read-all-and-parse in-memory; pipe to `jq` for advanced queries |
| Git merge | `*.jsonl merge=union` in `.gitattributes`; trailing newlines mandatory |
| Libraries | None — hand-roll ~20 lines of utility code |
| Updates/mutations | Event sourcing (Pattern A) — append new version with same ID |
| Ordering | ISO timestamp (`ts`) + ULID (`id`) on every entry |
| File size management | No rotation for v1; design read utilities to accept globs for future |

---

## Sources

- [POSIX write() specification](https://pubs.opengroup.org/onlinepubs/9699919799/functions/write.html)
- [Appending to a File from Multiple Processes](https://nullprogram.com/blog/2016/08/03/)
- [Are File Appends Really Atomic?](https://www.notthewizard.com/2014/06/17/are-files-appends-really-atomic/)
- [Node.js File Locking — LogRocket](https://blog.logrocket.com/understanding-node-js-file-locking/)
- [proper-lockfile — npm](https://www.npmjs.com/package/proper-lockfile)
- [Bun JSONL Documentation](https://bun.com/docs/runtime/jsonl)
- [Bun.JSONL.parseChunk API](https://bun.com/reference/bun/JSONL/parseChunk)
- [stream-json — GitHub](https://github.com/uhop/stream-json)
- [ndjson-cli — GitHub](https://github.com/mbostock/ndjson-cli)
- [NDJSON Advantages](https://ndjson.com/advantages/)
- [NDJSON Tools & CLI Guide](https://ndjson.com/tools/)
- [Avoid JSON File Merge Conflicts — Sophia Willows](https://sophiabits.com/blog/avoid-json-file-merge-conflicts)
- [Event Sourcing Pattern — AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/event-sourcing.html)
- [AgentLog — JSONL-based event bus](https://github.com/sumant1122/agentlog)
- [Bun.write append issue](https://github.com/oven-sh/bun/issues/6559)
- [Bun append documentation](https://bun.com/docs/guides/write-file/append)
- [jq — Official site](https://jqlang.org/)
