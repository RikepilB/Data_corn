// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// En producción Firebase Hosting reenvía /api/** a Cloud Run; en desarrollo lo hace este proxy.
// /api/chat va primero: el asistente corre aparte (npm run chat:dev, puerto 8787).
export default defineConfig({
  site: 'https://field-shift-datacorn.vercel.app',
  integrations: [react()],
  devToolbar: { enabled: false },
  vite: {
    server: {
      proxy: {
        '/api/chat': 'http://localhost:8787',
        '/api': 'http://localhost:8080',
      },
    },
  },
});
