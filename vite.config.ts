import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { terminalPlugin } from './vite-terminal-plugin';
import { networkPlugin } from './vite-network-plugin';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/forge-portal-clean/' : '/',
  plugins: [react(), terminalPlugin(), networkPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
