import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    alias: {
      '@hexmap/core': resolve(__dirname, './src/index.ts'),
      '@hexmap/hexpath': resolve(__dirname, '../hexpath/src/index.ts')
    },
    include: ['src/**/*.{test,spec}.ts', '../hexpath/src/**/*.{test,spec}.ts']
  }
});
