import type { Coercion, CoercionFn, StrictValidator } from 'typanion';

import type { CommandBuilder, RunState } from '../../core.js';
import type { BaseContext, CliContext } from '../Cli.js';
import { UsageError } from '../../errors.js';

export const isOptionSymbol = Symbol('clippy/isOption');

export interface GeneralOptionFlags {
	description?: string;
	hidden?: boolean;
	required?: boolean;
}

// https://stackoverflow.com/a/52490977

export type TupleOf<Type, Arity extends number, Accumulator extends Array<Type>> =
	Accumulator['length'] extends Arity ? Accumulator : TupleOf<Type, Arity, [Type, ...Accumulator]>;

export type Tuple<Type, Arity extends number> = Arity extends Arity
	? number extends Arity
		? Array<Type>
		: TupleOf<Type, Arity, []>
	: never;

export type WithArity<Type, Arity extends number> = Arity extends 0
	? boolean
	: Arity extends 1
		? Type
		: number extends Arity
			? boolean | Type | Tuple<Type, Arity>
			: Tuple<Type, Arity>;

export abstract class BaseOption<T = any, Context extends BaseContext = any> {
	[isOptionSymbol] = true;

	abstract define (builder: CommandBuilder<CliContext<Context>>, key: string): void;
	abstract transform (builder: CommandBuilder<CliContext<Context>>, key: string, state: RunState, context: Context): T;
}

export type CommandOptionReturn<T> = T;

export function rerouteArguments<A, B>(a: A | B, b: B): [Exclude<A, B>, B];
export function rerouteArguments<A, B>(a: A | B | undefined, b: B): [Exclude<A, B> | undefined, B];
export function rerouteArguments<A, B>(a: A | B | undefined, b: B): [Exclude<A, B>, B] {
	if (typeof a === 'undefined') return [a, b] as any;

	if (typeof a === 'object' && a !== null && !Array.isArray(a)) {
		return [undefined, a as B] as any;
	} else {
		return [a, b] as any;
	}
}

export function cleanValidationError(message: string, lowerCase: boolean = false) {
	let cleaned = message.replace(/^\.: /, '');

	if (lowerCase) cleaned = cleaned[0].toLowerCase() + cleaned.slice(1);

	return cleaned;
}

export function formatError(message: string, errors: Array<string>) {
	if (errors.length === 1) {
		return new UsageError(`${message}: ${cleanValidationError(errors[0], true)}`);
	} else {
		return new UsageError(`${message}:\n${errors.map((error) => `\n- ${cleanValidationError(error)}`).join('')}`);
	}
}

export function applyValidator<U, V>(name: string, value: U, validator?: StrictValidator<unknown, V>) {
	if (typeof validator === 'undefined') {
		return value;
	}

	const errors: Array<string> = [];
	const coercions: Array<Coercion> = [];

	const coercion: CoercionFn = (v: any) => {
		const orig = value;
		value = v;
		return coercion.bind(null, orig);
	};

	const check = validator(value, { errors, coercions, coercion });

	if (!check) {
		throw formatError(`Invalid value for ${name}`, errors);
	}

	for (const [, op] of coercions) {
		op();
	}

	return value;
}
