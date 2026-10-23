import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        setup: resolve(process.cwd(), 'configurar-senha/index.html'),
      },
    },
  },
});
