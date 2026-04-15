import * as fs from "node:fs";

const TAIL_BYTES = 4096;

/**
 * Read the last event ID from an events.jsonl file (for use as prevId).
 * Returns null if the file is empty or does not exist.
 * Skips partial/corrupt trailing lines (crash safety).
 *
 * Uses a tail-read strategy: reads only the last ~4KB of the file,
 * keeping lock-hold time constant regardless of log size.
 */
export function readLastEventId(eventsPath: string): string | null {
	let stat: fs.Stats;
	try {
		stat = fs.statSync(eventsPath);
	} catch {
		return null;
	}

	if (stat.size === 0) {
		return null;
	}

	const fd = fs.openSync(eventsPath, "r");
	try {
		const start = Math.max(0, stat.size - TAIL_BYTES);
		const readSize = stat.size - start;
		const buf = Buffer.alloc(readSize);
		fs.readSync(fd, buf, 0, readSize, start);

		const chunk = buf.toString("utf-8");
		const lines = chunk.split("\n");

		// Scan backward through lines, find last valid JSON with an `id` field
		for (let i = lines.length - 1; i >= 0; i--) {
			const line = lines[i];
			if (line === undefined || line.trim() === "") {
				continue;
			}
			try {
				const parsed: unknown = JSON.parse(line);
				if (
					typeof parsed === "object" &&
					parsed !== null &&
					"id" in parsed &&
					typeof (parsed as Record<string, unknown>).id === "string"
				) {
					return (parsed as Record<string, unknown>).id as string;
				}
			} catch {
				// Corrupt or partial line — skip
			}
		}

		return null;
	} finally {
		fs.closeSync(fd);
	}
}
