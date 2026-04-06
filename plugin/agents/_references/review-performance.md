# Performance Review Criteria

Domain-specific evaluation criteria for the performance reviewer. Evaluates performance aspects: profiling, memory allocation, concurrency, caching, and I/O optimization. Does NOT evaluate algorithmic correctness (the algorithm reviewer handles that) or general plan structure (the holistic reviewer handles that).

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- Hot paths — frequently executed code paths, inner loops, request handlers
- Memory allocation patterns — object creation in loops, large temporary allocations
- Concurrency primitives — locks, atomics, channels, thread pools, async runtimes
- Caching infrastructure — in-memory caches, distributed caches, cache policies
- I/O patterns — file access, network calls, database queries, serialization
- Benchmark suite — existing benchmarks, profiling configuration
- Resource limits — connection pools, thread counts, buffer sizes, queue depths

## Evaluation Criteria

1. **Profiling and measurement**: Is performance measured, not guessed?
   - Benchmarks exist for performance-critical paths
   - Profiling methodology documented (CPU, memory, I/O)
   - Baseline measurements established before optimization
   - Performance regression tests in CI where applicable
   - Metrics collected in production (latency percentiles, not just averages)

2. **Memory efficiency**: Is memory used effectively?
   - No unnecessary allocations in hot paths (pre-allocate, reuse buffers)
   - Large objects not copied when references suffice
   - Memory pools or arenas for high-frequency allocation patterns
   - Streaming processing for large datasets (not loading all into memory)
   - Memory leaks prevented (proper cleanup, weak references where appropriate)

3. **Concurrency and parallelism**: Is concurrency used correctly?
   - Lock granularity appropriate (not too coarse, not too fine)
   - Lock-free data structures used where contention is high
   - Thread pool sizing matches workload (CPU-bound vs I/O-bound)
   - Async I/O used for I/O-bound operations (not blocking threads)
   - No unnecessary synchronization (thread-local where possible)

4. **Caching**: Are caching strategies effective?
   - Cache placement appropriate (L1/L2/distributed, read-through/write-behind)
   - Cache invalidation strategy prevents stale data
   - Cache hit rates monitored and optimized
   - Cache size bounded with appropriate eviction policy (LRU, LFU, TTL)
   - Cache stampede prevention (locking, probabilistic early expiry)

5. **I/O optimization**: Is I/O efficient?
   - Batch operations where possible (bulk reads, bulk writes)
   - Connection reuse (keep-alive, connection pooling)
   - Compression for large payloads (gzip, brotli, zstd)
   - Async I/O or non-blocking I/O for concurrent operations
   - Buffer sizes tuned for the workload (not default OS values for high-throughput)

6. **Resource management**: Are system resources bounded?
   - Thread/goroutine/task counts bounded
   - Queue depths limited with backpressure
   - Timeouts on all external calls (no unbounded waits)
   - Graceful degradation under load (circuit breakers, load shedding)
   - Resource cleanup in error paths (no leaked connections, file handles, temp files)

## Scoring Guidelines

- Score 9-10: Measured performance, efficient memory use, proper concurrency, effective caching, optimized I/O
- Score 7-8: Good performance awareness, minor inefficiencies, mostly measured
- Score 5-6: Some performance issues, missing benchmarks, suboptimal concurrency
- Score 3-4: Significant performance problems, no measurement, resource leaks
- Score 1-2: Severe performance issues, blocking I/O everywhere, no resource limits
