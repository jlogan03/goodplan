# Data Layer Review Criteria

Domain-specific evaluation criteria for the data layer reviewer. Evaluates data layer design: schema design, migration safety, query patterns, indexing, connection pooling, and data integrity. Does NOT evaluate application logic above the data layer (the backend reviewer handles that) or general plan structure (the holistic reviewer handles that).

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- Schema definitions — table structures, relationships, constraints
- Migration files — ordering, reversibility, data migration vs schema migration
- Query patterns — ORM usage, raw SQL, query builders
- Index definitions — covering indexes, partial indexes, composite keys
- Connection configuration — pool size, timeouts, retry policies
- Data validation — constraints at the database level vs application level
- Caching layer — cache invalidation strategy, TTLs, cache-aside vs write-through

## Evaluation Criteria

1. **Schema design**: Is the data model sound?
   - Normalization appropriate for the use case (not over- or under-normalized)
   - Relationships correctly modeled (foreign keys, junction tables)
   - Data types chosen correctly (varchar lengths, numeric precision, timestamps with timezone)
   - Constraints enforced at the database level (NOT NULL, UNIQUE, CHECK, FOREIGN KEY)
   - Naming conventions consistent (snake_case, singular/plural table names)

2. **Migration safety**: Are migrations safe for production?
   - Backward-compatible changes (add column, then backfill, then add constraint)
   - No long-running locks on large tables
   - Reversible migrations with proper down/rollback scripts
   - Data migrations separated from schema migrations
   - Migration testing strategy documented

3. **Query patterns**: Are queries efficient and safe?
   - Parameterized queries (no string interpolation of user input)
   - N+1 patterns prevented (eager loading, batch queries, DataLoader)
   - Appropriate use of JOINs vs subqueries
   - EXPLAIN ANALYZE used for complex queries
   - Bulk operations for batch inserts/updates

4. **Indexing**: Is the indexing strategy appropriate?
   - Indexes on frequently queried columns and foreign keys
   - Composite indexes ordered by selectivity
   - Partial indexes for common filtered queries
   - No over-indexing (each index has a measured use case)
   - Index impact on write performance considered

5. **Connection management**: Are connections managed correctly?
   - Connection pooling configured (pool size, idle timeout, max lifetime)
   - Connection errors handled with retry logic
   - Transactions scoped appropriately (not held open during I/O)
   - Read replicas used for read-heavy workloads where available
   - Connection leaks prevented (proper cleanup in error paths)

6. **Data integrity**: Is data consistency ensured?
   - Transactions used for operations that must be atomic
   - Optimistic or pessimistic locking for concurrent updates
   - Soft deletes vs hard deletes — strategy documented and consistent
   - Audit trails for sensitive data changes
   - Backup and restore strategy documented

## Scoring Guidelines

- Score 9-10: Sound schema, safe migrations, efficient queries, proper indexing, strong integrity
- Score 7-8: Good schema design, mostly safe migrations, minor query inefficiencies
- Score 5-6: Some schema issues, migration safety concerns, N+1 patterns present
- Score 3-4: Poor schema design, unsafe migrations, significant query problems
- Score 1-2: No schema constraints, no migrations, SQL injection vectors
