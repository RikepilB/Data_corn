// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// En producción Firebase Hosting reenvía /api/** a Cloud Run; en desarrollo lo hace este proxy.
export default defineConfig({
  integrations: [react()],
  vite: {
    server: {
      proxy: { '/api': 'http://localhost:8080' },
    },
  },
});
