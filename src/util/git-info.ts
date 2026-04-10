import { execSync } from "node:child_process";

/**
 * Resolve the current git branch name.
 * Returns "unknown" if not in a git repo or git is unavailable.
 */
export function getGitBranch(): string {
	try {
		const result = execSync("git rev-parse --abbrev-ref HEAD", {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
		const branch = result.trim();
		return branch.length > 0 ? branch : "unknown";
	} catch {
		return "unknown";
	}
}

/**
 * Resolve the current git commit SHA (full hash).
 * Returns null if not in a git repo or git is unavailable.
 */
export function getGitCommitHint(): string | null {
	try {
		const result = execSync("git rev-parse HEAD", {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
		const sha = result.trim();
		return sha.length > 0 ? sha : null;
	} catch {
		return null;
	}
}
