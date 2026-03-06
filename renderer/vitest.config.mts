import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    alias: {
      '@hexmap/core': resolve(__dirname, '../core/src/index.ts')
    }
  }
});
