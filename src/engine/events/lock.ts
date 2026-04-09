import * as lockfile from "proper-lockfile";
import { GoodplanError } from "../../util/errors.js";

export interface LockHandle {
	release(): void;
}

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Acquire an exclusive lock on the given path using `proper-lockfile`
 * (mkdir-based locking -- cross-platform, no native bindings needed).
 * Creates a `.lock` sidecar file (not the events.jsonl itself) to avoid
 * interfering with readers.
 * Throws DATA_CONCURRENT_MODIFICATION if lock not acquired within timeoutMs.
 */
export async function acquireLock(lockPath: string, timeoutMs?: number): Promise<LockHandle> {
	const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;
	// Derive retry count from timeout: ~50ms min per retry attempt
	const retries = Math.max(1, Math.floor(timeout / 50));

	try {
		const release = await lockfile.lock(lockPath, {
			retries: {
				retries,
				minTimeout: 50,
				maxTimeout: 200,
			},
			realpath: false,
		});

		return {
			release() {
				// Fire-and-forget the async release — the lock dir is cleaned up
				void release();
			},
		};
	} catch (err) {
		throw new GoodplanError(
			"DATA_CONCURRENT_MODIFICATION",
			`Failed to acquire lock on ${lockPath} within ${timeout}ms`,
			undefined,
			err,
		);
	}
}

/**
 * Execute fn while holding lock. Lock is released after fn completes
 * (or throws).
 */
export async function withLock<T>(
	lockPath: string,
	fn: () => T | Promise<T>,
	timeoutMs?: number,
): Promise<T> {
	const handle = await acquireLock(lockPath, timeoutMs);
	try {
		return await fn();
	} finally {
		handle.release();
	}
}
