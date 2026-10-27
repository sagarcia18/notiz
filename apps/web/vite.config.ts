import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { devServerSettings } from './devServer';

const repoRoot = path.resolve(import.meta.dirname, '../..');

export default defineConfig(({ mode }) => {
  // The repo `.env` plus the shell; '' loads every key, not only VITE_*.
  const settings = devServerSettings({ ...loadEnv(mode, repoRoot, ''), ...process.env });
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: settings.host,
      // The API itself only listens on 127.0.0.1; other devices reach it through this proxy.
      proxy: { '/api': settings.apiTarget },
    },
  };
});
