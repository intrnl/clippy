import type { CommandBuilder, RunState } from '../../core.js';
import type { CliContext } from '../Cli.js';
import { BaseOption } from './utils.js';

export interface ProxyFlags {
	name?: string;
	required?: number;
}

/**
 * Used to annotate that the command wants to retrieve all trailing
 * arguments that cannot be tied to a declared option.
 *
 * Be careful: this function is order-dependent! Make sure to define it
 * after any positional argument you want to declare.
 *
 * This function is mutually exclusive with Option.Rest.
 *
 * @example
 * yarn run foo hello --foo=bar world
 *     ► proxy = ['hello', '--foo=bar', 'world']
 */
export function Proxy (opts: ProxyFlags = {}): string[] {
	return new ProxyOption(opts) as any;
}

class ProxyOption extends BaseOption {
	name?: string;
	required?: number;

	constructor (opts: ProxyFlags) {
		super();

		this.name = opts.name;
		this.required = opts.required;
	}

	define (builder: CommandBuilder<CliContext<any>>, key: string): void {
		builder.addProxy({
			name: this.name ?? key,
			required: this.required,
		});
	}

	transform (builder: CommandBuilder<CliContext<any>>, key: string, state: RunState, context: any) {
		return state.positionals.map(({ value }) => value);
	}
}
