// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// En producción Firebase Hosting reenvía /api/** a Cloud Run; en desarrollo lo hace este proxy.
export default defineConfig({
  site: 'https://field-shift-datacorn.vercel.app',
  integrations: [react()],
  devToolbar: { enabled: false },
  vite: {
    server: {
      proxy: { '/api': 'http://localhost:8080' },
    },
  },
});
