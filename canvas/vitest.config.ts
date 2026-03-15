import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@hexmap/core': path.resolve(__dirname, '../core/src/index.ts')
    }
  },
  test: {
    environment: 'node',
  },
})
