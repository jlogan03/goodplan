# Data & I/O Review Criteria

Domain-specific evaluation criteria for the data and I/O reviewer. Evaluates data handling design: file format support, streaming, ETL patterns, data validation, and schema evolution. Does NOT evaluate database-level concerns (the data layer reviewer handles that) or general plan structure (the holistic reviewer handles that).

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- File format handling — CSV, JSON, JSONL, Parquet, XML, YAML parsers
- Serialization/deserialization — protobuf, msgpack, CBOR, custom binary formats
- Streaming patterns — line-by-line processing, chunked reads, backpressure
- ETL pipelines — extract, transform, load stages, error handling between stages
- Data validation — schema validation on read, data quality checks
- Schema evolution — backward/forward compatibility, migration utilities
- I/O performance — buffering, compression, parallel I/O, memory-mapped files

## Evaluation Criteria

1. **Format handling**: Are data formats handled correctly?
   - Parsers handle malformed input gracefully (not crash, not silently corrupt)
   - Character encoding handled explicitly (UTF-8, BOM detection, encoding declaration)
   - Large files processed without loading entirely into memory
   - Format-specific edge cases handled (CSV quoting, JSON number precision, YAML anchors)
   - Format selection justified for the use case (Parquet for columnar, JSON for interchange, etc.)

2. **Streaming and chunking**: Is streaming used for large data?
   - Line-by-line or chunk-based processing for files larger than available memory
   - Backpressure mechanisms prevent memory exhaustion
   - Progress reporting for long-running I/O operations
   - Partial failure handling — resume from last successful position
   - Buffer sizes tuned for the I/O pattern (not default for all cases)

3. **ETL patterns**: Are data pipelines well-structured?
   - Clear separation between extract, transform, and load stages
   - Error handling at each stage (bad records logged, not silently dropped)
   - Idempotent processing — re-running produces the same result
   - Intermediate results checkpointed for recovery
   - Data lineage tracked (source, transformations applied, destination)

4. **Data validation**: Is data validated at boundaries?
   - Schema validation on ingest (structural correctness)
   - Semantic validation where applicable (ranges, referential integrity, business rules)
   - Validation errors produce actionable reports (line number, field, expected vs actual)
   - Strict mode vs lenient mode configurable
   - Validation performance acceptable for the data volume

5. **Schema evolution**: Can schemas change safely?
   - Backward compatibility — old readers can read new data
   - Forward compatibility — new readers can read old data
   - Schema versioning or self-describing formats where needed
   - Migration utilities for breaking schema changes
   - Default values defined for new optional fields

6. **I/O performance**: Is I/O efficient?
   - Compression used for storage and transfer (gzip, zstd, snappy)
   - Parallel I/O for independent files or partitions
   - Memory-mapped files for random access patterns
   - Buffered I/O with appropriate buffer sizes
   - Temporary files cleaned up on success and failure

## Scoring Guidelines

- Score 9-10: Robust format handling, proper streaming, validated data, clean schema evolution, efficient I/O
- Score 7-8: Good format handling, streaming where needed, validation present, minor I/O inefficiencies
- Score 5-6: Some format edge cases missed, limited streaming, incomplete validation
- Score 3-4: Format handling errors, no streaming for large data, no validation
- Score 1-2: Crashes on malformed input, loads entire files into memory, no schema management
