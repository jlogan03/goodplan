import type { Readable } from "node:stream";
import { GoodplanError } from "./errors.js";

/** Maximum stdin size: 1 MB */
const MAX_STDIN_BYTES = 1_048_576;

interface StdinLike extends Readable {
	isTTY?: boolean;
}

/**
 * Read and parse JSON from stdin.
 * - If stdin is a TTY (interactive terminal), returns empty object immediately (no blocking).
 * - Reads all stdin content, enforces 1 MB size limit.
 * - Parses as JSON; throws VALIDATION_INVALID_STDIN on parse failure.
 * - Empty stdin is treated as {}.
 *
 * Accepts an optional stream parameter for testing; defaults to process.stdin.
 */
export async function readStdin(stream?: StdinLike): Promise<Record<string, unknown>> {
	const input: StdinLike = stream ?? (process.stdin as StdinLike);

	if (input.isTTY) {
		return {};
	}

	const chunks: Buffer[] = [];
	let totalBytes = 0;

	for await (const chunk of input) {
		const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
		totalBytes += buf.length;
		if (totalBytes > MAX_STDIN_BYTES) {
			throw new GoodplanError(
				"VALIDATION_STDIN_TOO_LARGE",
				`Stdin exceeds maximum size of ${MAX_STDIN_BYTES} bytes`,
			);
		}
		chunks.push(buf);
	}

	const raw = Buffer.concat(chunks).toString("utf-8").trim();

	if (raw === "") {
		return {};
	}

	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
			throw new GoodplanError("VALIDATION_INVALID_STDIN", "Stdin must be a JSON object");
		}
		return parsed as Record<string, unknown>;
	} catch (err) {
		if (err instanceof GoodplanError) throw err;
		throw new GoodplanError(
			"VALIDATION_INVALID_STDIN",
			"Stdin contains invalid JSON",
			undefined,
			err,
		);
	}
}
