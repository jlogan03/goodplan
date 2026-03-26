import * as fs from "node:fs";
import { defineConfig } from "vitest/config";

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8")) as { version: string };

export default defineConfig({
	define: {
		__GOODPLAN_VERSION__: JSON.stringify(pkg.version),
	},
	test: {
		testTimeout: 30_000,
		globalSetup: ["tests/global-setup.ts"],
	},
});
