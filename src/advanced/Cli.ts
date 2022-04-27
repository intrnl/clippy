import type { ColorFormat } from '../format.js';
import type { CommandBuilder } from '../core.js';
import type { CommandClass, Definition } from './Command.js';
import type { ErrorMeta } from '../errors.js';
import { BaseOption } from './options/utils.js';
import { CliBuilder } from '../core.js';
import { Command } from './Command.js';
import { formatMarkdownish, richFormat, textFormat } from '../format.js';
import { HELP_COMMAND_INDEX } from '../constants.js';
import { HelpCommand } from './HelpCommand.js';

const errorCommandSymbol = Symbol('clippy/errorCommand');

type MakeOptional<T, Keys extends keyof T> = Omit<T, Keys> & Partial<Pick<T, Keys>>;
type VoidIfEmpty<T> = keyof T extends never ? void : never;

declare const Deno: any;

/**
 * The base context of the CLI.
 *
 * All Contexts have to extend it.
 */
export type BaseContext = {
	console: typeof console;
	isColored: boolean;
};

export type CliContext<Context extends BaseContext> = {
	commandClass: CommandClass<Context>;
};

export type UserContextKeys<Context extends BaseContext> = Exclude<keyof Context, keyof BaseContext>;
export type UserContext<Context extends BaseContext> = Pick<Context, UserContextKeys<Context>>;

export type PartialContext<Context extends BaseContext> = UserContextKeys<Context> extends never
	? Partial<Pick<Context, keyof BaseContext>> | undefined | void
	: Partial<Pick<Context, keyof BaseContext>> & UserContext<Context>;

export type RunContext<Context extends BaseContext = BaseContext> =
	Partial<Pick<Context, keyof BaseContext>> & UserContext<Context>;

export type RunCommand<Context extends BaseContext = BaseContext> =
	| Array<CommandClass<Context>>
	| CommandClass<Context>;

export type RunCommandNoContext<Context extends BaseContext = BaseContext> =
	UserContextKeys<Context> extends never ? RunCommand<Context> : never;

export type CliOptions = Readonly<{
	/**
	 * The label of the binary.
	 *
	 * Shown at the top of the usage information.
	 */
	binaryLabel?: string;

	/**
	 * The name of the binary.
	 *
	 * Included in the path and the examples of the definitions.
	 */
	binaryName: string;

	/**
	 * The version of the binary.
	 *
	 * Shown at the top of the usage information.
	 */
	binaryVersion?: string;
}>;

export type MiniCli<Context extends BaseContext> = CliOptions & {
	/**
	 * Returns an Array representing the definitions of all registered commands.
	 */
	definitions(): Array<Definition>;

	/**
	 * Formats errors using colors.
	 *
	 * @param error The error to format. If `error.name` is `'Error'`, it is replaced with `'Internal Error'`.
	 * @param opts.command The command whose usage will be included in the formatted error.
	 */
	error(error: Error, opts?: { command?: Command<Context> | null }): string;

	/**
	 * Returns a rich color format if colors are enabled, or a plain text format otherwise.
	 *
	 * @param colored Forcefully enable or disable colors.
	 */
	format(colored?: boolean): ColorFormat;

	/**
	 * Compiles a command and its arguments using the `CommandBuilder`.
	 *
	 * @param input An array containing the name of the command and its arguments
	 *
	 * @returns The compiled `Command`, with its properties populated with the arguments.
	 */
	process(input: Array<string>, context?: Partial<Context>): Command<Context>;

	/**
	 * Runs a command.
	 *
	 * @param input An array containing the name of the command and its arguments
	 * @param context Overrides the Context of the main `Cli` instance
	 *
	 * @returns The exit code of the command
	 */
	run(input: Array<string>, context?: Partial<Context>): Promise<number>;

	/**
	 * Returns the usage of a command.
	 *
	 * @param command The `Command` whose usage will be returned or `null` to return the usage of all commands.
	 * @param opts.detailed If `true`, the usage of a command will also include its description, details, and examples. Doesn't have any effect if `command` is `null` or doesn't have a `usage` property.
	 * @param opts.prefix The prefix displayed before each command. Defaults to `$`.
	 */
	usage(command?: CommandClass<Context> | Command<Context> | null, opts?: { detailed?: boolean; prefix?: string }): string;
};

/**
 * An all-in-one helper that simultaneously instantiate a CLI and immediately
 * executes it. All parameters are optional except the command classes and
 * will be filled by sensible values for the current environment (for example
 * the argv argument will default to `process.argv`, etc).
 *
 * Unlike `runExit`, this function won't set the `process.exitCode` value
 * before returning.
 */
export async function run<Context extends BaseContext = BaseContext>(
	commandClasses: RunCommandNoContext<Context>
): Promise<number>;
export async function run<Context extends BaseContext = BaseContext>(
	commandClasses: RunCommand<Context>,
	context: RunContext<Context>
): Promise<number>;

export async function run<Context extends BaseContext = BaseContext>(
	options: Partial<CliOptions>,
	commandClasses: RunCommandNoContext<Context>
): Promise<number>;
export async function run<Context extends BaseContext = BaseContext>(
	options: Partial<CliOptions>,
	commandClasses: RunCommand<Context>,
	context: RunContext<Context>
): Promise<number>;

export async function run<Context extends BaseContext = BaseContext>(
	commandClasses: RunCommandNoContext<Context>,
	argv: Array<string>
): Promise<number>;
export async function run<Context extends BaseContext = BaseContext>(
	commandClasses: RunCommand<Context>,
	argv: Array<string>,
	context: RunContext<Context>
): Promise<number>;

export async function run<Context extends BaseContext = BaseContext>(
	options: Partial<CliOptions>,
	commandClasses: RunCommandNoContext<Context>,
	argv: Array<string>
): Promise<number>;
export async function run<Context extends BaseContext = BaseContext>(
	options: Partial<CliOptions>,
	commandClasses: RunCommand<Context>,
	argv: Array<string>,
	context: RunContext<Context>
): Promise<number>;

export async function run(...args: Array<any>) {
	const {
		resolvedOptions,
		resolvedCommandClasses,
		resolvedArgv,
		resolvedContext
	} = resolveRunParameters(args);

	const cli = Cli.from(resolvedCommandClasses, resolvedOptions);
	return cli.run(resolvedArgv, resolvedContext);
}

function resolveRunParameters(args: Array<any>) {
	let resolvedOptions: any;
	let resolvedCommandClasses: any;
	let resolvedArgv: any;
	let resolvedContext: any;

	switch (args.length) {
		case 1: {
			resolvedCommandClasses = args[0];
			break;
		}

		case 2: {
			if ((args[0] && args[0].prototype instanceof Command) || Array.isArray(args[0])) {
				resolvedCommandClasses = args[0];
				if (Array.isArray(args[1])) {
					resolvedArgv = args[1];
				} else {
					resolvedContext = args[1];
				}
			} else {
				resolvedOptions = args[0];
				resolvedCommandClasses = args[1];
			}

			break;
		}

		case 3: {
			if (Array.isArray(args[2])) {
				resolvedOptions = args[0];
				resolvedCommandClasses = args[1];
				resolvedArgv = args[2];
			} else if ((args[0] && args[0].prototype instanceof Command) || Array.isArray(args[0])) {
				resolvedCommandClasses = args[0];
				resolvedArgv = args[1];
				resolvedContext = args[2];
			} else {
				resolvedOptions = args[0];
				resolvedCommandClasses = args[1];
				resolvedContext = args[2];
			}

			break;
		}

		default: {
			resolvedOptions = args[0];
			resolvedCommandClasses = args[1];
			resolvedArgv = args[2];
			resolvedContext = args[3];

			break;
		}
	}

	if (typeof resolvedArgv === 'undefined') {
		throw new Error('The argv parameter must be provided');
	}

	return {
		resolvedOptions,
		resolvedCommandClasses,
		resolvedArgv,
		resolvedContext,
	};
}

/**
 * @template Context The context shared by all commands. Contexts are a set of values, defined when calling the `run`/`runExit` functions from the CLI instance, that will be made available to the commands via `this.context`.
 */
export class Cli<Context extends BaseContext = BaseContext>
	implements Omit<MiniCli<Context>, 'process' | 'run'>
{
	/**
	 * The default context of the CLI.
	 */
	static defaultContext: BaseContext = {
		console: console,
		isColored: false,
	};

	private readonly builder: CliBuilder<CliContext<Context>>;

	protected readonly registrations: Map<CommandClass<Context>, { index: number; builder: CommandBuilder<CliContext<Context>>; specs: Map<string, BaseOption<unknown>>; }> = new Map();

	public readonly binaryLabel?: string;
	public readonly binaryName: string;
	public readonly binaryVersion?: string;

	/**
	 * Creates a new Cli and registers all commands passed as parameters.
	 *
	 * @param commandClasses The Commands to register
	 * @returns The created `Cli` instance
	 */
	static from<Context extends BaseContext = BaseContext>(
		commandClasses: RunCommand<Context>,
		options: Partial<CliOptions> = {}
	) {
		const cli = new Cli<Context>(options);

		const resolvedCommandClasses = Array.isArray(commandClasses) ? commandClasses : [commandClasses];

		for (const commandClass of resolvedCommandClasses) {
			cli.register(commandClass);
		}

		return cli;
	}

	constructor ({
		binaryLabel,
		binaryName: binaryNameOpt = '...',
		binaryVersion,
	}: Partial<CliOptions> = {}) {
		this.builder = new CliBuilder({ binaryName: binaryNameOpt });

		this.binaryLabel = binaryLabel;
		this.binaryName = binaryNameOpt;
		this.binaryVersion = binaryVersion;
	}

	/**
	 * Registers a command inside the CLI.
	 */
	register (CommandClass: CommandClass<Context>) {
		const specs = new Map<string, BaseOption<any>>();

		const command = new CommandClass();

		for (const key in command) {
			const value = (command as any)[key];

			if (typeof value === 'object' && value !== null && value[Command.isOption]) {
				specs.set(key, value);
			}
		}

		const builder = this.builder.command();
		const index = builder.cliIndex;

		const paths = CommandClass.paths;

		if (typeof paths !== 'undefined') {
			for (const path of paths) {
				builder.addPath(path);
			}
		}

		this.registrations.set(CommandClass, { specs, builder, index });

		for (const [key, option] of specs.entries()) {
			option.define(builder, key);
		}

		builder.setContext({ commandClass: CommandClass });
	}

	process (input: Array<string>, context: VoidIfEmpty<Omit<Context, keyof BaseContext>>): Command<Context>;
	process (input: Array<string>, context: MakeOptional<Context, keyof BaseContext>): Command<Context>;
	process (input: Array<string>, userContext: any) {
		const { contexts, process } = this.builder.compile();
		const state = process(input);

		const context = {
			...Cli.defaultContext,
			...userContext,
		} as Context;

		switch (state.selectedIndex) {
			case HELP_COMMAND_INDEX: {
				const command = HelpCommand.from<Context>(state, contexts);
				command.context = context;

				return command;
			}

			default: {
				const { commandClass } = contexts[state.selectedIndex!];

				const record = this.registrations.get(commandClass);

				if (typeof record === 'undefined') {
					throw new Error('Assertion failed: Expected the command class to have been registered.');
				}

				const command = new commandClass();
				command.context = context;
				command.path = state.path;

				try {
					for (const [key, option] of record.specs.entries()) {
						(command as any)[key] = option.transform(record.builder, key, state, context);
					}

					return command;
				} catch (error: any) {
					error[errorCommandSymbol] = command;
					throw error;
				}
			}
		}
	}

	async run (input: Command<Context> | Array<string>, context: VoidIfEmpty<Omit<Context, keyof BaseContext>>): Promise<number>;
	async run (input: Command<Context> | Array<string>, context: MakeOptional<Context, keyof BaseContext>): Promise<number>;
	async run (input: Command<Context> | Array<string>, userContext: any) {
		let command: Command<Context>;

		const context = {
			...Cli.defaultContext,
			...userContext,
		} as Context;

		const colored = context.isColored;

		if (!Array.isArray(input)) {
			command = input;
		} else {
			try {
				command = this.process(input, context);
			} catch (error) {
				context.console.error(this.error(error, { colored }));
				return 1;
			}
		}

		if (command.help) {
			context.console.log(this.usage(command, { colored, detailed: true }));
			return 0;
		}

		command.context = context;
		command.cli = {
			binaryLabel: this.binaryLabel,
			binaryName: this.binaryName,
			binaryVersion: this.binaryVersion,
			definitions: () => this.definitions(),
			error: (error, opts) => this.error(error, opts),
			format: (subColored) => this.format(subColored ?? colored),
			process: (input, subContext?) => this.process(input, { ...context, ...subContext }),
			run: (input, subContext?) => this.run(input, { ...context, ...subContext } as Context),
			usage: (command, opts) => this.usage(command, { colored, ...opts }),
		};

		let exitCode;
		try {
			exitCode = await command.validateAndExecute().catch((error) => command.catch(error).then(() => 0));
		} catch (error) {
			context.console.error(this.error(error, { colored, command }));
			return 1;
		}

		return exitCode;
	}

	suggest (input: Array<string>, partial: boolean) {
		const { suggest } = this.builder.compile();
		return suggest(input, partial);
	}

	definitions ({ colored = false }: { colored?: boolean } = {}): Array<Definition> {
		const data: Array<Definition> = [];

		const formatter = this.format(colored);

		for (const [commandClass, { index }] of this.registrations) {
			if (typeof commandClass.usage === 'undefined') {
				continue;
			}

			const { usage: path } = this.getUsageByIndex(index, { detailed: false });
			const { usage, options } = this.getUsageByIndex(index, { detailed: true, inlineOptions: false });

			const category = typeof commandClass.usage.category !== 'undefined'
				? formatMarkdownish(commandClass.usage.category, { format: formatter, paragraphs: false })
				: undefined;

			const description = typeof commandClass.usage.description !== 'undefined'
				? formatMarkdownish(commandClass.usage.description, { format: formatter, paragraphs: false })
				: undefined;

			const details = typeof commandClass.usage.details !== 'undefined'
				? formatMarkdownish(commandClass.usage.details, { format: formatter, paragraphs: true })
				: undefined;

			const examples: Definition['examples'] = typeof commandClass.usage.examples !== 'undefined'
				? commandClass.usage.examples.map(([label, cli]) => [
						formatMarkdownish(label, { format: formatter, paragraphs: false }),
						cli.replace(/\$0/g, this.binaryName),
					])
				: undefined;

			data.push({ path, usage, category, description, details, examples, options });
		}

		return data;
	}

	usage (command: CommandClass<Context> | Command<Context> | null = null, { colored, detailed = false, prefix = `$ ` }: { colored?: boolean; detailed?: boolean; prefix?: string } = {}) {
		const formatter = this.format(colored);

		// In case the default command is the only one, we can just show the command help rather than the general one
		if (command === null) {
			for (const commandClass of this.registrations.keys()) {
				const paths = commandClass.paths;

				const isDocumented = typeof commandClass.usage !== 'undefined';
				const isExclusivelyDefault = !paths || paths.length === 0 || (paths.length === 1 && paths[0].length === 0);
				const isDefault = isExclusivelyDefault || (paths?.some((path) => path.length === 0) ?? false);

				if (isDefault) {
					if (command) {
						command = null;
						break;
					} else {
						command = commandClass;
					}
				} else {
					if (isDocumented) {
						command = null;
						continue;
					}
				}
			}

			if (command) {
				detailed = true;
			}
		}

		// @ts-ignore
		const commandClass = command !== null && command instanceof Command
				? (command.constructor as CommandClass<Context>)
				: (command as CommandClass<Context> | null);

		let result = '';

		if (!commandClass) {
			const commandsByCategories = new Map<string | null, Array<{ commandClass: CommandClass<Context>; usage: string; }>>();

			for (const [commandClass, { index }] of this.registrations.entries()) {
				if (typeof commandClass.usage === 'undefined') {
					continue;
				}

				const category = typeof commandClass.usage.category !== 'undefined'
					? formatMarkdownish(commandClass.usage.category, {
							format: formatter,
							paragraphs: false,
						})
					: null;

				let categoryCommands = commandsByCategories.get(category);

				if (typeof categoryCommands === 'undefined') {
					commandsByCategories.set(category, (categoryCommands = []));
				}

				const { usage } = this.getUsageByIndex(index);
				categoryCommands.push({ commandClass, usage });
			}

			const categoryNames = Array.from(commandsByCategories.keys()).sort((a, b) => {
				if (a === null) {
					return -1;
				}
				if (b === null) {
					return +1;
				}

				return a.localeCompare(b, 'en', { usage: 'sort', caseFirst: 'upper' });
			});

			const hasLabel = typeof this.binaryLabel !== 'undefined';
			const hasVersion = typeof this.binaryVersion !== 'undefined';

			if (hasLabel || hasVersion) {
				if (hasLabel && hasVersion)
					result += `${formatter.header(`${this.binaryLabel} - ${this.binaryVersion}`)}\n\n`;
				else if (hasLabel) result += `${formatter.header(`${this.binaryLabel}`)}\n`;
				else result += `${formatter.header(`${this.binaryVersion}`)}\n`;

				result += `  ${formatter.bold(prefix)}${this.binaryName} <command>\n`;
			} else {
				result += `${formatter.bold(prefix)}${this.binaryName} <command>\n`;
			}

			for (const categoryName of categoryNames) {
				const commands = commandsByCategories
					.get(categoryName)!
					.slice()
					.sort((a, b) => {
						return a.usage.localeCompare(b.usage, 'en', { usage: 'sort', caseFirst: 'upper' });
					});

				const header = categoryName !== null ? categoryName.trim() : 'General commands';

				result += '\n';
				result += `${formatter.header(`${header}`)}\n`;

				for (const { commandClass, usage } of commands) {
					const doc = commandClass.usage!.description || 'undocumented';

					result += '\n';
					result += `  ${formatter.bold(usage)}\n`;
					result += `    ${formatMarkdownish(doc, { format: formatter, paragraphs: false })}`;
				}
			}

			result += '\n';
			result += formatMarkdownish(
				'You can also print more details about any of these commands by calling them with the `-h, --help` flag right after the command name.',
				{ format: formatter, paragraphs: true }
			);
		} else {
			if (!detailed) {
				const { usage } = this.getUsageByRegistration(commandClass);
				result += `${formatter.bold(prefix)}${usage}\n`;
			} else {
				const { description = '', details = '', examples = [] } = commandClass.usage || {};

				if (description !== '') {
					result += formatMarkdownish(description, {
						format: formatter,
						paragraphs: false,
					}).replace(/^./, ($0) => $0.toUpperCase());
					result += '\n';
				}

				if (details !== '' || examples.length > 0) {
					result += `${formatter.header('Usage')}\n`;
					result += '\n';
				}

				const { usage, options } = this.getUsageByRegistration(commandClass, { inlineOptions: false });

				result += `${formatter.bold(prefix)}${usage}\n`;

				if (options.length > 0) {
					result += '\n';
					result += `${formatter.header('Options')}\n`;

					const maxDefinitionLength = options.reduce((length, option) => {
						return Math.max(length, option.definition.length);
					}, 0);

					result += '\n';

					for (const { definition, description } of options) {
						result += `  ${formatter.bold(
							definition.padEnd(maxDefinitionLength)
						)}    ${formatMarkdownish(description, { format: formatter, paragraphs: false })}`;
					}
				}

				if (details !== '') {
					result += '\n';
					result += `${formatter.header(`Details`)}\n`;
					result += '\n';

					result += formatMarkdownish(details, { format: formatter, paragraphs: true });
				}

				if (examples.length > 0) {
					result += '\n';
					result += `${formatter.header(`Examples`)}\n`;

					for (const [description, example] of examples) {
						result += '\n';
						result += formatMarkdownish(description, { format: formatter, paragraphs: false });
						result += `${example
							.replace(/^/m, `  ${formatter.bold(prefix)}`)
							.replace(/\$0/g, this.binaryName)}\n`;
					}
				}
			}
		}

		return result;
	}

	error (error: Error | any, { colored, command = error[errorCommandSymbol] ?? null }: { colored?: boolean; command?: Command<Context> | null } = {}) {
		if (!(error instanceof Error)) {
			error = new Error(`Execution failed with a non-error rejection (rejected value: ${JSON.stringify(error)})`);
		}

		const formatter = this.format(colored);

		let result = '';

		let name = error.name.replace(/([a-z])([A-Z])/g, '$1 $2');

		if (name === 'Error') {
			name = 'Internal Error';
		}

		result += `${formatter.error(name)}: ${error.message}\n`;

		const meta = error.metadata as ErrorMeta | undefined;

		if (typeof meta !== 'undefined') {
			if (meta.type === 'usage') {
				result += '\n';
				result += this.usage(command, { colored });
			}
		} else {
			if (error.stack) {
				result += `${error.stack.replace(/^.*\n/, '')}\n`;
			}
		}

		return result;
	}

	format (colored: boolean = false): ColorFormat {
		return colored ? richFormat : textFormat;
	}

	protected getUsageByRegistration (klass: CommandClass<Context> ,opts?: { detailed?: boolean; inlineOptions?: boolean }) {
		const record = this.registrations.get(klass);

		if (typeof record === 'undefined') {
			throw new Error(`Assertion failed: Unregistered command`);
		}

		return this.getUsageByIndex(record.index, opts);
	}

	protected getUsageByIndex (n: number, opts?: { detailed?: boolean; inlineOptions?: boolean }) {
		return this.builder.getBuilderByIndex(n).usage(opts);
	}

}
