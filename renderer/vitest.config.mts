import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    alias: {
      '@hexmap/core': resolve(__dirname, '../core/src/index.ts'),
    },
  },
});
