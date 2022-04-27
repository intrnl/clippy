import type { CommandBuilder, RunState } from '../../core.js';
import type { CliContext } from '../Cli.js';
import type { GeneralOptionFlags, WithArity } from './utils.js';
import { BaseOption, rerouteArguments } from './utils.js';

export interface ArrayFlags<Arity extends number = 1> extends GeneralOptionFlags {
	arity?: Arity;
};

/**
 * Used to annotate array options. Such options will be strings unless they
 * are provided a schema, which will then be used for coercion.
 *
 * @example
 * --foo hello --foo bar
 *     ► {'foo': ['hello', 'world']}
 */
export function Array<Arity extends number = 1>(descriptor: string[], opts: ArrayFlags<Arity> & { required: true }): Array<WithArity<string, Arity>>;
export function Array<Arity extends number = 1>(descriptor: string[], opts?: ArrayFlags<Arity>): Array<WithArity<string, Arity>> | undefined;
export function Array<Arity extends number = 1>(descriptor: string[], initialValue: Array<WithArity<string, Arity>>, opts?: Omit<ArrayFlags<Arity>, "required">): Array<WithArity<string, Arity>>;
export function Array<Arity extends number = 1>(descriptor: string[], initialValueBase: ArrayFlags<Arity> | Array<WithArity<string, Arity>> | undefined, optsBase?: ArrayFlags<Arity>) {
	const [initialValue, opts] = rerouteArguments(initialValueBase, optsBase ?? {});

	return new ArrayOption(descriptor, initialValue, opts) as any;
}

class ArrayOption<Arity extends number = 1> extends BaseOption<Array<WithArity<string, Arity>> | undefined> {
	description?: string;
	hidden?: boolean;
	required?: boolean;

	descriptor: string[];
	initialValue: Array<WithArity<string, Arity>> | undefined;
	arity: number;

	constructor (descriptor: string[], initialValue: Array<WithArity<string, Arity>> | undefined, opts: ArrayFlags<Arity>) {
		super();

		const { arity = 1 } = opts;

		this.descriptor = descriptor;
		this.initialValue = initialValue;
		this.arity = arity;

		this.description = opts.description;
		this.hidden = opts.hidden;
		this.required = opts.required;
	}

	define (builder: CommandBuilder<CliContext<any>>, key: string): void {
		builder.addOption({
			names: this.descriptor,

			arity: this.arity,

			description: this.description,
			required: this.required,
			hidden: this.hidden,
		});
	}

	transform (builder: CommandBuilder<CliContext<any>>, key: string, state: RunState, context: any) {
		const set = new Set(this.descriptor);
		const initialValue = this.initialValue;

		let currentValue = typeof initialValue !== 'undefined' ? [...initialValue] : undefined;

		for (const { name, value } of state.options) {
			if (!set.has(name)) {
				continue;
			}

			currentValue = currentValue ?? [];
			currentValue.push(value);
		}

		return currentValue;
	}
}
