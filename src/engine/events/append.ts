import * as fs from "node:fs";
import * as path from "node:path";
import type { Actor, AnyEventEnvelope, EventDomain, Scope } from "../../schemas/envelope.js";
import { AnyEventEnvelopeSchema } from "../../schemas/envelope.js";
import { generateEventId, generateTimestamp } from "./id.js";
import { acquireLock } from "./lock.js";
import { readLastEventId } from "./read-last-event.js";

export interface AppendEventOptions {
	eventsPath: string;
	schemaVersion?: number;
	scope: Scope;
	scopeRef: string | null;
	actor: Actor;
	branch: string;
	commitHint: string | null;
	domain: EventDomain;
	type: string;
	payload: unknown;
	/**
	 * Optional pre-append hook for invariant checking.
	 * Called after envelope construction but before writing to disk.
	 * Throw to abort the append. Slice 02 (invariant engine) will
	 * provide the concrete implementation; this is the extension point.
	 */
	beforeAppend?: (envelope: AnyEventEnvelope) => void | Promise<void>;
}

export interface AppendResult {
	event: AnyEventEnvelope;
}

/**
 * Append a single event to the JSONL log.
 *
 * Sequence:
 * 1. mkdirSync parent directory (create if not exists)
 * 2. Touch sidecar file with create-or-noop write: appendFileSync(sidecarPath, "")
 * 3. Acquire lock on eventsPath.lock (via proper-lockfile)
 * 4. Read last event ID for prevId (tail-read, constant time)
 * 5. Build envelope (generate id, ts, resolve prevId)
 * 6. Validate envelope against AnyEventEnvelopeSchema
 * 7. Call beforeAppend hook if provided (invariant checking extension point)
 * 8. Serialize as JSON + newline
 * 9. Append to file with single appendFileSync call (create if not exists)
 * 10. Release lock
 * 11. Return the appended event
 */
export async function appendEvent(opts: AppendEventOptions): Promise<AppendResult> {
	const sidecarPath = `${opts.eventsPath}.lock`;

	// Step 1: Ensure parent directory exists
	fs.mkdirSync(path.dirname(opts.eventsPath), { recursive: true });

	// Step 2: Touch sidecar file (create-or-noop, avoids TOCTOU)
	fs.appendFileSync(sidecarPath, "");

	// Step 3: Acquire lock
	const handle = await acquireLock(sidecarPath);

	try {
		// Step 4: Read last event ID for prevId chain
		const prevId = readLastEventId(opts.eventsPath);

		// Step 5: Build envelope
		const envelope: AnyEventEnvelope = {
			id: generateEventId(),
			schemaVersion: opts.schemaVersion ?? 1,
			ts: generateTimestamp(),
			scope: opts.scope,
			scopeRef: opts.scopeRef,
			actor: opts.actor,
			branch: opts.branch,
			commitHint: opts.commitHint,
			domain: opts.domain,
			type: opts.type,
			payload: opts.payload,
			prevId,
		};

		// Step 6: Validate envelope against schema
		AnyEventEnvelopeSchema.parse(envelope);

		// Step 7: Call beforeAppend hook if provided
		if (opts.beforeAppend) {
			await opts.beforeAppend(envelope);
		}

		// Step 8-9: Serialize and append in single call
		const line = `${JSON.stringify(envelope)}\n`;
		fs.appendFileSync(opts.eventsPath, line);

		// Step 11: Return
		return { event: envelope };
	} finally {
		// Step 10: Release lock
		handle.release();
	}
}
