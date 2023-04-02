import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

import process from 'process';

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = process.env.NODE_ENV === 'production'

export default {
    input: 'src/index.ts',
    output: {
        file: 'dist/index.js',
        format: 'esm',
        sourcemap: true,
        exports: 'auto',
    },
    plugins: [
        nodeResolve(), // find third-party modules in node_modules
        commonjs(), // convert CommonJS modules to ES6 for rollup
        typescript(),
        production && terser(),
    ],
};