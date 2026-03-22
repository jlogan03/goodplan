import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { begin } from "../../../src/core/rpc/begin.js";
import { submit } from "../../../src/core/rpc/submit.js";
import { complete } from "../../../src/core/rpc/complete.js";
import { rpcInit } from "../../../src/core/rpc/init.js";
import { GoodplanError } from "../../../src/util/errors.js";
import type { Verification, VerificationResult } from "../../../src/schemas/entities/epic.js";

let tmpDir: string;
let projectDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-rpc-complete-"));
	projectDir = path.join(tmpDir, ".project");
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

const verification: Verification = {
	description: "CLI works",
	status: "pending",
	addedDuring: "defining-slices",
	modifiedDuring: null,
};

function setupActivatedEpic() {
	rpcInit(projectDir, "test");
	begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });
	begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
	submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });
	begin(projectDir, "define-architecture", { type: "epic", name: "e1" }, {});
	submit(projectDir, "architecture", { type: "epic", name: "e1" }, { phase: "architecture" });
	begin(projectDir, "refine-architecture", { type: "epic", name: "e1" }, {});
	submit(projectDir, "refine-architecture", { type: "epic", name: "e1" }, {
		phase: "refine-architecture",
		scores: { q: 10 },
	});
	begin(projectDir, "define-slices", { type: "epic", name: "e1" }, {});
	submit(projectDir, "slices", { type: "epic", name: "e1" }, { phase: "slices" });
	begin(projectDir, "refine-slices", { type: "epic", name: "e1" }, {});
	submit(projectDir, "refine-slices", { type: "epic", name: "e1" }, {
		phase: "refine-slices",
		scores: { q: 10 },
	});
	begin(projectDir, "add-verification", { type: "epic", name: "e1" }, { verification });
	begin(projectDir, "activate", { type: "epic", name: "e1" }, {});
}

describe("complete — COMPLETE_EPIC", () => {
	it("completes epic with all verifications passing", () => {
		setupActivatedEpic();

		const verificationResults: VerificationResult[] = [
			{ index: 0, passed: true, notes: "All good" },
		];

		const result = complete(
			projectDir,
			{ type: "epic", name: "e1" },
			{ type: "epic", verificationResults },
		);

		expect(result.entity).toBe("e1");
		expect(result.previousStatus).toBe("activated");
		expect(result.newStatus).toBe("completed");
	});

	it("rejects completion when verification fails", () => {
		setupActivatedEpic();

		const verificationResults: VerificationResult[] = [
			{ index: 0, passed: false, notes: "Not working" },
		];

		expect(() =>
			complete(
				projectDir,
				{ type: "epic", name: "e1" },
				{ type: "epic", verificationResults },
			),
		).toThrow(GoodplanError);

		try {
			complete(
				projectDir,
				{ type: "epic", name: "e1" },
				{ type: "epic", verificationResults },
			);
		} catch (err) {
			expect((err as GoodplanError).code).toBe("STATE_VERIFICATION_FAILED");
		}
	});
});

describe("complete — not yet implemented", () => {
	it("throws for slice completion", () => {
		rpcInit(projectDir, "test");

		expect(() =>
			complete(
				projectDir,
				{ type: "slice", name: "s1" },
				{ type: "slice", verificationPassed: true },
			),
		).toThrow("not yet implemented");
	});

	it("throws for quest completion", () => {
		rpcInit(projectDir, "test");

		expect(() =>
			complete(
				projectDir,
				{ type: "quest", name: "q1" },
				{ type: "quest", verificationPassed: true },
			),
		).toThrow("not yet implemented");
	});
});
