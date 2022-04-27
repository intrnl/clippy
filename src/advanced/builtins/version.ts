import { Command } from '../Command.js';

/**
 * A command that prints the version of the binary (`cli.binaryVersion`).
 *
 * Paths: '-v', '--version'
 */
export class VersionCommand extends Command<any> {
	static paths = [['-v'], ['--version']];

	async execute() {
		this.context.console.log(`${this.cli.binaryVersion ?? '<unknown>'}\n`);
	}
}
