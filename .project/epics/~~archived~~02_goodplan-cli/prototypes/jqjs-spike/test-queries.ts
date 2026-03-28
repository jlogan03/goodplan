/**
 * Runs all 7 test queries against a given binary/command,
 * reports results, and measures timing.
 */

const queries = [
  { label: "field access", expr: `.slices[0].name` },
  { label: "pipe + builtin", expr: `.slices | length` },
  { label: "filter", expr: `.slices[] | select(.status == "active")` },
  { label: "nested filter", expr: `.decisions[] | select(.tags | contains(["auth"]))` },
  { label: "array slicing", expr: `.learnings[2:5]` },
  { label: "object construction", expr: `{name: .name, sliceCount: (.slices | length)}` },
  { label: "sorting", expr: `.slices | sort_by(.sequence)` },
];

const cmd = process.argv[2] || "bun";
const args = process.argv.slice(3); // e.g. ["run", "index.ts"] or ["./jqjs-spike"]

async function runQuery(expr: string): Promise<{ output: string; timeMs: number; ok: boolean }> {
  const start = performance.now();
  const proc = Bun.spawn([cmd, ...args, expr], {
    cwd: import.meta.dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  const timeMs = performance.now() - start;
  return {
    output: stdout.trim() || stderr.trim(),
    timeMs,
    ok: exitCode === 0,
  };
}

console.log(`\nTesting with: ${cmd} ${args.join(" ")}\n`);
console.log("=".repeat(70));

let allPassed = true;
const results: Array<{ label: string; output: string; timeMs: number; ok: boolean }> = [];

for (const q of queries) {
  const result = await runQuery(q.expr);
  results.push({ label: q.label, ...result });
  const status = result.ok ? "PASS" : "FAIL";
  if (!result.ok) allPassed = false;
  console.log(`[${status}] ${q.label}`);
  console.log(`  expr: ${q.expr}`);
  console.log(`  time: ${result.timeMs.toFixed(1)}ms`);
  console.log(`  output: ${result.output.slice(0, 200)}`);
  console.log();
}

console.log("=".repeat(70));
console.log(`Result: ${allPassed ? "ALL PASSED" : "SOME FAILED"}`);
console.log(`Total queries: ${results.length}`);
console.log(`Passed: ${results.filter(r => r.ok).length}`);
console.log(`Failed: ${results.filter(r => !r.ok).length}`);

const avgTime = results.reduce((s, r) => s + r.timeMs, 0) / results.length;
console.log(`Avg time per query: ${avgTime.toFixed(1)}ms`);

// Output JSON for comparison
const outputMap = Object.fromEntries(results.map(r => [r.label, r.output]));
await Bun.write(
  `${import.meta.dir}/results-${args.includes("index.ts") ? "interpreted" : "compiled"}.json`,
  JSON.stringify(outputMap, null, 2)
);
