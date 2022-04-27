import type { CommandBuilder, RunState } from '../../core.js';
import type { CliContext } from '../Cli.js';
import type { GeneralOptionFlags } from './utils.js';
import { BaseOption, rerouteArguments } from './utils.js';

export interface CounterFlags extends GeneralOptionFlags {}

/**
 * Used to annotate options whose repeated values are aggregated into a
 * single number.
 *
 * @example
 * -vvvvv
 *     ► {'v': 5}
 */
export function Counter(descriptor: string[], opts: CounterFlags & {required: true}): number;
export function Counter(descriptor: string[], opts?: CounterFlags): number | undefined;
export function Counter(descriptor: string[], initialValue: number, opts?: Omit<CounterFlags, 'required'>): number;
export function Counter(descriptor: string[], initialValueBase: CounterFlags | number | undefined, optsBase?: CounterFlags) {
  const [initialValue, opts] = rerouteArguments(initialValueBase, optsBase ?? {});

	return new CounterOption(descriptor, initialValue, opts) as any;
}

class CounterOption extends BaseOption<number | undefined> {
	description?: string;
	required?: boolean;
	hidden?: boolean;

	descriptor: string[];
	initialValue: number | undefined;

	constructor (descriptor: string[], initialValue: number | undefined, opts: CounterFlags) {
		super();

		this.descriptor = descriptor;
		this.initialValue = initialValue;

		this.description = opts.description;
		this.required = opts.required;
		this.hidden = opts.hidden;
	}

	define (builder: CommandBuilder<CliContext<any>>, key: string): void {
		builder.addOption({
			names: this.descriptor,

			allowBinding: false,
			arity: 0,

			hidden: this.hidden,
			description: this.description,
			required: this.required,
		});
	}

	transform (builder: CommandBuilder<CliContext<any>>, key: string, state: RunState, context: any): number | undefined {
		const set = new Set(this.descriptor);
		let currentValue = this.initialValue;

		for (const {name, value} of state.options) {
			if (!set.has(name)) {
				continue;
			}

			currentValue ??= 0;

			// Negated options reset the counter
			if (!value) {
				currentValue = 0;
			} else {
				currentValue += 1;
			}
		}

		return currentValue;
	}
}
