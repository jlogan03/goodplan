import { createHash } from "node:crypto";
import type { GitOps } from "../../../src/engine/interfaces/git-ops.js";

/** Compute SHA-1 hex digest. Used by MemoryGitOps for deterministic content hashing. */
function computeSha1Hex(data: string | Uint8Array): string {
	return createHash("sha1").update(data).digest("hex");
}

/**
 * In-memory GitOps adapter for unit tests.
 * Stores blobs in a Map and tracks milestone commits.
 * Uses a monotonic counter (not Date.now()) for deterministic commit SHAs in tests.
 */
export class MemoryGitOps implements GitOps {
	readonly blobs = new Map<string, Uint8Array>();
	readonly commits: Array<{ sha: string; message: string; paths: string[] }> = [];
	private commitCounter = 0;

	async hashObject(content: Uint8Array): Promise<string> {
		const sha = computeSha1Hex(content);
		this.blobs.set(sha, content);
		return sha;
	}

	async catFile(sha: string): Promise<Uint8Array | null> {
		return this.blobs.get(sha) ?? null;
	}

	async createMilestoneCommit(message: string, paths: string[]): Promise<string> {
		// Use monotonic counter for deterministic, reproducible test SHAs
		const commitSha = computeSha1Hex(`${message}:${this.commitCounter++}`);
		this.commits.push({ sha: commitSha, message, paths });
		return commitSha;
	}
}
