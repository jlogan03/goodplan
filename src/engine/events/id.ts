export function generateEventId(): string {
	return crypto.randomUUID();
}

export function generateTimestamp(): string {
	return new Date().toISOString(); // ISO-8601 UTC with ms precision
}
