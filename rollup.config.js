import { defineConfig } from 'rollup';
import dts from 'rollup-plugin-dts';

export default defineConfig([
	{
		input: './lib/advanced/index.js',
		output: [
			{
				file: './dist/clippy.js',
				format: 'cjs',
				generatedCode: 'es2015',
			},
			{
				file: './dist/clippy.mjs',
				format: 'esm',
				generatedCode: 'es2015',
				banner: '/// <reference types="./clippy.d.ts" />',
			},
		],
		external: ['typanion'],
	},
	{
		input: './lib/advanced/index.d.ts',
		output: [
			{
				file: './dist/clippy.d.ts',
				format: 'esm',
			},
		],
		plugins: [
			dts(),
		],
	},
]);
