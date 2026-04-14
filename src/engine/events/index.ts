export { appendEvent } from "./append.js";
export type { AppendEventOptions, AppendResult } from "./append.js";
export { generateEventId, generateTimestamp } from "./id.js";
export { acquireLock, withLock } from "./lock.js";
export type { LockHandle } from "./lock.js";
export { readLastEventId } from "./read-last-event.js";
export { replayEvents } from "./replay.js";
export type { ReplayFilter, ReplayOptions, ReplayResult } from "./replay.js";
export { createMigrationRegistry, replayWithMigrations } from "./migration.js";
export type {
	EventMigration,
	MigrationRegistry,
	VersionAwareReplayOptions,
} from "./migration.js";
export type {
	Actor,
	AnyEventEnvelope,
	ContentRef,
	EventDomain,
	EventEnvelope,
	Scope,
} from "../../schemas/envelope.js";
export {
	ActorSchema,
	AnyEventEnvelopeSchema,
	ContentRefSchema,
	EventDomainSchema,
	ScopeSchema,
} from "../../schemas/envelope.js";
