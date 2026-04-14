import { describe, expect, it } from "vitest";
import { MemoryGitOps } from "./git-ops-memory.js";

describe("MemoryGitOps", () => {
	describe("hashObject + catFile round-trip", () => {
		it("stores and retrieves content by SHA", async () => {
			const git = new MemoryGitOps();
			const content = new TextEncoder().encode("hello world");

			const sha = await git.hashObject(content);
			expect(sha).toMatch(/^[0-9a-f]{40}$/);

			const retrieved = await git.catFile(sha);
			expect(retrieved).toEqual(content);
		});

		it("returns same SHA for same content", async () => {
			const git = new MemoryGitOps();
			const content = new TextEncoder().encode("duplicate");

			const sha1 = await git.hashObject(content);
			const sha2 = await git.hashObject(content);
			expect(sha1).toBe(sha2);
		});

		it("returns different SHAs for different content", async () => {
			const git = new MemoryGitOps();

			const sha1 = await git.hashObject(new TextEncoder().encode("alpha"));
			const sha2 = await git.hashObject(new TextEncoder().encode("beta"));
			expect(sha1).not.toBe(sha2);
		});
	});

	describe("catFile", () => {
		it("returns null for missing SHA", async () => {
			const git = new MemoryGitOps();
			const result = await git.catFile("0000000000000000000000000000000000000000");
			expect(result).toBeNull();
		});
	});

	describe("createMilestoneCommit", () => {
		it("records commit with message and paths", async () => {
			const git = new MemoryGitOps();
			const sha = await git.createMilestoneCommit("Phase 1 complete", [".goodplan/events.jsonl"]);

			expect(sha).toMatch(/^[0-9a-f]{40}$/);
			expect(git.commits).toHaveLength(1);
			expect(git.commits[0]?.message).toBe("Phase 1 complete");
			expect(git.commits[0]?.paths).toEqual([".goodplan/events.jsonl"]);
		});

		it("produces deterministic SHAs via monotonic counter", async () => {
			const git1 = new MemoryGitOps();
			const git2 = new MemoryGitOps();

			const sha1 = await git1.createMilestoneCommit("msg", ["a"]);
			const sha2 = await git2.createMilestoneCommit("msg", ["a"]);

			// Same message + same counter value = same SHA
			expect(sha1).toBe(sha2);
		});

		it("produces unique SHAs for sequential commits", async () => {
			const git = new MemoryGitOps();

			const sha1 = await git.createMilestoneCommit("first", ["a"]);
			const sha2 = await git.createMilestoneCommit("first", ["a"]);

			// Same message but different counter value = different SHA
			expect(sha1).not.toBe(sha2);
		});
	});
});
