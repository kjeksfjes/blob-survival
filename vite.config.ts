import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/blob-survival/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
