import { describe, expect, it } from "vitest";
import {
	getHmacKey,
	serializeForHmac,
	signStateTree,
	verifyStateTree,
} from "../../../src/core/data/hmac.js";
import type {
	DirectoryEntry,
	JsonEntry,
	JsonlEntry,
	MarkdownEntry,
	ProjectState,
	StateEntry,
} from "../../../src/core/tree.js";

// ── Helpers ──────────────────────────────────────────────────

function dir(contents: Record<string, StateEntry>): DirectoryEntry {
	return { type: "directory", contents };
}

function json<T>(content: T): JsonEntry<T> {
	return { type: "json", content };
}

function jsonl<T>(content: T[]): JsonlEntry<T> {
	return { type: "jsonl", content };
}

function md(content: string): MarkdownEntry {
	return { type: "markdown", content };
}

// ── Fixtures ─────────────────────────────────────────────────

function makeState(overrides?: {
	stateSignature?: string;
	name?: string;
}): ProjectState {
	return dir({
		"project.json": json({
			version: "1.0.0",
			name: overrides?.name ?? "test-project",
			activeEpic: null,
			activeSlice: null,
			activeQuest: null,
			created: "2026-01-01T00:00:00.000Z",
			updated: "2026-01-01T00:00:00.000Z",
			...(overrides?.stateSignature !== undefined
				? { stateSignature: overrides.stateSignature }
				: {}),
		}),
		"activity-log.jsonl": jsonl([{ timestamp: "2026-01-01T00:00:00.000Z", event: "PROJECT_INIT" }]),
		"readme.md": md("# Test Project"),
		epics: dir({
			"overview.json": json({ items: [] }),
		}),
	});
}

// ── serializeForHmac ─────────────────────────────────────────

describe("serializeForHmac", () => {
	it("excludes markdown entries from output entirely", () => {
		const state = makeState();
		const result = serializeForHmac(state);
		const parsed = JSON.parse(result) as Record<string, unknown>;
		// Markdown entries must be completely absent — not even present as `true`.
		// Sub-agents write .md files directly to disk between commits, so
		// their presence/absence must not affect the HMAC.
		expect(parsed).not.toHaveProperty("readme.md");
	});

	it("excludes stateSignature from project node", () => {
		const state = makeState({ stateSignature: "abc123" });
		const result = serializeForHmac(state);
		const parsed = JSON.parse(result) as Record<string, unknown>;
		const projectNode = parsed["project.json"] as Record<string, unknown>;
		expect(projectNode).not.toHaveProperty("stateSignature");
	});

	it("includes JSON and JSONL entries", () => {
		const state = makeState();
		const result = serializeForHmac(state);
		const parsed = JSON.parse(result) as Record<string, unknown>;
		expect(parsed["project.json"]).toBeDefined();
		expect(parsed["activity-log.jsonl"]).toBeDefined();
		const epics = parsed.epics as Record<string, unknown>;
		expect(epics["overview.json"]).toBeDefined();
	});

	it("produces identical output for same state (deterministic)", () => {
		const state1 = makeState();
		const state2 = makeState();
		expect(serializeForHmac(state1)).toBe(serializeForHmac(state2));
	});
});

// ── signStateTree ────────────────────────────────────────────

describe("signStateTree", () => {
	it("produces consistent signature for same state", () => {
		const state = makeState();
		const sig1 = signStateTree(state);
		const sig2 = signStateTree(state);
		expect(sig1).toBe(sig2);
		// Should be a 64-char hex string (SHA-256)
		expect(sig1).toMatch(/^[0-9a-f]{64}$/);
	});

	it("produces different signature for different state", () => {
		const state1 = makeState({ name: "project-a" });
		const state2 = makeState({ name: "project-b" });
		expect(signStateTree(state1)).not.toBe(signStateTree(state2));
	});
});

// ── verifyStateTree ──────────────────────────────────────────

describe("verifyStateTree", () => {
	it("returns true for matching signature", () => {
		const state = makeState();
		const sig = signStateTree(state);
		expect(verifyStateTree(state, sig)).toBe(true);
	});

	it("returns false for tampered state", () => {
		const state = makeState();
		const sig = signStateTree(state);
		// Tamper with the state after signing
		const tampered = makeState({ name: "tampered" });
		expect(verifyStateTree(tampered, sig)).toBe(false);
	});

	it("returns false for non-hex/malformed signature input", () => {
		const state = makeState();
		expect(verifyStateTree(state, "not-a-hex-string")).toBe(false);
		expect(verifyStateTree(state, "")).toBe(false);
		expect(verifyStateTree(state, "zzzz")).toBe(false);
	});
});

// ── getHmacKey ───────────────────────────────────────────────

describe("getHmacKey", () => {
	it("returns the dev HMAC key", () => {
		expect(getHmacKey()).toBe("goodplan-dev-hmac-key");
	});
});
