/** ESBuild Configuration */

import { build } from 'esbuild';

const build_options = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  minify: true,
  external: [
    'obsidian'
  ],
  format: 'cjs',
  outfile: 'main.js'
};

await build(build_options);
