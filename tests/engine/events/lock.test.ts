import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { acquireLock, withLock } from "../../../src/engine/events/lock.js";

describe("acquireLock", () => {
	let tmpDir: string;
	let lockPath: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lock-test-"));
		lockPath = path.join(tmpDir, "test.lock");
		// Touch the sidecar file (proper-lockfile requires it to exist)
		fs.writeFileSync(lockPath, "");
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("acquires and releases a lock", async () => {
		const handle = await acquireLock(lockPath);
		expect(handle).toBeDefined();
		expect(typeof handle.release).toBe("function");
		handle.release();
	});

	it("blocks a second lock until the first is released", async () => {
		const handle1 = await acquireLock(lockPath);

		// Second lock with short timeout should fail
		await expect(acquireLock(lockPath, 200)).rejects.toThrow(/Failed to acquire lock/);

		handle1.release();

		// Now it should succeed
		const handle2 = await acquireLock(lockPath);
		handle2.release();
	});

	it("throws DATA_CONCURRENT_MODIFICATION on timeout", async () => {
		const handle = await acquireLock(lockPath);

		try {
			await acquireLock(lockPath, 100);
			expect.unreachable("should have thrown");
		} catch (err) {
			expect(err).toMatchObject({ code: "DATA_CONCURRENT_MODIFICATION" });
		}

		handle.release();
	});
});

describe("withLock", () => {
	let tmpDir: string;
	let lockPath: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "withlock-test-"));
		lockPath = path.join(tmpDir, "test.lock");
		fs.writeFileSync(lockPath, "");
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("executes function and returns result", async () => {
		const result = await withLock(lockPath, () => 42);
		expect(result).toBe(42);
	});

	it("releases lock even when function throws", async () => {
		await expect(
			withLock(lockPath, () => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");

		// Lock should be released — acquiring again should succeed
		const handle = await acquireLock(lockPath);
		handle.release();
	});

	it("works with async functions", async () => {
		const result = await withLock(lockPath, async () => {
			return "async-result";
		});
		expect(result).toBe("async-result");
	});
});
