/**
 * HMAC-SHA256 state integrity — sign and verify the full state tree.
 *
 * Key injection follows the same `--define` pattern as `src/version.ts`:
 * compile-time replacement via `bun build --define`, dev/test fallback.
 */

// node:crypto used instead of Bun.CryptoHasher because Vitest runs under Node runtime.
import { createHmac, timingSafeEqual } from "node:crypto";
import { deterministicStringify } from "../../util/json.js";
import type { ProjectState } from "../tree.js";
import { serializeStateTree } from "./serialize.js";

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
 * 1. Serialize with `inline: false` (replaces markdown with `true`)
 * 2. Strip `stateSignature` from the `"project.json"` node
 * 3. Run through `deterministicStringify()` for canonical key ordering
 *
 * **Structural coupling:** The `"project.json"` key destructure assumes a
 * stable tree layout. If the project node is relocated (e.g., entity-restructuring
 * epic), the stripping silently stops working. Recursive stripping would be more
 * resilient but is low priority for current Developing maturity.
 */
export function serializeForHmac(state: ProjectState): string {
	const tree = serializeStateTree(state, { inline: false });

	// Shallow-copy to avoid mutating the serialized result in-place
	const serialized = { ...tree };

	// Strip stateSignature from the project.json node specifically
	const projectNode = serialized["project.json"];
	if (projectNode !== null && typeof projectNode === "object" && !Array.isArray(projectNode)) {
		const { stateSignature: _, ...rest } = projectNode as Record<string, unknown>;
		serialized["project.json"] = rest;
	}

	return deterministicStringify(serialized);
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
