import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@hexmap/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
  },
});
