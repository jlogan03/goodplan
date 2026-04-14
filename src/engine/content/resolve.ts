import { execSync } from "node:child_process";
import type { ContentRef } from "../../schemas/envelope.js";

/**
 * Read content from a git blob by SHA.
 *
 * Uses `git cat-file blob <sha>` to retrieve the stored content.
 * Returns the content as a UTF-8 string.
 *
 * The return type is compatible with `ContentResolver` from the context layer
 * (both are `(ref: ContentRef) => string`), but this module does not import
 * from context to respect layer boundaries (engine must not import context).
 *
 * @param ref - The ContentRef containing the git blob SHA
 * @throws Error if the blob cannot be read (e.g., SHA not found in object store)
 */
export function readContentRef(ref: ContentRef): string {
	return execSync(`git cat-file blob ${ref.sha}`, {
		encoding: "utf-8",
		stdio: ["pipe", "pipe", "pipe"],
	});
}
