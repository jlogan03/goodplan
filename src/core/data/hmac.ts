/**
 * HMAC-SHA256 state integrity — sign and verify the full state tree.
 *
 * Key injection follows the same `--define` pattern as `src/version.ts`:
 * compile-time replacement via `bun build --define`, dev/test fallback.
 */

// node:crypto used instead of Bun.CryptoHasher because Vitest runs under Node runtime.
import { createHmac, timingSafeEqual } from "node:crypto";
import { GoodplanError } from "../../util/errors.js";
import { debug } from "../../util/debug.js";
import { deterministicStringify } from "../../util/json.js";
import type { Project } from "../../schemas/entities/project.js";
import type { ProjectState, StateEntry } from "./tree.js";
import { getJson } from "./tree.js";

declare const __GP_HMAC_KEY__: string | undefined;

const DEV_KEY = "goodplan-dev-hmac-key";

/**
 * Returns the HMAC key — build-injected in production, dev constant otherwise.
 *
 * The `typeof` guard is required because `--define` replaces the identifier
 * textually and `=== undefined` may behave differently.
 */
export function getHmacKey(): string {
	return typeof __GP_HMAC_KEY__ !== "undefined" ? __GP_HMAC_KEY__ : DEV_KEY;
}

/**
 * Produce a canonical string representation of the state tree for HMAC input.
 *
 * 1. Walk the state tree, completely excluding markdown entries (not just
 *    replacing content — their presence/absence must not affect the hash,
 *    since sub-agents write `.md` files directly to disk between commits)
 * 2. Strip `stateSignature` from the `"project.json"` node
 * 3. Run through `deterministicStringify()` for canonical key ordering
 *
 * **Structural coupling:** The `"project.json"` key destructure assumes a
 * stable tree layout. If the project node is relocated (e.g., entity-restructuring
 * epic), the stripping silently stops working. Recursive stripping would be more
 * resilient but is low priority for current Developing maturity.
 */
export function serializeForHmac(state: ProjectState): string {
	const serialized = serializeExcludingMarkdown(state) as Record<string, unknown>;

	// Strip stateSignature from the project.json node specifically
	const projectNode = serialized["project.json"];
	if (projectNode !== null && typeof projectNode === "object" && !Array.isArray(projectNode)) {
		const { stateSignature: _, ...rest } = projectNode as Record<string, unknown>;
		serialized["project.json"] = rest;
	}

	return deterministicStringify(serialized);
}

/**
 * Recursively serialize the state tree, completely excluding markdown entries.
 * JSON entries are unwrapped to their content, JSONL entries to their arrays,
 * directories become plain objects with their children serialized.
 */
function serializeExcludingMarkdown(entry: StateEntry): unknown {
	switch (entry.type) {
		case "directory": {
			const result: Record<string, unknown> = {};
			for (const [key, child] of Object.entries(entry.contents)) {
				if (child.type === "markdown") continue;
				result[key] = serializeExcludingMarkdown(child);
			}
			return result;
		}
		case "json":
			return entry.content;
		case "jsonl":
			return entry.content;
		case "markdown":
			// Unreachable: markdown entries are filtered at the directory level before recursion.
			// Throw rather than return undefined to match the defensive never-guard pattern.
			throw new Error("serializeExcludingMarkdown: unexpected markdown entry (should be filtered by caller)");
		default: {
			const _exhaustive: never = entry;
			throw new Error(`Unknown StateEntry type: ${(_exhaustive as StateEntry).type}`);
		}
	}
}

/**
 * Compute HMAC-SHA256 over the state tree. Returns hex digest.
 */
export function signStateTree(state: ProjectState): string {
	const canonical = serializeForHmac(state);
	return createHmac("sha256", getHmacKey()).update(canonical).digest("hex");
}

/**
 * Verify the state tree's HMAC signature using timing-safe comparison.
 */
export function verifyStateTree(state: ProjectState, expectedSignature: string): boolean {
	const computed = signStateTree(state);
	const computedBuf = Buffer.from(computed, "hex");
	const expectedBuf = Buffer.from(expectedSignature, "hex");
	if (computedBuf.length !== expectedBuf.length) return false;
	return timingSafeEqual(computedBuf, expectedBuf);
}

/**
 * Verify the HMAC signature embedded in the project node, or no-op on bootstrap.
 * Bootstrap exception: if no signature is present (pre-HMAC repo), skip verification.
 * On mismatch: throw DATA_INTEGRITY_CHECK_FAILED.
 */
export function verifyHmacOrThrow(state: ProjectState): void {
	const project = getJson<Project>(state, "project.json");
	if (project === undefined) return;

	const signature = project.stateSignature;
	if (signature === undefined) {
		debug("verifyHmacOrThrow: no stateSignature in project node (bootstrap), skipping verification");
		return;
	}

	if (!verifyStateTree(state, signature)) {
		throw new GoodplanError(
			"DATA_INTEGRITY_CHECK_FAILED",
			"State integrity check failed. Run 'gp verify --fix' to repair.",
		);
	}
}
