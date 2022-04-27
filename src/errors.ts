import { END_OF_INPUT } from './constants.js';

export type ErrorMeta =
	| { type: 'none' }
	| { type: 'usage' };

/**
 * An error with metadata telling how to print it
 *
 * Errors with this metadata property will have their name and message printed, but not the
 * stacktrace.
 *
 * This should be used for errors where the message is the part that's important but the stacktrace is useless.
 * Some examples of where this might be useful are:
 *
 * - Invalid input by the user (see `UsageError`)
 * - A HTTP connection fails, the user is shown "Failed To Fetch Data: Could not connect to server example.com" without stacktrace
 * - A command in which the user enters credentials doesn't want to show a stacktract when the user enters invalid credentials
 * - ...
 */
export interface ErrorWithMeta extends Error {
	/**
	 * Metadata detailing how  should print this error
	 */
	readonly metadata: ErrorMeta;
}

/**
 * A generic usage error with the name `UsageError`.
 *
 * It should be used over `Error` only when it's the user's fault.
 */
export class UsageError extends Error {
	name = 'UsageError';
	metadata: ErrorMeta = { type: 'usage' };

	constructor(message: string) {
		super(message);
	}
}

export class UnknownSyntaxError extends Error {
	name = 'UnknownSyntaxError';
	metadata: ErrorMeta = { type: 'none' };

	readonly input: Array<string>
	readonly candidates: Array<{ usage: string; reason: string | null }>

	constructor(input: Array<string>, candidates: Array<{ usage: string; reason: string | null }>) {
		let message;

		if (candidates.length === 0) {
			message = 'Command not found, but we\'re not sure what\'s the alternative.';
		} else if (candidates.every((candidate) => candidate.reason !== null && candidate.reason === candidates[0].reason)) {
			const [{ reason }] = candidates;

			message = `${reason}\n\n${candidates.map(({ usage }) => `$ ${usage}`).join('\n')}`;
		} else if (candidates.length === 1) {
			const [{ usage }] = candidates;
			message = `Command not found; did you mean:\n\n$ ${usage}\n${whileRunning(input)}`;
		} else {
			const alternatives = candidates
				.map(({ usage }, index) => `${`${index}.`.padStart(4)} ${usage}`)
				.join('\n')

			message = `Command not found; did you mean one of:\n\n${alternatives}\n\n${whileRunning(input)}`;
		}

		super(message);

		this.input = input;
		this.candidates = candidates;
	}
}

export class AmbiguousSyntaxError extends Error {
	name = 'AmbiguousSyntaxError';
	metadata: ErrorMeta = { type: 'none' };

	readonly input: Array<string>;
	readonly usages: Array<string>;


	constructor(input: Array<string>, usages: Array<string>) {
		const alternatives = usages
			.map((usage, index) => `${`${index}.`.padStart(4)} ${usage}`)
			.join('\n');

		super(`Cannot find which to pick amongst the following alternatives:\n\n${alternatives}\n\n${whileRunning(input)}`);

		this.input = input;
		this.usages = usages;
	}
}

const whileRunning = (input: Array<string>) =>
	`While running ${input
		.filter((token) => {
			return token !== END_OF_INPUT;
		})
		.map((token) => {
			const json = JSON.stringify(token);
			if (token.match(/\s/) || token.length === 0 || json !== '"${token}"') {
				return json;
			} else {
				return token;
			}
		})
		.join(' ')}`;
