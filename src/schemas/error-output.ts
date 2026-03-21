import { z } from "zod";

export const errorSchema = z.object({
	code: z.string(),
	message: z.string(),
	detail: z.string().optional(),
});

/**
 * Note on exactOptionalPropertyTypes: The inferred type has `detail?: string | undefined`,
 * which means callers may pass `detail: undefined` explicitly. This differs from
 * GoodplanError.detail (always present as `string | undefined`). This is acceptable
 * because the schema is used for JSON output validation, where the field may be absent.
 */

export type ErrorOutput = z.infer<typeof errorSchema>;
