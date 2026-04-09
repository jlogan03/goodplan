import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readLastEventId } from "../../../src/engine/events/read-last-event.js";

describe("readLastEventId", () => {
	let tmpDir: string;
	let eventsPath: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "read-last-event-test-"));
		eventsPath = path.join(tmpDir, "events.jsonl");
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("returns null for non-existent file", () => {
		expect(readLastEventId(eventsPath)).toBeNull();
	});

	it("returns null for empty file", () => {
		fs.writeFileSync(eventsPath, "");
		expect(readLastEventId(eventsPath)).toBeNull();
	});

	it("returns the id from the last valid JSON line", () => {
		const lines = [
			JSON.stringify({ id: "aaa-111", type: "first" }),
			JSON.stringify({ id: "bbb-222", type: "second" }),
		];
		fs.writeFileSync(eventsPath, `${lines.join("\n")}\n`);
		expect(readLastEventId(eventsPath)).toBe("bbb-222");
	});

	it("skips trailing empty lines", () => {
		const line = JSON.stringify({ id: "ccc-333", type: "test" });
		fs.writeFileSync(eventsPath, `${line}\n\n\n`);
		expect(readLastEventId(eventsPath)).toBe("ccc-333");
	});

	it("skips corrupt trailing lines and returns last valid id", () => {
		const valid = JSON.stringify({ id: "ddd-444", type: "good" });
		fs.writeFileSync(eventsPath, `${valid}\n{corrupt-not-json\n`);
		expect(readLastEventId(eventsPath)).toBe("ddd-444");
	});

	it("returns null when all lines are corrupt", () => {
		fs.writeFileSync(eventsPath, "not-json-1\nnot-json-2\n");
		expect(readLastEventId(eventsPath)).toBeNull();
	});

	it("returns null when JSON line has no id field", () => {
		fs.writeFileSync(eventsPath, `${JSON.stringify({ type: "no-id" })}\n`);
		expect(readLastEventId(eventsPath)).toBeNull();
	});

	it("handles large files using tail-read (only reads last ~4KB)", () => {
		// Write a large file: many events followed by a last event
		const padding = JSON.stringify({ id: "old", data: "x".repeat(200) });
		const lines: string[] = [];
		// ~100 lines of padding (~30KB total)
		for (let i = 0; i < 100; i++) {
			lines.push(padding);
		}
		const lastLine = JSON.stringify({ id: "last-event-id", type: "final" });
		lines.push(lastLine);
		fs.writeFileSync(eventsPath, `${lines.join("\n")}\n`);

		expect(readLastEventId(eventsPath)).toBe("last-event-id");
	});
});
