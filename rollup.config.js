import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import replace from '@rollup/plugin-replace';
import {terser} from 'rollup-plugin-terser';

const pkg = require("./package.json");

export default {
  input: `src/index.ts`,
  output: [
    {file: 'dist/index.js', format: 'es'},
    {file: 'dist/index.min.js', format: 'es', plugins: [terser()]},
    {file: 'dist/index.cjs', format: 'cjs'},
    {file: 'dist/index.iife.js', format: 'iife', name: "starboardWrap"}
  ],
  plugins: [
    typescript({
      include: [
          './src/**/*.ts',
      ],
    }),
    replace({"__STARBOARD_WRAP_VERSION__": pkg.version}),
    resolve(),
    commonjs(),
  ]
};
