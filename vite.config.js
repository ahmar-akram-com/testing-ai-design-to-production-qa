import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        dashboard: resolve(__dirname, 'dashboard.html'),
      },
    },
  },
});
