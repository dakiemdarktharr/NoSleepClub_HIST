import { defineConfig } from 'vite';
export default defineConfig({
  server: { host: '127.0.0.1', port: 5173, proxy: { '/api': 'http://127.0.0.1:8787' } },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500, assetsInlineLimit: 0 },
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@huggingface/transformers'], include: ['@techstark/opencv-js'] },
});
