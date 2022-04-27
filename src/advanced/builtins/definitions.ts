import { Command } from '../Command.js';

/**
 * A command that prints the Cli definitions.
 */
export class DefinitionsCommand extends Command<any> {
	static paths = [['--clipanion=definitions']];

	async execute() {
		this.context.console.log(`${JSON.stringify(this.cli.definitions(), null, 2)}\n`);
	}
}
