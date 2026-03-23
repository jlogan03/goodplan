import compile from "@michaelhomer/jqjs";
import sampleData from "./sample-data.json";

const query = process.argv[2];

if (!query) {
  console.error("Usage: jqjs-spike <jq-expression>");
  console.error('Example: jqjs-spike ".slices[0].name"');
  process.exit(1);
}

try {
  const filter = compile(query);
  const results: unknown[] = [];
  for (const value of filter(sampleData)) {
    results.push(value);
  }

  if (results.length === 1) {
    console.log(JSON.stringify(results[0], null, 2));
  } else {
    for (const r of results) {
      console.log(JSON.stringify(r, null, 2));
    }
  }
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
}
