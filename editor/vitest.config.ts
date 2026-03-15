import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@hexmap/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@hexmap/canvas': path.resolve(__dirname, '../canvas/src/index.ts')
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    css: true,
  },
});
