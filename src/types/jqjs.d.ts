declare module "@michaelhomer/jqjs" {
	/**
	 * Compile a jq expression into a generator function.
	 * One-arg form: returns a generator function.
	 * Two-arg form: compiles and immediately runs against input data.
	 */
	function compile(expr: string): (input: unknown) => Generator<unknown>;
	function compile(expr: string, data: unknown): Generator<unknown>;

	export default compile;
}
