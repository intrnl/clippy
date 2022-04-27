import type { StrictValidator } from 'typanion';

import type { CommandBuilder, RunState } from '../../core.js';
import type { CliContext } from '../Cli.js';
import { applyValidator, GeneralOptionFlags, rerouteArguments, WithArity } from './utils.js';
import { NoLimits } from '../../core.js';
import { BaseOption } from './utils.js';

export interface StringFlagsNoBoolean<T, Arity extends number = 1> extends GeneralOptionFlags {
	env?: string;
	validator?: StrictValidator<unknown, T>;
	tolerateBoolean?: false;
	arity?: Arity;
}

export interface StringFlagsTolerateBoolean<T> extends GeneralOptionFlags {
	env?: string;
	validator?: StrictValidator<unknown, T>;
	tolerateBoolean: boolean;
	arity?: 0;
}

export type StringFlags<T> =
	| StringFlagsNoBoolean<T>
	| StringFlagsTolerateBoolean<T>;

export interface StringPositionalFlags<T> {
	name?: string;
	required?: boolean;
	validator?: StrictValidator<unknown, T>;
}

/**
 * Used to annotate positional options. Such options will be strings
 * unless they are provided a schema, which will then be used for coercion.
 *
 * Be careful: this function is order-dependent! Make sure to define your
 * positional options in the same order you expect to find them on the
 * command line.
 */
export function String (): string;
export function String<T = string> (opts: StringPositionalFlags<T> & { required: false }): T | undefined;
export function String<T = string> (opts: StringPositionalFlags<T>): T;

/**
 * Used to annotate string options. Such options will be typed as strings
 * unless they are provided a schema, which will then be used for coercion.
 *
 * @example
 * --foo=hello --bar world
 *     ► {"foo": "hello", "bar": "world"}
 */
export function String<T = string, Arity extends number = 1> (descriptor: string, opts: StringFlagsNoBoolean<T, Arity> & { required: true },): WithArity<T, Arity>;
export function String<T = string, Arity extends number = 1> (descriptor: string, opts?: StringFlagsNoBoolean<T, Arity>,): WithArity<T, Arity> | undefined;
export function String<T = string, Arity extends number = 1> (descriptor: string, initialValue: WithArity<string, Arity>, opts?: Omit<StringFlagsNoBoolean<T, Arity>, 'required'>): WithArity<T, Arity>;
export function String<T = string> (descriptor: string, opts: StringFlagsTolerateBoolean<T> & { required: true }): T | boolean;
export function String<T = string> (descriptor: string, opts: StringFlagsTolerateBoolean<T>): T | boolean | undefined;
export function String<T = string> (descriptor: string, initialValue: string | boolean, opts: Omit<StringFlagsTolerateBoolean<T>, 'required'>): T | boolean;

// This function is badly typed, but it doesn't matter because the overloads provide the true public typings
export function String (descriptor?: unknown, ...args: any[]) {
	if (Array.isArray(descriptor)) {
		const [initialValue, opts] = rerouteArguments(args[0], args[1] ?? {});
		return new StringOption(descriptor, initialValue, opts);
	}
	else {
		return new StringPositionalOption(descriptor as any ?? {}) as any;
	}
}


class StringOption<T = string, Arity extends number = 1> extends BaseOption {
	descriptor: string[];
	initialValue: WithArity<string, Arity> | string | boolean | undefined;

	env?: string;
	validator?: StrictValidator<unknown, T>;
	tolerateBoolean?: boolean;
	arity?: number;

	description?: string;
	required?: boolean;
	hidden?: boolean;

	constructor (descriptor: string[], initialValue: WithArity<string, Arity> | string | boolean | undefined, opts: StringFlags<T>) {
		super();

		const { arity = 1 } = opts;

		this.descriptor = descriptor;
		this.initialValue = initialValue;

		this.env = opts.env;
		this.validator = opts.validator;
		this.tolerateBoolean = opts.tolerateBoolean;
		this.arity = arity;

		this.description = opts.description;
		this.required = opts.required;
		this.hidden = opts.hidden;
	}

	define (builder: CommandBuilder<CliContext<any>>, key: string): void {
		builder.addOption({
			names: this.descriptor,

			arity: this.tolerateBoolean ? 0 : this.arity,

			description: this.description,
			required: this.required,
			hidden: this.hidden,
		});
	}

	transform (builder: CommandBuilder<CliContext<any>>, key: string, state: RunState, context: any) {
		const set = new Set(this.descriptor);

		let usedName;
		let currentValue = this.initialValue;

		if (this.env !== undefined && context.env[this.env]) {
			usedName = this.env;
			currentValue = context.env[this.env];
		}

		for (const { name, value } of state.options) {
			if (!set.has(name)) {
				continue;
			}

			usedName = name;
			currentValue = value;
		}

		if (typeof currentValue === 'string') {
			return applyValidator(usedName ?? key, currentValue, this.validator);
		}
		else {
			return currentValue;
		}
	}
}

class StringPositionalOption<T = string> extends BaseOption {
	name?: string;
	required?: boolean;
	validator?: StrictValidator<unknown, T>;

	constructor (opts: StringPositionalFlags<T>) {
		super();

		const { required = true } = opts;

		this.name = opts.name;
		this.required = required;
		this.validator = opts.validator;
	}

	define (builder: CommandBuilder<CliContext<any>>, key: string): void {
		builder.addPositional({
			name: this.name ?? key,
			required: this.required,
		});
	}

	transform (builder: CommandBuilder<CliContext<any>>, key: string, state: RunState, context: any) {
		const required = this.required;

		for (let idx = 0; idx < state.positionals.length; idx++) {
			const positional = state.positionals[idx];

			// We skip NoLimits extras. We only care about
			// required and optional finite positionals.
			if (positional.extra === NoLimits) {
				continue;
			}

			// We skip optional positionals when we only
			// care about required positionals.
			if (required && positional.extra === true) {
				continue;
			}

			// We skip required positionals when we only
			// care about optional positionals.
			if (!required && positional.extra === false) {
				continue;
			}

			// Remove positional from the list.
			state.positionals.splice(idx, 1);

			return applyValidator(this.name ?? key, positional.value, this.validator);
		}

		return undefined;
	}
}
