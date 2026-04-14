/**
 * Port interface for git operations.
 * The engine defines this port; implementations are injected at composition time.
 */
export interface GitOps {
	/** Store content as a git blob, returns 40-char SHA. Equivalent to `git hash-object -w`. */
	hashObject(content: Uint8Array): Promise<string>;
	/** Retrieve content by SHA. Returns null if blob is missing. Equivalent to `git cat-file -p`. */
	catFile(sha: string): Promise<Uint8Array | null>;
	/** Create a milestone commit staging the given paths. Returns commit SHA. */
	createMilestoneCommit(message: string, paths: string[]): Promise<string>;
}
