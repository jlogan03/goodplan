import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { copyMarkdownFiles, writeMarkdownFiles } from "../../../src/core/data/markdown-files.js";
import type { MarkdownCopy, MarkdownFile } from "../../../src/core/data/markdown-files.js";
import { GoodplanError } from "../../../src/util/errors.js";

// ── Temp dir setup ───────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(import.meta.dirname, "md-files-test-"));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── writeMarkdownFiles ───────────────────────────────────────

describe("writeMarkdownFiles", () => {
	it("creates directories and writes content", () => {
		const files: MarkdownFile[] = [
			{ path: "epics/e1/learnings/test.md", content: "# Learning\nSome content" },
		];
		writeMarkdownFiles(tmpDir, files);

		const absPath = path.join(tmpDir, "epics/e1/learnings/test.md");
		expect(fs.existsSync(absPath)).toBe(true);
		expect(fs.readFileSync(absPath, "utf-8")).toBe("# Learning\nSome content");
	});

	it("writes multiple files", () => {
		const files: MarkdownFile[] = [
			{ path: "a.md", content: "A" },
			{ path: "sub/b.md", content: "B" },
		];
		writeMarkdownFiles(tmpDir, files);

		expect(fs.readFileSync(path.join(tmpDir, "a.md"), "utf-8")).toBe("A");
		expect(fs.readFileSync(path.join(tmpDir, "sub/b.md"), "utf-8")).toBe("B");
	});

	it("throws GoodplanError with DATA_WRITE_ERROR on write failure", () => {
		// Create directory structure but make the leaf dir read-only so the
		// tmp file write (inside the try block) fails, triggering GoodplanError
		const leafDir = path.join(tmpDir, "readonly");
		fs.mkdirSync(leafDir, { recursive: true });
		fs.chmodSync(leafDir, 0o444);

		const files: MarkdownFile[] = [{ path: "readonly/test.md", content: "fail" }];

		try {
			writeMarkdownFiles(tmpDir, files);
			expect.unreachable("should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(GoodplanError);
			expect((err as GoodplanError).code).toBe("DATA_WRITE_ERROR");
		} finally {
			// Restore permissions for cleanup
			fs.chmodSync(leafDir, 0o755);
		}
	});

	it("leaves no .tmp files after successful write (atomic write)", () => {
		const files: MarkdownFile[] = [{ path: "atomic.md", content: "test content" }];
		writeMarkdownFiles(tmpDir, files);

		// Verify file exists with correct content
		expect(fs.readFileSync(path.join(tmpDir, "atomic.md"), "utf-8")).toBe("test content");

		// Verify no .tmp files remain
		const dirContents = fs.readdirSync(tmpDir);
		const tmpFiles = dirContents.filter((f) => f.includes(".tmp."));
		expect(tmpFiles).toHaveLength(0);
	});
});

// ── copyMarkdownFiles ────────────────────────────────────────

describe("copyMarkdownFiles", () => {
	it("copies existing file to destination", () => {
		// Set up source file
		const srcDir = path.join(tmpDir, "src");
		fs.mkdirSync(srcDir, { recursive: true });
		fs.writeFileSync(path.join(tmpDir, "src/source.md"), "original content");

		const copies: MarkdownCopy[] = [{ from: "src/source.md", to: "dest/copied.md" }];
		copyMarkdownFiles(tmpDir, copies);

		const destPath = path.join(tmpDir, "dest/copied.md");
		expect(fs.existsSync(destPath)).toBe(true);
		expect(fs.readFileSync(destPath, "utf-8")).toBe("original content");
	});

	it("skips missing source gracefully", () => {
		const copies: MarkdownCopy[] = [{ from: "nonexistent/source.md", to: "dest/target.md" }];

		// Should not throw
		copyMarkdownFiles(tmpDir, copies);

		// Destination should not exist
		expect(fs.existsSync(path.join(tmpDir, "dest/target.md"))).toBe(false);
	});
});
