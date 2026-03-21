import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { readStdin } from "../../../src/util/stdin.js";

/**
 * Create a readable stream from string content, with optional isTTY flag.
 */
function createStream(content: string, options?: { isTTY?: boolean }): Readable {
	const readable = new Readable({
		read() {
			this.push(content);
			this.push(null);
		},
	});

	if (options?.isTTY) {
		Object.defineProperty(readable, "isTTY", { value: true, writable: false });
	}

	return readable;
}

describe("readStdin", () => {
	it("returns empty object when stdin is a TTY", async () => {
		// Create a stream that never pushes data but has isTTY=true
		const readable = new Readable({ read() {} });
		Object.defineProperty(readable, "isTTY", { value: true, writable: false });

		const result = await readStdin(readable);
		expect(result).toEqual({});
	});

	it("parses valid JSON from stdin", async () => {
		const stream = createStream('{"name": "test", "value": 42}');
		const result = await readStdin(stream);
		expect(result).toEqual({ name: "test", value: 42 });
	});

	it("returns empty object for empty stdin", async () => {
		const stream = createStream("");
		const result = await readStdin(stream);
		expect(result).toEqual({});
	});

	it("returns empty object for whitespace-only stdin", async () => {
		const stream = createStream("   \n  \t  ");
		const result = await readStdin(stream);
		expect(result).toEqual({});
	});

	it("throws VALIDATION_INVALID_STDIN for invalid JSON", async () => {
		const stream = createStream("not valid json");

		await expect(readStdin(stream)).rejects.toMatchObject({
			code: "VALIDATION_INVALID_STDIN",
		});
	});

	it("throws VALIDATION_INVALID_STDIN for non-object JSON (array)", async () => {
		const stream = createStream("[1, 2, 3]");

		await expect(readStdin(stream)).rejects.toMatchObject({
			code: "VALIDATION_INVALID_STDIN",
			message: "Stdin must be a JSON object",
		});
	});

	it("throws VALIDATION_INVALID_STDIN for non-object JSON (string)", async () => {
		const stream = createStream('"just a string"');

		await expect(readStdin(stream)).rejects.toMatchObject({
			code: "VALIDATION_INVALID_STDIN",
			message: "Stdin must be a JSON object",
		});
	});

	it("throws VALIDATION_STDIN_TOO_LARGE for oversized input", async () => {
		// Create a stream that yields > 1 MB in chunks
		const chunkSize = 65536;
		const totalNeeded = 1_048_577;
		let pushed = 0;

		const readable = new Readable({
			read() {
				if (pushed >= totalNeeded) {
					this.push(null);
					return;
				}
				const size = Math.min(chunkSize, totalNeeded - pushed);
				this.push("x".repeat(size));
				pushed += size;
			},
		});

		await expect(readStdin(readable)).rejects.toMatchObject({
			code: "VALIDATION_STDIN_TOO_LARGE",
		});
	});
});
