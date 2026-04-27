import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    hmr: process.env.DISABLE_HMR === 'true'
      ? false
      : process.env.REPLIT_DEV_DOMAIN
        ? { clientPort: 443, host: process.env.REPLIT_DEV_DOMAIN, protocol: 'wss' }
        : true,
    watch: {
      ignored: [
        '**/.local/**',
        '**/node_modules/**',
      ],
    },
  },
});
