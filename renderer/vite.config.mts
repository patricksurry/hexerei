import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'HexRenderer',
            fileName: 'hexmap-renderer',
            formats: ['es', 'umd']
        },
        rollupOptions: {
            external: ['d3', '@hexmap/core'],
            output: {
                globals: {
                    d3: 'd3'
                }
            }
        }
    },
    test: {
        environment: 'jsdom'
    }
});
