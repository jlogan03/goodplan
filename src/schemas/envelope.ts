import { z } from "zod";
import { eventTimestampSchema } from "./shared.js";

// Actor who caused the event
export const ActorSchema = z.object({
	kind: z.enum(["user", "cli", "skill", "agent"]),
	id: z.string().min(1),
});
export type Actor = z.infer<typeof ActorSchema>;

// Scope of the event log
export const ScopeSchema = z.enum(["project", "epic", "side-quest"]);
export type Scope = z.infer<typeof ScopeSchema>;

// Top-level event domain (first-level discriminant)
export const EventDomainSchema = z.enum([
	"entity-lifecycle",
	"spine",
	"refinement",
	"exploration",
	"pressure-test",
	"finding",
	"briefing",
	"decision-learning",
	"pause-steering",
	"reshape",
	"milestone",
]);
export type EventDomain = z.infer<typeof EventDomainSchema>;

// Content reference to git blob
export const ContentRefSchema = z.object({
	sha: z.string().regex(/^[0-9a-f]{40}$/),
	size: z.number().int().nonnegative(),
	path: z.string().min(1),
	mediaType: z.string().min(1),
});
export type ContentRef = z.infer<typeof ContentRefSchema>;

// The universal event envelope
// Generic version used for type-safe event definitions per domain
// AnyEventEnvelopeSchema is the runtime-parseable version with unknown payload
export const AnyEventEnvelopeSchema = z.object({
	id: z.string().uuid(),
	schemaVersion: z.number().int().positive(),
	ts: eventTimestampSchema,
	scope: ScopeSchema,
	scopeRef: z.string().nullable(),
	actor: ActorSchema,
	branch: z.string().min(1),
	commitHint: z.string().nullable(),
	domain: EventDomainSchema,
	type: z.string().min(1),
	payload: z.unknown(),
	prevId: z.string().uuid().nullable(),
});
export type AnyEventEnvelope = z.infer<typeof AnyEventEnvelopeSchema>;

// Generic envelope type for type-safe event construction
export interface EventEnvelope<D extends EventDomain, T extends string, P> {
	id: string;
	schemaVersion: number;
	ts: string;
	scope: Scope;
	scopeRef: string | null;
	actor: Actor;
	branch: string;
	commitHint: string | null;
	domain: D;
	type: T;
	payload: P;
	prevId: string | null;
}

// Compile-time check: EventEnvelope must be assignable to AnyEventEnvelope
// Pure type-level assertion -- no runtime artifact
type _AssertAssignable = EventEnvelope<EventDomain, string, unknown> extends AnyEventEnvelope
	? true
	: never;
type _Check = [_AssertAssignable] extends [true] ? true : never;
