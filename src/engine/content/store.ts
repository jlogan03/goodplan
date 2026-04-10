import { execSync } from "node:child_process";
import type { ContentRef } from "../../schemas/envelope.js";

/**
 * Store content as a git blob and return a ContentRef.
 *
 * Uses `git hash-object -w --stdin` to write the content to the git object store.
 * Returns a ContentRef with the resulting SHA, byte size, path, and media type.
 *
 * @param content - The content string to store
 * @param filePath - The logical file path for this content (stored in ContentRef.path)
 * @param mediaType - The media type (e.g., "text/markdown")
 */
export async function storeContentRef(
	content: string,
	filePath: string,
	mediaType: string,
): Promise<ContentRef> {
	const sha = execSync("git hash-object -w --stdin", {
		input: content,
		encoding: "utf-8",
		stdio: ["pipe", "pipe", "pipe"],
	}).trim();

	const size = Buffer.byteLength(content, "utf-8");

	return {
		sha,
		size,
		path: filePath,
		mediaType,
	};
}
