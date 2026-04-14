# llmEvaluate helper brittle when LLM returns prose instead of JSON

## Problem

During E2E validation (2026-04-13), the Plan-Implementation Coherence metric failed with:
```
FAIL: Plan-Implementation Coherence -- LLM evaluation error: JSON Parse error: Unexpected identifier "Looking"
```

The Sonnet evaluator returned text starting with "Looking at the plan..." instead of pure JSON, despite the prompt saying "Respond with ONLY a JSON object (no markdown fences)".

## Root Cause

The `llmEvaluate()` helper in `tools/dogfood/validate-consolidated.ts`:
1. Strips markdown fences
2. Trims whitespace
3. Calls `JSON.parse()` directly

But when the LLM returns prose before the JSON (e.g., "Looking at the plan, here's my assessment: {...}"), the parse fails. We waste the API call and get no quality signal.

## Fix

The helper should be more defensive:
1. Search for the first `{` and last `}` in the response
2. Extract just that substring and parse
3. If that fails, retry with a stricter prompt ("Your previous response was not valid JSON. Return ONLY the JSON object, no text before or after.")
4. If retry fails, return a structured "unparseable" result rather than crashing

## Impact

- 1 of 4 LLM evaluations failed due to this
- Wasted ~$0.50 on the failed eval
- Lost the coherence quality signal entirely for this run

## Files

- `tools/dogfood/validate-consolidated.ts` — `llmEvaluate` function
