import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  root: '.',
  resolve: {
    alias: {
      '@hexmap/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@hexmap/canvas': path.resolve(__dirname, '../canvas/src/index.ts'),
    },
  },
});
