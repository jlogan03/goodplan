/**
 * Shared dogfood test harness utilities.
 *
 * Extracted from duplicated patterns across the 5 existing harness scripts:
 * harness.ts, validate.ts, test-plugin-skills.ts, test-onboard.ts, test-migrate.ts.
 *
 * GP_CLI_PATH env var overrides the default gp binary location.
 */

import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type {
	CanUseTool,
	Options,
	SDKMessage,
	SDKResultMessage,
	SDKResultSuccess,
	SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
// ─── Constants ──────────────────────────────────────────────

/** Returns the platform-arch binary directory name (e.g. "macos-arm64", "linux-x64"). */
export function platformBinaryDir(): string {
	const arch = process.arch === "x64" ? "x64" : "arm64";
	const platform = process.platform === "linux" ? "linux" : "macos";
	return `${platform}-${arch}`;
}

function resolveDefaultGpBin(): string {
	if (process.env.GP_CLI_PATH) return process.env.GP_CLI_PATH;

	// Find the latest version in the plugin cache (avoids hardcoding version/arch)
	const cacheBase = join(
		process.env.HOME ?? "",
		".claude/plugins/cache/goodplan-marketplace/goodplan",
	);
	try {
		const versions = readdirSync(cacheBase)
			.filter((d: string) => statSync(join(cacheBase, d)).isDirectory())
			.sort()
			.reverse();
		if (versions.length > 0) {
			const first = versions[0];
			if (!first) return ""; // unreachable given length check above, satisfies noUncheckedIndexedAccess
			const candidate = join(cacheBase, first, "binaries", platformBinaryDir(), "gp");
			if (statSync(candidate, { throwIfNoEntry: false })) {
				return candidate;
			}
		}
	} catch {
		// Fall through to hardcoded fallback
	}

	// Last resort fallback — version string will go stale as the binary advances
	const fallback = join(
		process.env.HOME ?? "",
		".claude/plugins/cache/goodplan-marketplace/goodplan/1.0.2/binaries/macos-arm64/gp",
	);
	console.warn(
		"[resolveDefaultGpBin] Using hardcoded fallback path (version 1.0.2 / macos-arm64). " +
			"Set GP_CLI_PATH or ensure the plugin cache is populated to avoid stale paths.",
	);
	return fallback;
}

const DEFAULT_GP_BIN = resolveDefaultGpBin();

// ─── Types ──────────────────────────────────────────────────

export interface CliResult {
	stdout: string;
	exitCode: number;
}

export interface SimulatedUser {
	ask(question: string, options: Array<{ label: string; description: string }>): Promise<string>;
	totalCost(): number;
	close(): void;
}

export class FixtureSetupError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FixtureSetupError";
	}
}

// ─── Logger ─────────────────────────────────────────────────

export function createLogger(logFile: string): { log(msg: string): void } {
	mkdirSync(dirname(logFile), { recursive: true });
	writeFileSync(logFile, `# Log started: ${new Date().toISOString()}\n`);
	return {
		log(msg: string): void {
			appendFileSync(logFile, `${msg}\n`);
			console.log(msg);
		},
	};
}

// ─── CLI Helpers ────────────────────────────────────────────

export function gp(
	args: string[],
	opts?: { cwd?: string; gpBin?: string; stdin?: string },
): CliResult {
	const bin = opts?.gpBin ?? DEFAULT_GP_BIN;
	const cwd = opts?.cwd ?? process.cwd();
	try {
		const stdout = execFileSync(bin, args, {
			cwd,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
			input: opts?.stdin ?? "",
		});
		return { stdout, exitCode: 0 };
	} catch (e: unknown) {
		if (e instanceof Error && "status" in e && "stdout" in e) {
			const status = (e as { status: unknown }).status;
			const stdout = (e as { stdout: unknown }).stdout;
			return {
				stdout: String(stdout ?? ""),
				exitCode: typeof status === "number" ? status : 1,
			};
		}
		return { stdout: "", exitCode: 1 };
	}
}

/**
 * Parse JSON output from a `gp` CLI command.
 *
 * **Warning:** The return type `T` is an unvalidated cast from `JSON.parse`.
 * Callers trust the CLI to produce the expected shape. For Experimental maturity
 * this is acceptable — add a `schema` parameter if runtime validation is needed.
 */
export function gpJson<T>(
	args: string[],
	opts?: { cwd?: string; gpBin?: string; stdin?: string },
): T {
	const r = gp(args, opts);
	if (r.exitCode !== 0) {
		throw new Error(`gp ${args.join(" ")} failed (exit ${r.exitCode}): ${r.stdout.slice(0, 200)}`);
	}
	return JSON.parse(r.stdout) as T;
}

export function gpForce(
	args: string[],
	opts?: { cwd?: string; gpBin?: string; stdin?: string },
): CliResult & { retried: boolean } {
	const r = gp(args, opts);
	if (r.exitCode !== 0 && r.stdout.includes("CONCURRENT_MODIFICATION")) {
		const retry = gp([...args, "--force"], opts);
		return { ...retry, retried: true };
	}
	return { ...r, retried: false };
}

// ─── Entity Verification ────────────────────────────────────

export function verifyEntityStatus(
	type: "epic" | "slice" | "quest",
	name: string,
	expected: string,
	opts?: { cwd?: string; gpBin?: string },
): { ok: boolean; actual: string } {
	try {
		const data = gpJson<{ status: string }>([`${type}:show`, `--${type}`, name, "--json"], opts);
		return { ok: data.status === expected, actual: data.status };
	} catch {
		return { ok: false, actual: "not-found" };
	}
}

// ─── Violation Detection ────────────────────────────────────

export function checkViolation(toolName: string, input: unknown, violations: string[]): void {
	if (typeof input !== "object" || input === null || Array.isArray(input)) return;

	const record = input as Record<string, unknown>;
	const filePath = typeof record.file_path === "string" ? record.file_path : "";
	const command = typeof record.command === "string" ? record.command : "";

	// Check Read/Write/Edit on .goodplan/ structured state files
	if (filePath?.includes(".goodplan/")) {
		const isStructuredState = filePath.endsWith(".json") || filePath.endsWith(".jsonl");
		if (isStructuredState && ["Read", "Write", "Edit"].includes(toolName)) {
			violations.push(`${toolName} on ${filePath}`);
		}
	}

	// Check Bash for direct .goodplan/ file manipulation
	if (toolName === "Bash" && command) {
		const patterns = [
			/cat\s+[^|]*\.goodplan\/.*\.json/,
			/echo\s+.*>>\s*.*\.goodplan\/.*\.jsonl/,
			/echo\s+.*>\s*.*\.goodplan\/.*\.json/,
			/mv\s+.*\.goodplan\/.*~~archived~~/,
			/mv\s+.*\.goodplan\/.*__active__/,
			/sed\s+-i[^|]*\.goodplan\/.*\.json/,
			/node\s+-e\s+.*\.goodplan\//,
		];
		for (const re of patterns) {
			if (re.test(command)) {
				violations.push(`Bash: ${command.slice(0, 120)}`);
				break;
			}
		}
	}
}

// ─── Cost Tracker ───────────────────────────────────────────

export function createCostTracker(): {
	add(cost: number): void;
	total(): number;
} {
	let sum = 0;
	return {
		add(cost: number): void {
			sum += cost;
		},
		total(): number {
			return sum;
		},
	};
}

// ─── Transcript ─────────────────────────────────────────────

const INCLUDED_TYPES = new Set(["assistant", "user", "result", "system"]);

const transcriptBuffers = new Map<string, string[]>();
let exitHandlerRegistered = false;

function ensureExitHandler(): void {
	if (exitHandlerRegistered) return;
	exitHandlerRegistered = true;
	process.on("exit", () => {
		for (const [file, entries] of transcriptBuffers) {
			if (entries.length > 0) {
				try {
					appendFileSync(file, entries.join(""));
				} catch {
					// best-effort on exit
				}
			}
		}
		transcriptBuffers.clear();
	});
}

/**
 * Reset module-level transcript state. Use in tests for isolation between describe blocks.
 *
 * Note: the `process.on("exit")` handler registered by a previous `writeTranscriptEntry` call
 * is NOT removed — Node.js has no `removeExitListener`. The lingering handler flushes an empty
 * map (harmless), and the next `writeTranscriptEntry` call re-registers a new one. Acceptable
 * at Experimental maturity.
 */
export function resetTranscriptState(): void {
	transcriptBuffers.clear();
	exitHandlerRegistered = false;
}

export function writeTranscriptEntry(file: string, message: SDKMessage): void {
	if (!INCLUDED_TYPES.has(message.type)) return;

	ensureExitHandler();

	const line = `${JSON.stringify(message)}\n`;
	let buffer = transcriptBuffers.get(file);
	if (!buffer) {
		buffer = [];
		transcriptBuffers.set(file, buffer);
	}
	buffer.push(line);
}

export function flushTranscript(file: string): void {
	const buffer = transcriptBuffers.get(file);
	if (!buffer || buffer.length === 0) return;

	try {
		mkdirSync(dirname(file), { recursive: true });
		appendFileSync(file, buffer.join(""));
	} catch (err) {
		console.warn(
			`[transcript] flush failed for ${file}: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
	buffer.length = 0;
}

// ─── Type Guard ─────────────────────────────────────────────

export function isSuccess(result: SDKResultMessage): result is SDKResultSuccess {
	return result.subtype === "success";
}

// ─── Model Selection ────────────────────────────────────────

export function parseModel(defaultModel: string): string {
	const idx = process.argv.indexOf("--model");
	if (idx !== -1) {
		const next = process.argv[idx + 1];
		if (next && !next.startsWith("--")) {
			return next;
		}
	}
	return defaultModel;
}

export function tierDefault(
	tier: "structural" | "pipeline" | "quality" | "e2e",
): "claude-haiku-4-5" | "claude-sonnet-4-5" | "claude-opus-4-6" {
	switch (tier) {
		case "structural":
		case "pipeline":
			return "claude-haiku-4-5";
		case "quality":
			return "claude-sonnet-4-5";
		case "e2e":
			return "claude-opus-4-6";
	}
}

// ─── Simulated User ────────────────────────────────────────

/**
 * Simple async queue implementing AsyncIterable. Push items in; iterate to pull them out.
 * Used to feed user messages into a persistent Agent SDK query() session.
 */
class AsyncQueue<T> implements AsyncIterable<T> {
	private queue: T[] = [];
	private resolve: ((value: IteratorResult<T>) => void) | null = null;
	private done = false;

	push(item: T): void {
		if (this.done) return;
		if (this.resolve) {
			const r = this.resolve;
			this.resolve = null;
			r({ value: item, done: false });
		} else {
			this.queue.push(item);
		}
	}

	end(): void {
		this.done = true;
		if (this.resolve) {
			const r = this.resolve;
			this.resolve = null;
			r({ value: undefined as unknown as T, done: true });
		}
	}

	[Symbol.asyncIterator](): AsyncIterator<T> {
		return {
			next: (): Promise<IteratorResult<T>> => {
				const queued = this.queue.shift();
				if (queued !== undefined) {
					return Promise.resolve({ value: queued, done: false });
				}
				if (this.done) {
					return Promise.resolve({ value: undefined as unknown as T, done: true });
				}
				return new Promise<IteratorResult<T>>((resolve) => {
					this.resolve = resolve;
				});
			},
		};
	}
}

/**
 * Creates a persistent simulated user session using Agent SDK `query()` with
 * `AsyncIterable<SDKUserMessage>` as the prompt.
 *
 * The session stays alive for the duration of the test run. Each `ask()` call
 * pushes a new user message into the session via an async queue, so the simulated
 * user naturally accumulates conversational history — it has full context of all
 * prior questions and answers.
 *
 * The system prompt tells the simulated user about the project, its persona,
 * and the transcript file path (which it can Read for full session context).
 *
 * Uses the Claude subscription via Agent SDK — no ANTHROPIC_API_KEY needed.
 *
 * Call `close()` when done to terminate the session cleanly.
 */
export function createSimulatedUser(opts: {
	cwd: string;
	systemPrompt: string;
	transcriptFile: string;
	model?: string;
}): SimulatedUser {
	const model = opts.model ?? tierDefault("structural");
	const costTracker = createCostTracker();
	const abortController = new AbortController();

	// Async queue feeds SDKUserMessage objects into the persistent query() session.
	// Each ask() pushes a message; the session's async iterable yields them as user turns.
	const messageQueue = new AsyncQueue<SDKUserMessage>();

	// Push the initial setup message
	const initialMessage: SDKUserMessage = {
		type: "user",
		message: {
			role: "user",
			content: [
				"You are a simulated user in a test harness. You will be asked questions by a skill under test.",
				"For each question, you will be given options to choose from.",
				"",
				`The full session transcript is at: ${opts.transcriptFile}`,
				"You can Read this file to understand what has happened so far in the session.",
				"",
				"Reply with ONLY the exact label text of the option you choose. Nothing else.",
				"Do not add explanation, commentary, or formatting. Just the label.",
			].join("\n"),
		},
		parent_tool_use_id: null,
		session_id: "",
	};
	messageQueue.push(initialMessage);

	// Start the persistent session with the async queue as the prompt source
	const session = query({
		prompt: messageQueue,
		options: {
			model,
			cwd: opts.cwd,
			systemPrompt: opts.systemPrompt,
			permissionMode: "bypassPermissions",
			allowDangerouslySkipPermissions: true,
			abortController,
			allowedTools: ["Read", "Grep", "Glob"],
			maxTurns: 200, // generous — session is long-lived across many questions
		},
	});

	// Response collector: waits for the next assistant text response from the session stream.
	// The session yields messages as they arrive; we collect until we see a complete response.
	let responseResolve: ((answer: string) => void) | null = null;
	let lastCostUsd = 0;

	// Background loop: drain the session stream, collecting assistant responses
	const drainLoop = (async () => {
		try {
			for await (const message of session) {
				if (message.type === "assistant" && "message" in message) {
					const msg = message as { message?: { content?: Array<{ type: string; text?: string }> } };
					const textBlock = msg.message?.content?.find((b) => b.type === "text");
					if (textBlock?.text && responseResolve) {
						const r = responseResolve;
						responseResolve = null;
						r(textBlock.text.trim());
					}
				}
				if (message.type === "result" && "subtype" in message) {
					const result = message as { subtype: string; total_cost_usd?: number };
					if (result.total_cost_usd) {
						const incrementalCost = result.total_cost_usd - lastCostUsd;
						if (incrementalCost > 0) {
							costTracker.add(incrementalCost);
						}
						lastCostUsd = result.total_cost_usd;
					}
				}
			}
		} catch {
			// Session ended (abort or error) — expected during close()
		}
	})();

	// Wait for the initial setup turn to complete before accepting questions
	const waitForResponse = (): Promise<string> => {
		return new Promise<string>((resolve) => {
			responseResolve = resolve;
		});
	};

	// Drain the initial response (persona acknowledgment)
	let sessionReady = waitForResponse().then(() => {});

	return {
		totalCost(): number {
			return costTracker.total();
		},

		async ask(
			question: string,
			options: Array<{ label: string; description: string }>,
		): Promise<string> {
			// Wait for any previous turn to complete
			await sessionReady;

			const optionList = options
				.map((o, i) => `${i + 1}. "${o.label}" — ${o.description}`)
				.join("\n");

			const userContent = [
				"The skill is asking you the following question:",
				"",
				question,
				"",
				"Available options:",
				optionList,
				"",
				"Reply with ONLY the exact label text of the option you choose. Nothing else.",
			].join("\n");

			try {
				// Push a new user message into the session via the async queue
				const userMessage: SDKUserMessage = {
					type: "user",
					message: { role: "user", content: userContent },
					parent_tool_use_id: null,
					session_id: "",
				};
				messageQueue.push(userMessage);

				// Wait for the assistant's response
				const responsePromise = waitForResponse();
				sessionReady = responsePromise.then(() => {});
				const rawAnswer = await responsePromise;

				if (!rawAnswer) {
					console.warn("[simulatedUser] Empty response, falling back to first option");
					return options[0]?.label ?? "Proceed";
				}

				// Fuzzy match against options (strip quotes, case-insensitive)
				const normalized = rawAnswer.replace(/^["']|["']$/g, "").trim();
				const matched = options.find(
					(o) => o.label === normalized || o.label.toLowerCase() === normalized.toLowerCase(),
				);

				return matched?.label ?? options[0]?.label ?? rawAnswer;
			} catch (err) {
				console.warn(`[simulatedUser] ask failed, falling back to first option: ${err}`);
				return options[0]?.label ?? "Proceed";
			}
		},

		close(): void {
			messageQueue.end();
			abortController.abort();
			// drainLoop will exit naturally when the session ends
			void drainLoop;
		},
	};
}

// ─── AskUserQuestion Handler ────────────────────────────────

export function createAskUserHandler(simulatedUser: SimulatedUser): CanUseTool {
	return async (toolName, input) => {
		if (toolName === "AskUserQuestion") {
			if (
				typeof input === "object" &&
				input !== null &&
				"questions" in input &&
				Array.isArray((input as Record<string, unknown>).questions)
			) {
				const questions = (input as Record<string, unknown>).questions as Array<{
					question: string;
					options: Array<{ label: string; description: string }>;
				}>;
				const answers: Record<string, string> = {};
				for (const q of questions) {
					const opts = q.options.map((o) => ({
						label: o.label,
						description: o.description,
					}));
					const answer = await simulatedUser.ask(q.question, opts);
					answers[q.question] = answer;
				}
				return {
					behavior: "allow" as const,
					updatedInput: { questions, answers },
				};
			}
		}
		return { behavior: "allow" as const };
	};
}

// ─── Skill Session Runner ───────────────────────────────────

export interface SkillSessionResult {
	result: SDKResultMessage;
	violations: string[];
	totalCost: number;
}

export async function runSkillSession(opts: {
	prompt: string;
	options: Options;
	transcriptFile: string;
	simulatedUser?: SimulatedUser;
	checkViolations?: boolean;
	onMessage?: (msg: SDKMessage) => void;
}): Promise<SkillSessionResult> {
	const violations: string[] = [];
	const costTracker = createCostTracker();

	// Compose canUseTool from simulatedUser + violation detection
	const originalCanUseTool = opts.options.canUseTool;

	// Hoist handler creation outside per-tool-call path
	const askUserHandler = opts.simulatedUser ? createAskUserHandler(opts.simulatedUser) : undefined;

	const composedCanUseTool: CanUseTool = async (toolName, input, toolOpts) => {
		// Violation detection first
		if (opts.checkViolations) {
			checkViolation(toolName, input, violations);
		}

		// Simulated user handling
		if (askUserHandler && toolName === "AskUserQuestion") {
			return askUserHandler(toolName, input, toolOpts);
		}

		// Delegate to original if present
		if (originalCanUseTool) {
			return originalCanUseTool(toolName, input, toolOpts);
		}

		return { behavior: "allow" as const };
	};

	const mergedOptions: Options = {
		...opts.options,
		canUseTool: composedCanUseTool,
	};

	let resultMessage: SDKResultMessage | undefined;

	for await (const message of query({
		prompt: opts.prompt,
		options: mergedOptions,
	})) {
		writeTranscriptEntry(opts.transcriptFile, message);
		opts.onMessage?.(message);

		if (message.type === "result") {
			costTracker.add(message.total_cost_usd);
			resultMessage = message;
		}
	}

	flushTranscript(opts.transcriptFile);

	if (!resultMessage) {
		// This shouldn't happen, but handle gracefully
		throw new Error("runSkillSession: no result message received");
	}

	if (violations.length > 0) {
		console.warn(`[runSkillSession] ${violations.length} violation(s) detected:`);
		for (const v of violations) {
			console.warn(`  - ${v}`);
		}
	}

	// Roll simulated user LLM cost into the session total
	if (opts.simulatedUser) {
		costTracker.add(opts.simulatedUser.totalCost());
	}

	return {
		result: resultMessage,
		violations,
		totalCost: costTracker.total(),
	};
}

// ─── Fixture Creation ───────────────────────────────────────

export async function createMinimalFixture(opts?: {
	dir?: string;
	epicName?: string;
	sliceName?: string;
	withSource?: boolean;
}): Promise<string> {
	const tmpDir =
		opts?.dir ?? join("/tmp", `gp-fixture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
	const epicName = opts?.epicName ?? "test-epic";
	const sliceName = opts?.sliceName ?? "test-slice";
	const withSource = opts?.withSource ?? false;

	try {
		mkdirSync(tmpDir, { recursive: true });

		// package.json
		writeFileSync(
			join(tmpDir, "package.json"),
			JSON.stringify(
				{
					name: "gp-test-fixture",
					version: "0.1.0",
					type: "module",
					devDependencies: {},
				},
				null,
				2,
			),
		);

		if (withSource) {
			mkdirSync(join(tmpDir, "src"), { recursive: true });
			writeFileSync(
				join(tmpDir, "tsconfig.json"),
				JSON.stringify(
					{
						compilerOptions: {
							target: "ESNext",
							module: "ESNext",
							moduleResolution: "bundler",
							strict: true,
						},
						include: ["src/**/*.ts"],
					},
					null,
					2,
				),
			);
			writeFileSync(join(tmpDir, "src/index.ts"), 'export const version = "0.1.0";\n');
		}

		// git init + commit
		execFileSync("git", ["init"], { cwd: tmpDir, stdio: "pipe" });
		execFileSync("git", ["add", "-A"], { cwd: tmpDir, stdio: "pipe" });
		execFileSync(
			"git",
			["-c", "user.name=test", "-c", "user.email=test@test.com", "commit", "-m", "initial"],
			{
				cwd: tmpDir,
				stdio: "pipe",
			},
		);

		// gp init
		const initResult = gp(["init", "--name", "test-fixture", "--json"], {
			cwd: tmpDir,
		});
		if (initResult.exitCode !== 0) {
			throw new FixtureSetupError(
				`gp init failed (exit ${initResult.exitCode}): ${initResult.stdout}`,
			);
		}

		// gp epic:create via stdin
		const epicResult = gp(["epic:create", "--json"], {
			cwd: tmpDir,
			stdin: JSON.stringify({ name: epicName, goal: "Test epic goal" }),
		});
		if (epicResult.exitCode !== 0) {
			throw new FixtureSetupError(
				`gp epic:create failed (exit ${epicResult.exitCode}): ${epicResult.stdout}`,
			);
		}

		// gp slice:create via stdin
		const sliceResult = gp(["slice:create", "--epic", epicName, "--json"], {
			cwd: tmpDir,
			stdin: JSON.stringify({ name: sliceName, goal: "Test slice goal" }),
		});
		if (sliceResult.exitCode !== 0) {
			throw new FixtureSetupError(
				`gp slice:create failed (exit ${sliceResult.exitCode}): ${sliceResult.stdout}`,
			);
		}

		return tmpDir;
	} catch (e) {
		if (e instanceof FixtureSetupError) throw e;
		throw new FixtureSetupError(
			`Fixture creation failed: ${e instanceof Error ? e.message : String(e)}`,
		);
	}
}
