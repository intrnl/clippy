export const NODE_INITIAL = 0;
export const NODE_SUCCESS = 1;
export const NODE_ERRORED = 2;

export const START_OF_INPUT = '\u0001';
export const END_OF_INPUT = '\u0000';

export const HELP_COMMAND_INDEX = -1;

export const HELP_REGEX = /^(-h|--help)(?:=([0-9]+))?$/;
export const OPTION_REGEX = /^(--[a-z]+(?:-[a-z]+)*|-[a-zA-Z]+)$/;
export const BATCH_REGEX = /^-[a-zA-Z]{2,}$/;
export const BINDING_REGEX = /^([^=]+)=([\s\S]*)$/;

export const DEBUG = false;
