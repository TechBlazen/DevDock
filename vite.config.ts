import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { terminalPlugin } from './vite-terminal-plugin';
import { networkPlugin } from './vite-network-plugin';
import { changelogPlugin } from './vite-changelog-plugin';

export default defineConfig({
  // GitHub Pages deploy needs the repo subpath, but E2E builds and local dev
  // must serve from /. The E2E env var overrides the GH Pages base.
  base: process.env.GITHUB_ACTIONS && !process.env.E2E ? '/forge-portal-clean/' : '/',
  plugins: [react(), terminalPlugin(), networkPlugin(), changelogPlugin()],
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
