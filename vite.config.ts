import { defineConfig } from 'vite';

export default defineConfig({
    worker: {
        format: 'es',
    },
    optimizeDeps: {
        include: ['three']
    }
});