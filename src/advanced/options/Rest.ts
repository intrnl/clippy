import type { CommandBuilder, RunState } from '../../core.js';
import type { CliContext } from '../Cli.js';
import { NoLimits } from '../../core.js';
import { BaseOption } from './utils.js';

export interface RestFlags {
	name?: string;
	required?: number;
}

/**
 * Used to annotate that the command supports any number of positional
 * arguments.
 *
 * Be careful: this function is order-dependent! Make sure to define it
 * after any positional argument you want to declare.
 *
 * This function is mutually exclusive with Option.Proxy.
 *
 * @example
 * yarn add hello world
 *     ► rest = ['hello', 'world']
 */
export function Rest (opts: RestFlags = {}): string[] {
	return new RestOption(opts) as any;
}

class RestOption extends BaseOption {
	name?: string;
	required?: number;

	constructor (opts: RestFlags) {
		super();

		this.name = opts.name;
		this.required = opts.required;
	}

	define (builder: CommandBuilder<CliContext<any>>, key: string): void {
		builder.addRest({
			name: this.name ?? key,
			required: this.required,
		});
	}

	transform (builder: CommandBuilder<CliContext<any>>, key: string, state: RunState, context: any) {
		// The builder's arity.extra will always be NoLimits,
		// because it is set when we call registerDefinition

		const isRestPositional = (index: number) => {
			const positional = state.positionals[index];

			// A NoLimits extra (i.e. an optional rest argument)
			if (positional.extra === NoLimits) {
				return true;
			}

			// A leading positional (i.e. a required rest argument)
			if (positional.extra === false && index < builder.arity.leading.length) {
				return true;
			}

			return false;
		};

		let count = 0;

		while (count < state.positionals.length && isRestPositional(count)) {
			count += 1;
		}

		return state.positionals.splice(0, count).map(({ value }) => value);
	}
}
