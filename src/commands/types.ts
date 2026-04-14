/**
 * Universal output shape for mutating commands (--json mode).
 *
 * Every mutating command returns this envelope. The `event` field
 * contains the event ID (UUID), `entity` is the affected entity ref.
 */
export interface MutatingCommandOutput<E extends string = string> {
	ok: true;
	event: E;
	entity: string;
}
