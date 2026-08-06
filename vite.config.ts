import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const isHmrDisabled = process.env.DISABLE_HMR === 'true';
  const enablePolling = Boolean(process.env.CI || process.env.USE_POLLING || process.env.VITE_USE_POLLING || true);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: false,
      proxy: {
        '/ws': {
          target: 'ws://localhost:3000',
          ws: true,
          changeOrigin: true,
          headers: {
            Connection: 'Upgrade',
            Upgrade: 'websocket',
          },
        },
      },
      hmr: isHmrDisabled ? false : {
        protocol: 'ws',
        host: 'localhost',
        port: 3000,
        clientPort: 3000,
        timeout: 30000,
        overlay: false,
      },
      watch: isHmrDisabled ? null : {
        usePolling: enablePolling,
        interval: 500,
        binaryInterval: 1000,
      },
    },
  };
});
