import type { CommandBuilder, RunState } from '../../core.js';
import type { CliContext } from '../Cli.js';
import type { GeneralOptionFlags } from './utils.js';
import { BaseOption, rerouteArguments } from './utils.js';

export interface BooleanFlags extends GeneralOptionFlags {}

/**
 * Used to annotate boolean options.
 *
 * @example
 * --foo --no-bar
 *     ► {"foo": true, "bar": false}
 */
export function Boolean(descriptor: string[], opts: BooleanFlags & { required: true }): boolean;
export function Boolean(descriptor: string[], opts?: BooleanFlags): boolean | undefined;
export function Boolean(descriptor: string[], initialValue: boolean, opts?: Omit<BooleanFlags, 'required'>): boolean;
export function Boolean(descriptor: string[], initialValueBase: BooleanFlags | boolean | undefined, optsBase?: BooleanFlags) {
	const [initialValue, opts] = rerouteArguments(initialValueBase, optsBase ?? {});

	return new BooleanOption(descriptor, initialValue, opts) as any;
}

class BooleanOption extends BaseOption<boolean | undefined> {
	description?: string;
	required?: boolean;
	hidden?: boolean;

	descriptor: string[];
	initialValue: boolean | undefined;

	constructor (descriptor: string[], initialValue: boolean | undefined, opts: BooleanFlags) {
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

			description: this.description,
			required: this.required,
			hidden: this.hidden,
		});
	}

	transform (builder: CommandBuilder<CliContext<any>>, key: string, state: RunState, context: any) {
		const set = new Set(this.descriptor);
		let currentValue = this.initialValue;

		for (const { name, value } of state.options) {
			if (!set.has(name)) {
				continue;
			}

			currentValue = value;
		}

		return currentValue;
	}
}
